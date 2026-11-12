import type { QueryClient } from '@tanstack/react-query';

import type { AuthStore } from '@/auth/auth-store';

/**
 * Router-wide dependencies. Guards resolve the session through `auth`; route
 * components use `queryClient` for loaders and prefetching.
 */
export interface RouterContext {
  queryClient: QueryClient;
  auth: AuthStore;
}
