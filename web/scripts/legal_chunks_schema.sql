create extension if not exists pgcrypto;
create extension if not exists vector;

create table if not exists legal_chunks (
  id uuid primary key default gen_random_uuid(),
  law_id text not null,
  document_title text not null,
  category text not null,
  article_number integer not null,
  article_title text,
  language text not null check (language in ('kinyarwanda', 'english', 'french')),
  content text not null,
  embedding vector(1536),
  content_hash text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists legal_chunks_law_id_idx on legal_chunks (law_id);
create index if not exists legal_chunks_category_language_idx
  on legal_chunks (category, language);
create index if not exists legal_chunks_embedding_idx
  on legal_chunks using hnsw (embedding vector_cosine_ops);
