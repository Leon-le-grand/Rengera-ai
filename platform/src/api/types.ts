import type { AnswerLanguage } from '@/i18n/languages';

/**
 * Handwritten V2 transport types.
 *
 * TEMPORARY: these shapes mirror the documented V2 API groups. The versioned
 * contract currently exposes only health and metadata, so `pnpm generate:api`
 * cannot yet generate these operations. They are deliberately narrow and are
 * normalized at the boundary (`src/api/laws.ts`, `src/api/answers.ts`,
 * `src/auth/session.ts`) so generated types can replace them without rewriting
 * UI components.
 */

export interface ApiErrorEnvelope {
  error: {
    code: string;
    message: string;
    request_id?: string | null;
    details?: unknown;
  };
}

export interface ValidationIssue {
  field?: string;
  code?: string;
  message: string;
}

/* -------------------------------------------------------------------------- */
/* Health and metadata                                                         */
/* -------------------------------------------------------------------------- */

export type ServiceStatus = 'healthy' | 'degraded' | 'unavailable' | 'unknown';

export interface HealthResponse {
  status: ServiceStatus;
  version?: string;
  components?: Record<string, ServiceStatus>;
}

export interface MetaResponse {
  api_version: string;
  environment?: string;
  supported_languages: AnswerLanguage[];
  features?: Record<string, boolean>;
}

/* -------------------------------------------------------------------------- */
/* Session and account                                                         */
/* -------------------------------------------------------------------------- */

export type AccountRole = 'user' | 'staff' | 'admin' | 'unknown';
export type AccountStatus = 'active' | 'invited' | 'suspended' | 'unknown';

export interface SessionUser {
  id: string;
  email: string;
  display_name: string;
  role: AccountRole;
  status: AccountStatus;
}

export interface SessionResponse {
  authenticated: boolean;
  user: SessionUser | null;
  capabilities: string[];
  policy_version: string | null;
  csrf_token?: string | null;
  expires_at?: string | null;
}

export interface MeResponse {
  user: SessionUser;
  capabilities: string[];
  policy_version: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

/* -------------------------------------------------------------------------- */
/* Pagination                                                                  */
/* -------------------------------------------------------------------------- */

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number | null;
  has_more: boolean;
}

export interface Paginated<T> extends PaginationMeta {
  items: T[];
}

/* -------------------------------------------------------------------------- */
/* Laws                                                                        */
/* -------------------------------------------------------------------------- */

export type LawStatus = 'active' | 'amended' | 'repealed' | 'unknown';
export type LawType = 'principal' | 'amendment' | 'unknown';
export type ReviewStatus = 'reviewed' | 'pending' | 'unknown' | 'unavailable';

export interface LawCategory {
  id: string;
  label: string;
  count: number | null;
}

export interface LawSummary {
  id: string;
  title: string;
  reference_number: string | null;
  gazette_reference: string | null;
  status: LawStatus;
  type: LawType;
  category: string | null;
  subcategories: string[];
  summary: string | null;
  publication_date: string | null;
  effective_date: string | null;
  language: string | null;
  article_count: number | null;
  review_status: ReviewStatus;
  reviewed_at: string | null;
  source_url: string | null;
  updated_at: string | null;
}

export interface LawArticle {
  id: string;
  law_id: string;
  article_number: string;
  article_title: string | null;
  chunk_type: 'article' | 'preamble';
  sort_order: number;
  language: string;
  content: string;
  citation: string;
  source_url: string | null;
  needs_ocr: boolean;
}

export interface LawDetail extends LawSummary {
  preamble: string | null;
  articles: LawArticle[];
}

export interface LawListResponse extends Paginated<LawSummary> {
  categories: LawCategory[];
}

export interface LawListFilters {
  query: string;
  category: string;
  page: number;
  pageSize: number;
}

/* -------------------------------------------------------------------------- */
/* Answers                                                                     */
/* -------------------------------------------------------------------------- */

export type AnswerOutcome =
  | 'answered'
  | 'abstained'
  | 'urgent'
  | 'greeting'
  | 'help'
  | 'unavailable';

export interface AnswerRequest {
  question: string;
  language: AnswerLanguage;
  law_id?: string;
  article_number?: string;
}

export interface AnswerEvidence {
  law_id: string | null;
  law_title: string | null;
  reference_number: string | null;
  article_number: string | null;
  article_title: string | null;
  citation: string | null;
  excerpt: string | null;
  status: LawStatus;
  review_status: ReviewStatus;
  source_url: string | null;
}

export interface AnswerResponse {
  outcome: AnswerOutcome;
  answer: string | null;
  evidence: AnswerEvidence[];
  limitations: string[];
  request_id: string | null;
  language: AnswerLanguage;
  notice: string | null;
}
