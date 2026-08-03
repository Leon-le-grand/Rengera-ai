'use server';

import { GoogleGenAI } from '@google/genai';
import { addLaw, addArticles } from '@/lib/db';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function processNewLaw(data: { title: string, category: string, date: string, language: string, rawText: string }) {
  try {
    // 1. Save Law Metadata
    const newLaw = await addLaw({
      title: data.title,
      category: data.category,
      publicationDate: data.date,
      language: data.language
    });

    // 2. Extract articles using a simple regex heuristic (Assuming format "Article 1: title \n content")
    // Or we can use Gemini to structure the text if we want, but that might be slow/expensive for large texts.
    // For this prototype, let's use Gemini to extract up to 10 articles from the text.
    
    const extractionPrompt = `
      Extract the articles from the following legal text. 
      Format as a JSON array of objects, where each object has:
      - articleNumber (e.g. "1", "2")
      - title (the title of the article, e.g. "Purpose of this law")
      - content (the full text of the article)
      
      Extract a maximum of 15 articles to save time.
      
      Text to extract:
      ${data.rawText.substring(0, 30000)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: extractionPrompt,
      config: {
        responseMimeType: 'application/json',
      }
    });

    let extractedArticles = [];
    try {
      extractedArticles = JSON.parse(response.text?.trim() || "[]");
    } catch (e) {
      console.error("Failed to parse articles JSON", e);
      return { success: false, error: "Failed to parse articles." };
    }

    if (!Array.isArray(extractedArticles) || extractedArticles.length === 0) {
      return { success: false, error: "No articles extracted." };
    }

    // 3. Generate embeddings for each article
    // We can do this in batches
    const textsToEmbed = extractedArticles.map(a => `Law: ${newLaw.title}\nArticle ${a.articleNumber}: ${a.title}\n${a.content}`);
    
    // Batch embed if supported, otherwise loop. The SDK might not support array contents for embedContent directly unless we loop or use batchEmbed (if it exists).
    // Let's loop for simplicity.
    const articlesWithEmbeddings = [];
    
    for (let i = 0; i < extractedArticles.length; i++) {
      const art = extractedArticles[i];
      try {
        const embedResponse = await ai.models.embedContent({
          model: 'gemini-embedding-2-preview',
          contents: textsToEmbed[i]
        });
        
        if (embedResponse.embeddings && embedResponse.embeddings[0]?.values) {
          articlesWithEmbeddings.push({
            lawId: newLaw.id,
            articleNumber: String(art.articleNumber),
            title: art.title || "",
            content: art.content,
            embedding: embedResponse.embeddings[0].values
          });
        }
      } catch (err) {
        console.error("Embedding failed for article", art.articleNumber, err);
      }
    }

    // 4. Save to DB
    await addArticles(articlesWithEmbeddings);
    
    return { success: true, count: articlesWithEmbeddings.length };

  } catch (error: any) {
    console.error("Error processing law:", error);
    return { success: false, error: error.message };
  }
}
