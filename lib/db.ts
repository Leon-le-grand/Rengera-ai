import fs from 'fs/promises';
import path from 'path';

export interface Law {
  id: string;
  title: string;
  lawNumber: string;
  category: string;
  sourceUrl: string;
  sourceFileName?: string;
  publicationDate: string;
  effectiveDate: string;
  language: string;
  status: 'in_force' | 'amended' | 'repealed' | 'unknown';
  createdAt: string;
}

export interface Article {
  id: string;
  lawId: string;
  articleNumber: string;
  title: string;
  text: string;
  embedding: number[];
  version: string;
  sourceUrl: string;
  sourceFileName?: string;
  citation: string;
  status: 'active' | 'amended' | 'repealed' | 'unknown';
}

export interface Amendment {
  id: string;
  originalLawId: string;
  amendingLawId: string;
  affectedArticle: string;
  amendmentType: 'amended' | 'inserted' | 'repealed' | 'unknown';
  note: string;
}

export interface DatabaseSchema {
  laws: Law[];
  articles: Article[];
  amendments: Amendment[];
}

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

async function ensureDbExists() {
  try {
    await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify({ laws: [], articles: [], amendments: [] }, null, 2));
  }
}

function migrateDb(data: Partial<DatabaseSchema>): DatabaseSchema {
  const laws = (data.laws || []).map(law => {
    const legacyLaw = law as Law & { law_number?: string; source_url?: string; effective_date?: string };
    return {
      id: legacyLaw.id,
      title: legacyLaw.title,
      lawNumber: legacyLaw.lawNumber || legacyLaw.law_number || '',
      category: legacyLaw.category || 'other',
      sourceUrl: legacyLaw.sourceUrl || legacyLaw.source_url || '',
      sourceFileName: legacyLaw.sourceFileName,
      publicationDate: legacyLaw.publicationDate || '',
      effectiveDate: legacyLaw.effectiveDate || legacyLaw.effective_date || legacyLaw.publicationDate || '',
      language: legacyLaw.language || 'english',
      status: legacyLaw.status || 'unknown',
      createdAt: legacyLaw.createdAt || new Date().toISOString(),
    } satisfies Law;
  });

  const articles = (data.articles || []).map(article => {
    const legacyArticle = article as Article & { content?: string };
    const law = laws.find(item => item.id === legacyArticle.lawId);
    return {
      id: legacyArticle.id,
      lawId: legacyArticle.lawId,
      articleNumber: legacyArticle.articleNumber,
      title: legacyArticle.title || '',
      text: legacyArticle.text || legacyArticle.content || '',
      embedding: legacyArticle.embedding || [],
      version: legacyArticle.version || law?.lawNumber || 'original',
      sourceUrl: legacyArticle.sourceUrl || law?.sourceUrl || '',
      sourceFileName: legacyArticle.sourceFileName || law?.sourceFileName,
      citation:
        legacyArticle.citation ||
        `${law?.title || 'Unknown law'}, Article ${legacyArticle.articleNumber}`,
      status: legacyArticle.status || 'active',
    } satisfies Article;
  });

  return {
    laws,
    articles,
    amendments: data.amendments || [],
  };
}

export async function getDb(): Promise<DatabaseSchema> {
  await ensureDbExists();
  const data = await fs.readFile(DB_PATH, 'utf-8');
  const migrated = migrateDb(JSON.parse(data));
  return migrated;
}

export async function saveDb(data: DatabaseSchema): Promise<void> {
  await ensureDbExists();
  await fs.writeFile(DB_PATH, JSON.stringify(migrateDb(data), null, 2));
}

export async function addLaw(law: Omit<Law, 'id' | 'createdAt'>): Promise<Law> {
  const db = await getDb();
  const newLaw: Law = {
    ...law,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  db.laws.push(newLaw);
  await saveDb(db);
  return newLaw;
}

export async function addArticles(articles: Omit<Article, 'id'>[]): Promise<Article[]> {
  const db = await getDb();
  const newArticles = articles.map(article => ({ ...article, id: crypto.randomUUID() }));
  db.articles.push(...newArticles);
  await saveDb(db);
  return newArticles;
}

export async function addAmendments(amendments: Omit<Amendment, 'id'>[]): Promise<Amendment[]> {
  const db = await getDb();
  const newAmendments = amendments.map(amendment => ({ ...amendment, id: crypto.randomUUID() }));
  db.amendments.push(...newAmendments);
  await saveDb(db);
  return newAmendments;
}

export async function getLaws(): Promise<Law[]> {
  const db = await getDb();
  return db.laws;
}

export async function getArticlesByLawId(lawId: string): Promise<Article[]> {
  const db = await getDb();
  return db.articles.filter(article => article.lawId === lawId);
}
