import fs from 'fs/promises';
import path from 'path';

export interface Law {
  id: string;
  title: string;
  category: string;
  publicationDate: string;
  language: string;
  createdAt: string;
}

export interface Article {
  id: string;
  lawId: string;
  articleNumber: string;
  title: string;
  content: string;
  embedding: number[];
}

export interface DatabaseSchema {
  laws: Law[];
  articles: Article[];
}

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

async function ensureDbExists() {
  try {
    await fs.mkdir(path.join(process.cwd(), 'data'), { recursive: true });
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, JSON.stringify({ laws: [], articles: [] }, null, 2));
  }
}

export async function getDb(): Promise<DatabaseSchema> {
  await ensureDbExists();
  const data = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

export async function saveDb(data: DatabaseSchema): Promise<void> {
  await ensureDbExists();
  await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
}

// Helper methods

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
  const newArticles = articles.map(a => ({ ...a, id: crypto.randomUUID() }));
  db.articles.push(...newArticles);
  await saveDb(db);
  return newArticles;
}

export async function getLaws(): Promise<Law[]> {
  const db = await getDb();
  return db.laws;
}

export async function getArticlesByLawId(lawId: string): Promise<Article[]> {
  const db = await getDb();
  return db.articles.filter(a => a.lawId === lawId);
}
