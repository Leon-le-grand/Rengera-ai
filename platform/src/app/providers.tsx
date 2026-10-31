import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from '@tanstack/react-router';

import { AuthProvider } from '@/auth/AuthProvider';
import { createAuthStore } from '@/auth/auth-store';
import { isApiError } from '@/api/client';

import { createAppRouter } from './router';
import { ThemeProvider } from './theme';
import { LanguageProvider } from '@/i18n/LanguageProvider';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (isApiError(error) && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 1;
      },
    },
    mutations: {
      retry: false,
    },
  },
});

const auth = createAuthStore(queryClient);
const router = createAppRouter({ queryClient, auth });

/**
 * Application composition root. The query client and auth store are created
 * once, before the router, so guards and queries share the same instances.
 */
export function Providers() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <QueryClientProvider client={queryClient}>
          <AuthProvider auth={auth}>
            <RouterProvider router={router} />
          </AuthProvider>
        </QueryClientProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
