import { createFileRoute, Outlet } from '@tanstack/react-router';

import { useAuth } from '@/auth/AuthProvider';
import { requireAuthenticated } from '@/auth/guards';
import { AuthUnavailablePanel } from '@/features/system/SystemPages';

export const Route = createFileRoute('/_app/_authenticated')({
  beforeLoad: async ({ context, location }) =>
    requireAuthenticated(context.auth, { href: location.href }),
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const context = Route.useRouteContext();
  const { refreshing, refresh } = useAuth();

  if (context.authUnavailable) {
    return (
      <AuthUnavailablePanel
        message={context.authMessage}
        retrying={refreshing}
        onRetry={() => void refresh()}
      />
    );
  }

  return <Outlet />;
}
