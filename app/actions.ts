'use server';

import { GoogleGenAI } from '@google/genai';
import { getDb, Article, Law } from '@/lib/db';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM_PROMPT = `You are Rengera, an expert legal AI assistant for Rwanda. 
Your goal is to explain Rwandan laws simply to citizens and businesses.

You are equipped with a RAG (Retrieval-Augmented Generation) system. You MUST ONLY use the retrieved official Rwandan legal documents provided in the context below to answer the user's query. If the answer cannot be found in the provided context, you MUST clearly state that you do not have that specific information in your database. Do NOT invent or assume laws.

You MUST structure EVERY response using the following exact markdown headings:
### Simple Explanation
(Explain the situation and the core legal answer in plain, simple language)

### Relevant Law
(Name the specific Rwandan law provided in the context, e.g., Law N° 66/2018 of 30/08/2018 regulating labour in Rwanda)

### Official Article
(Cite the exact article number(s) and a brief quote or summary of the article)

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
  try {
    const history = chatHistory.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    // 1. Generate embedding for query
    let queryEmbedding: number[] = [];
    try {
      const embedResponse = await ai.models.embedContent({
        model: 'gemini-embedding-2-preview',
        contents: query
      });
      if (embedResponse.embeddings && embedResponse.embeddings[0]?.values) {
        queryEmbedding = embedResponse.embeddings[0].values;
      }
    } catch (e) {
      console.error("Failed to embed query", e);
    }

    // 2. Retrieve similar articles
    let contextText = "No relevant laws found in the database.";
    if (queryEmbedding.length > 0) {
      const db = await getDb();
      const similarities = db.articles.map(article => {
        const sim = cosineSimilarity(queryEmbedding, article.embedding);
        return { article, sim };
      });
      
      similarities.sort((a, b) => b.sim - a.sim);
      const topArticles = similarities.slice(0, 5).filter(s => s.sim > 0.5); // Use a threshold if desired
      
      if (topArticles.length > 0) {
        contextText = topArticles.map(s => {
          const law = db.laws.find(l => l.id === s.article.lawId);
          return `Law: ${law?.title || 'Unknown Law'}\nArticle ${s.article.articleNumber}: ${s.article.title}\nContent: ${s.article.content}`;
        }).join('\n\n---\n\n');
      }
    }

    const contextPrompt = `
      RETRIEVED LEGAL CONTEXT:
      ${contextText}
      
      USER QUERY:
      ${query}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: [
        { role: 'user', parts: [{ text: SYSTEM_PROMPT }] },
        { role: 'model', parts: [{ text: 'Understood. I will strictly follow the instructions, structure all responses with the requested headings, and only use the provided retrieved context.' }] },
        ...history,
        { role: 'user', parts: [{ text: contextPrompt }] }
      ],
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "I am currently unable to access the legal database. Please try again later.";
  }
}

