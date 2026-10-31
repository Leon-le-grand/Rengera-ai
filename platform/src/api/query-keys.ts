export const queryKeys = {
  session: () => ['session'] as const,

  /**
   * Private keys always include the verified account identity. Do not add
   * private query data under a key without an account scope.
   */
  private: (accountId: string, ...parts: readonly string[]) =>
    ['private', accountId, ...parts] as const,

  me: (accountId: string) => ['private', accountId, 'me'] as const,
  settings: (accountId: string) => ['private', accountId, 'settings'] as const,

  laws: {
    all: () => ['laws'] as const,
    list: (filters: {
      query: string;
      category: string;
      page: number;
      pageSize: number;
    }) => ['laws', 'list', filters] as const,
    detail: (lawId: string) => ['laws', 'detail', lawId] as const,
    article: (lawId: string, articleNumber: string) =>
      ['laws', 'detail', lawId, 'article', articleNumber] as const,
  },

  answers: {
    all: () => ['answers'] as const,
    request: (language: string, question: string) =>
      ['answers', language, question] as const,
  },
} as const;

export const PRIVATE_QUERY_ROOT = 'private';
