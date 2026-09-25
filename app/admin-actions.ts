'use server';

import { GoogleGenAI } from '@google/genai';
import { getAdminSession } from '@/lib/auth';
import { addAmendments, addArticles, addLaw, getDb, type Law } from '@/lib/db';
import {
  buildLawDraft,
  extractAmendmentsFromText,
  extractArticlesFromText,
  extractPdfText,
  normalizePdfText,
} from '@/lib/legal-pdf';

const geminiApiKey =
  process.env.GEMINI_API_KEY?.trim() || process.env.SPACE_BUNNY_API_KEY?.trim() || '';
const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL?.trim() || 'gemini-embedding-001';
const ai = geminiApiKey ? new GoogleGenAI({ apiKey: geminiApiKey }) : null;

type ProcessLawResult = {
  success: boolean;
  count?: number;
  amendments?: number;
  lawTitle?: string;
  error?: string;
};

export async function processNewLaw(formData: FormData): Promise<ProcessLawResult> {
  const adminSession = await getAdminSession();
  if (!adminSession) {
    return { success: false, error: 'Your administrator session has expired. Please sign in again.' };
  }

  if (!ai) {
    return {
      success: false,
      error: 'AI is not configured. Add GEMINI_API_KEY (or SPACE_BUNNY_API_KEY) in Vercel and redeploy.',
    };
  }

  try {
    const pdf = formData.get('pdf');
    const rawText = String(formData.get('rawText') || '');
    const sourceUrl = String(formData.get('sourceUrl') || '');
    const sourceFileName = pdf instanceof File && pdf.size > 0 ? pdf.name : undefined;

    let extractedText = '';
    if (pdf instanceof File && pdf.size > 0) {
      extractedText = await extractPdfText(pdf);
    } else if (rawText.trim()) {
      extractedText = normalizePdfText(rawText);
    }

    if (!extractedText) {
      return { success: false, error: 'Upload an RLRC PDF or paste extracted official text.' };
    }

    const lawDraft = buildLawDraft({
      title: String(formData.get('title') || ''),
      lawNumber: String(formData.get('lawNumber') || ''),
      category: String(formData.get('category') || 'labour'),
      sourceUrl,
      sourceFileName,
      publicationDate: String(formData.get('publicationDate') || ''),
      effectiveDate: String(formData.get('effectiveDate') || ''),
      language: String(formData.get('language') || 'english'),
      status: String(formData.get('status') || 'in_force') as Law['status'],
      extractedText,
    });

    if (!lawDraft.title || !lawDraft.sourceUrl) {
      return { success: false, error: 'Law title and RLRC source URL are required for citations.' };
    }

    const newLaw = await addLaw(lawDraft);
    const extractedArticles = extractArticlesFromText(extractedText, newLaw);

    if (extractedArticles.length === 0) {
      return { success: false, error: 'No articles found in the extracted PDF text.' };
    }

    const articlesWithEmbeddings = [];

    for (const article of extractedArticles) {
      try {
        const embedResponse = await ai.models.embedContent({
          model: embeddingModel,
          contents: `Law: ${newLaw.title}\nCitation: ${article.citation}\n${article.text}`,
        });

        if (embedResponse.embeddings && embedResponse.embeddings[0]?.values) {
          articlesWithEmbeddings.push({
            lawId: newLaw.id,
            articleNumber: article.articleNumber,
            title: article.title,
            text: article.text,
            embedding: embedResponse.embeddings[0].values,
            version: article.version,
            sourceUrl: article.sourceUrl,
            sourceFileName: article.sourceFileName,
            citation: article.citation,
            status: article.status,
          });
        }
      } catch (err) {
        console.error('Embedding failed for article', article.articleNumber, err);
      }
    }

    await addArticles(articlesWithEmbeddings);

    const amendments = await buildAmendments(extractedText, newLaw.id, newLaw.lawNumber);
    if (amendments.length > 0) {
      await addAmendments(amendments);
    }

    return {
      success: true,
      count: articlesWithEmbeddings.length,
      amendments: amendments.length,
      lawTitle: newLaw.title,
    };
  } catch (error: unknown) {
    console.error('Error processing law:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown ingestion error.' };
  }
}

async function buildAmendments(extractedText: string, amendingLawId: string, amendingLawNumber: string) {
  const db = await getDb();
  const originalLaw = db.laws.find(
    law =>
      law.id !== amendingLawId &&
      law.lawNumber &&
      extractedText.toLowerCase().includes(law.lawNumber.toLowerCase()) &&
      law.lawNumber !== amendingLawNumber,
  );

  if (!originalLaw) return [];
  return extractAmendmentsFromText(extractedText, originalLaw.id, amendingLawId);
}
