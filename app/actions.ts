'use server';

import { getDb } from '@/lib/db';
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

export interface LegalSource {
  lawId: string;
  title: string;
  referenceNumber: string | null;
  articleNumber: string | null;
  citation: string;
  sourceUrl: string | null;
  score: number;
}

export interface LegalAnswer {
  reply: string;
  sources: LegalSource[];
}

/** Stable anchor id so an AI answer can deep-link to one article in the reader. */
export function buildArticleAnchor(lawId: string, articleNumber: string): string {
  const safeLaw = lawId.replace(/[^a-zA-Z0-9]/g, '');
  const safeArticle = articleNumber.replace(/[^a-zA-Z0-9]/g, '-');
  return `law-${safeLaw}-article-${safeArticle}`;
}

export async function generateLegalAdvice(
  query: string,
  chatHistory: { role: 'user' | 'model'; content: string }[] = [],
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
        collectedSources.push(...(retrieval?.sources || []));
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

USER QUERY:
${query}
`;

    const messages: SpaceBunnyMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'assistant',
        content:
          'Understood. I will strictly follow the instructions, structure all responses with the requested headings, and only use the provided retrieved context.',
      },
      ...chatHistory.map((message) => ({
        role: message.role === 'model' ? ('assistant' as const) : ('user' as const),
        content: message.content,
      })),
      { role: 'user', content: contextPrompt },
    ];

    const reply = await createSpaceBunnyChatCompletion(messages, { temperature: 0.2 });

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
