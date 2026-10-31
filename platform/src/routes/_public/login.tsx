import { createFileRoute } from '@tanstack/react-router';

import { LoginPage } from '@/features/auth/LoginPage';

interface LoginSearch {
  redirect?: string;
}

export const Route = createFileRoute('/_public/login')({
  validateSearch: (search: Record<string, unknown>): LoginSearch => ({
    redirect:
      typeof search.redirect === 'string'
        ? search.redirect.slice(0, 2000)
        : undefined,
  }),
  component: LoginRoute,
});

function LoginRoute() {
  const { redirect } = Route.useSearch();
  return <LoginPage redirect={redirect} />;
}
