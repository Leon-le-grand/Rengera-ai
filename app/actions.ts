'use server';

import { getDb } from '@/lib/db';
import { LANGUAGE_DEFINITIONS, resolveAnswerLanguage } from '@/lib/answer-language';
import { getSupabaseAdminClient } from '@/lib/supabase';
import { buildEmergencyMarkdown, detectEmergencyRisk } from '@/lib/safety';
import { isSupabaseConfigured } from '@/lib/supabase';
import { retrieveSupabaseLegalContext } from '@/lib/supabase-retrieval';
import {
  createSpaceBunnyChatCompletion,
  createSpaceBunnyEmbedding,
  getSpaceBunnyRuntime,
  SpaceBunnyConfigurationError,
  type SpaceBunnyMessage,
} from '@/lib/space-bunny';

/**
 * Focused prompt for "explain this article" questions.
 *
 * The full briefing asks for ten sections on every answer. That is right for a
 * general legal question, but for someone who opened one article and asked what
 * it means it is a huge output for a small question — and long generations were
 * timing out. This variant asks for four short sections instead.
 */
const ARTICLE_SYSTEM_PROMPT = `You are Rengera, a legal AI assistant for Rwanda.
Answer ONLY from the article text and retrieved law provided. Never invent an article, a number or a deadline.

Write the answer in this exact structure, and keep it short:

### What this article says
(three or four sentences, plain language, quoting the article number)

### What it means for you
(what it means in the user's situation, based only on what the article says)

### What to do next
(three bullets, most urgent first)

### Watch out for
(one or two risks or limits — time limits, conditions, exceptions)

Be calm and precise. If the text provided does not answer the question, say so plainly.`;

const SYSTEM_PROMPT = `You are Rengera, an expert legal AI assistant for Rwanda.
Your goal is to explain Rwandan laws simply to citizens and businesses.

You are equipped with a RAG (Retrieval-Augmented Generation) system. You MUST ONLY use the retrieved official Rwandan legal documents provided in the context below to answer the user's query. Analyze every relevant law and article in the context, not only the first result. Explain what each law or article says, how they interact, and whether a later law amends or supersedes an earlier one. If the answer cannot be found in the provided context, you MUST clearly state that you do not have that specific information in your database. Do NOT invent or assume laws.

You MUST structure EVERY response using the following exact markdown headings:
### Simple Explanation
(Explain the situation and the core legal answer in plain, simple language)

### Relevant Laws
(List every relevant law found in the retrieved context. For each law, state what it establishes and whether it amends, supplements, or conflicts with another retrieved law.)

### Official Articles
(For each relevant law, cite the exact article number, article title when available, the exact official source URL, and a brief explanation of the retrieved article text. Never say an article number is unavailable when an article-level result is present in the context.)

### Comparison And Application
(Compare the relevant laws/articles, explain which rule applies to the user's facts, and identify any point that still requires another law, decree, or ministerial order that was not retrieved.)

### Your Rights
(Bullet points of the citizen's rights in this situation based on the context)

### Your Responsibilities
(Bullet points of what the citizen must do)

### What NOT To Do
(Bullet points of actions to avoid that could harm their case)

### Evidence To Collect
(Checklist of documents, photos, or witness accounts needed)

### Recommended Next Steps
(Actionable steps to resolve the issue)

### Responsible Authority
(Who to contact, e.g., RIB, local leader, Ministry of Labour)

If the user is asking about a specific scenario (Tenant locked out, Employer refuses overtime, Employee dismissed after requesting leave, Privacy violation, Traffic stop), provide a highly specific, step-by-step guide tailored to that scenario using every relevant retrieved law and article.

Keep the tone professional, calm, trustworthy, and empathetic. Do NOT provide binding legal advice, just legal education.`;

function cosineSimilarity(a: number[], b: number[]) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Which of these laws have been checked by a human administrator. Drives the
 * "Verified" badge on a citation. A lookup failure must never break an answer,
 * so it degrades to an empty set.
 */
async function loadReviewedLawIds(lawIds: string[]): Promise<Set<string>> {
  const unique = Array.from(new Set(lawIds)).filter(Boolean);
  if (unique.length === 0 || !isSupabaseConfigured()) return new Set();

  try {
    const { data, error } = await getSupabaseAdminClient()
      .from('laws')
      .select('id')
      .in('id', unique)
      .not('classification_reviewed_at', 'is', null);

    if (error) throw error;
    return new Set(((data || []) as { id: string }[]).map((row) => String(row.id)));
  } catch (error) {
    console.error('Reviewed-law lookup failed:', error);
    return new Set();
  }
}

export interface LegalSource {
  lawId: string;
  title: string;
  referenceNumber: string | null;
  articleNumber: string | null;
  citation: string;
  sourceUrl: string | null;
  score: number;
  /** True when an administrator has reviewed this law's classification. */
  reviewed?: boolean;
}

export interface LegalAnswer {
  reply: string;
  sources: LegalSource[];
}

/** Context handed over when the user asks a follow-up from inside the library. */
export interface ArticleContext {
  lawTitle?: string | null;
  referenceNumber?: string | null;
  articleNumber?: string | null;
  text?: string | null;
}

export interface AdviceOptions {
  language?: string;
  articleContext?: ArticleContext | null;
}

export async function generateLegalAdvice(
  query: string,
  chatHistory: { role: 'user' | 'model'; content: string }[] = [],
  options: AdviceOptions = {},
): Promise<LegalAnswer> {
  const runtime = getSpaceBunnyRuntime();
  const collectedSources: LegalSource[] = [];

  try {
    const emergencyRisk = detectEmergencyRisk(query);
    if (emergencyRisk.level === 'urgent') {
      return { reply: buildEmergencyMarkdown(emergencyRisk), sources: [] };
    }

    let contextText = 'No relevant laws found in the database.';

    if (isSupabaseConfigured()) {
      try {
        const retrieval = await retrieveSupabaseLegalContext(query, 8);
        contextText = retrieval?.context || 'No relevant laws found in Supabase.';
        const reviewedIds = await loadReviewedLawIds(
          (retrieval?.sources || []).map((source) => source.lawId),
        );
        collectedSources.push(
          ...(retrieval?.sources || []).map((source) => ({
            ...source,
            reviewed: reviewedIds.has(source.lawId),
          })),
        );
      } catch (error) {
        console.error('Supabase retrieval error:', error);
        contextText = 'Legal search is temporarily unavailable.';
      }
    } else {
      // Local embeddings are a development-only fallback. Production uses
      // Supabase so Vercel never reads or writes data/db.json.
      let queryEmbedding: number[] = [];
      try {
        queryEmbedding = (await createSpaceBunnyEmbedding(query)) || [];
      } catch (error) {
        console.error('Space Bunny embedding error:', {
          model: runtime.embeddingModel,
          message: error instanceof Error ? error.message : String(error),
        });
      }

      if (queryEmbedding.length > 0) {
        const db = await getDb();
        const similarities = db.articles
          .filter((article) => article.status !== 'repealed' && article.embedding.length > 0)
          .map((article) => ({
            article,
            similarity: cosineSimilarity(queryEmbedding, article.embedding),
          }));

        similarities.sort((a, b) => b.similarity - a.similarity);
        const topArticles = similarities.slice(0, 5).filter((item) => item.similarity > 0.5);

        if (topArticles.length > 0) {
          contextText = topArticles
            .map(({ article }) => {
              const law = db.laws.find((item) => item.id === article.lawId);
              const amendmentNotes = db.amendments
                .filter(
                  (amendment) =>
                    amendment.originalLawId === law?.id &&
                    amendment.affectedArticle === article.articleNumber,
                )
                .map((amendment) => {
                  const amendingLaw = db.laws.find((item) => item.id === amendment.amendingLawId);
                  return `${amendment.amendmentType.toUpperCase()} by ${
                    amendingLaw?.title || 'unknown amending law'
                  } (${amendingLaw?.lawNumber || 'no number'})`;
                });

              return [
                `Law: ${law?.title || 'Unknown Law'}`,
                `Law number: ${law?.lawNumber || 'Unknown'}`,
                `Article ${article.articleNumber}: ${article.title}`,
                `Citation: ${article.citation}`,
                `Source URL: ${article.sourceUrl || law?.sourceUrl || 'Unknown source'}`,
                amendmentNotes.length ? `Amendment notes: ${amendmentNotes.join('; ')}` : '',
                `Official text: ${article.text}`,
              ]
                .filter(Boolean)
                .join('\n');
            })
            .join('\n\n---\n\n');
        }
      }
    }

    const contextPrompt = `
RETRIEVED LEGAL CONTEXT:
${contextText}

${options.articleContext ? `ARTICLE THE USER IS READING:\n${options.articleContext.lawTitle || ''} ${options.articleContext.referenceNumber || ''} Article ${options.articleContext.articleNumber || ''}\n${(options.articleContext.text || '').slice(0, 6000)}\n` : ''}
USER QUERY:
${query}
`;

    const language = resolveAnswerLanguage(options.language);
    const languageInstruction = LANGUAGE_DEFINITIONS[language].instruction;
    const isArticleQuestion = Boolean(options.articleContext);

    // An article question gets the focused briefing and no history: the article
    // text is already in the prompt, and carrying the whole conversation plus
    // ten required sections is what was timing out.
    const systemContent = isArticleQuestion
      ? `${ARTICLE_SYSTEM_PROMPT}\n\nLANGUAGE:\n${languageInstruction}`
      : `${SYSTEM_PROMPT}\n\nLANGUAGE:\n${languageInstruction}`;

    const buildMessages = (history: SpaceBunnyMessage[]): SpaceBunnyMessage[] => [
      { role: 'system', content: systemContent },
      ...(isArticleQuestion
        ? []
        : [
            {
              role: 'assistant' as const,
              content:
                'Understood. I will strictly follow the instructions, structure all responses with the requested headings, and only use the provided retrieved context.',
            },
          ]),
      ...history,
      { role: 'user', content: contextPrompt },
    ];

    // Only the tail of the conversation is sent, and each turn is trimmed. Old
    // turns add tokens without adding anything the retrieved law does not.
    const trimmedHistory: SpaceBunnyMessage[] = chatHistory
      .slice(-6)
      .map((message) => ({
        role: message.role === 'model' ? ('assistant' as const) : ('user' as const),
        content: message.content.slice(0, 800),
      }));

    const completionOptions = { temperature: 0.2, maxTokens: isArticleQuestion ? 1200 : 2000 };

    let reply: string;
    try {
      reply = await createSpaceBunnyChatCompletion(buildMessages(trimmedHistory), completionOptions);
    } catch (firstError) {
      const message = firstError instanceof Error ? firstError.message : String(firstError);
      const timedOut = /timeout|abort/i.test(message);

      // A timeout is almost always a payload that is too big to answer in one
      // pass. Retry once with the conversation dropped before giving up.
      if (timedOut) {
        console.warn('Space Bunny timed out — retrying without chat history.');
        reply = await createSpaceBunnyChatCompletion(buildMessages([]), completionOptions);
      } else {
        throw firstError;
      }
    }

    return { reply, sources: collectedSources };
  } catch (error) {
    if (error instanceof SpaceBunnyConfigurationError) {
      return { reply: error.message, sources: collectedSources };
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error('Space Bunny request error:', {
      model: runtime.model,
      embeddingModel: runtime.embeddingModel,
      message,
    });

    return {
      reply: `Space Bunny could not complete the request: ${message}`,
      sources: collectedSources,
    };
  }
}
