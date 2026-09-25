'use server';

import { getDb } from '@/lib/db';
import { buildEmergencyMarkdown, detectEmergencyRisk } from '@/lib/safety';
import {
  createSpaceBunnyChatCompletion,
  createSpaceBunnyEmbedding,
  getSpaceBunnyRuntime,
  SpaceBunnyConfigurationError,
  type SpaceBunnyMessage,
} from '@/lib/space-bunny';

const SYSTEM_PROMPT = `You are Rengera, an expert legal AI assistant for Rwanda. 
Your goal is to explain Rwandan laws simply to citizens and businesses.

You are equipped with a RAG (Retrieval-Augmented Generation) system. You MUST ONLY use the retrieved official Rwandan legal documents provided in the context below to answer the user's query. If the answer cannot be found in the provided context, you MUST clearly state that you do not have that specific information in your database. Do NOT invent or assume laws.

You MUST structure EVERY response using the following exact markdown headings:
### Simple Explanation
(Explain the situation and the core legal answer in plain, simple language)

### Relevant Law
(Name the specific Rwandan law provided in the context, e.g., Law N° 66/2018 of 30/08/2018 regulating labour in Rwanda)

### Official Article
(Cite the exact article number(s), official source URL, and a brief quote or summary of the article)

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

If the user is asking about a specific scenario (Tenant locked out, Employer refuses overtime, Privacy violation, Traffic stop), provide a highly specific, step-by-step guide tailored to that scenario.

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

export async function generateLegalAdvice(query: string, chatHistory: { role: 'user' | 'model', content: string }[] = []) {
  const runtime = getSpaceBunnyRuntime();

  try {
    const emergencyRisk = detectEmergencyRisk(query);
    if (emergencyRisk.level === 'urgent') {
      return buildEmergencyMarkdown(emergencyRisk);
    }

    // Embeddings are optional. Chat still works without a Space Bunny
    // embedding model, but retrieval will report that no laws were indexed.
    let queryEmbedding: number[] = [];
    try {
      queryEmbedding = (await createSpaceBunnyEmbedding(query)) || [];
    } catch (error) {
      console.error('Space Bunny embedding error:', {
        model: runtime.embeddingModel,
        message: error instanceof Error ? error.message : String(error),
      });
    }

    // Retrieve similar articles from the local RAG store.
    let contextText = 'No relevant laws found in the database.';
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

    return await createSpaceBunnyChatCompletion(messages, { temperature: 0.2 });
  } catch (error) {
    if (error instanceof SpaceBunnyConfigurationError) {
      return error.message;
    }

    const message = error instanceof Error ? error.message : String(error);
    console.error('Space Bunny request error:', {
      model: runtime.model,
      embeddingModel: runtime.embeddingModel,
      message,
    });

    return `Space Bunny could not complete the request: ${message}`;
  }
}
