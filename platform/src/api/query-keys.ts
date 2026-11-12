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

  shards: {
    all: () => ['shards'] as const,
    list: (filters: {
      query: string;
      category: string;
      page: number;
      pageSize: number;
    }) => ['shards', 'list', filters] as const,
    detail: (lawId: string) => ['shards', 'detail', lawId] as const,
    timeline: (lawId: string) => ['shards', 'detail', lawId, 'timeline'] as const,
    ast_node: (lawId: string, articleNumber: string) =>
      ['shards', 'detail', lawId, 'ast_node', articleNumber] as const,
  },

  answers: {
    all: () => ['answers'] as const,
    request: (language: string, question: string) =>
      ['answers', language, question] as const,
  },
} as const;

export const PRIVATE_QUERY_ROOT = 'private';
