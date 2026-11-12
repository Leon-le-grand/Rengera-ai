import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';

import type { RouterContext } from '@/app/router-context';
import {
  NotFoundPage,
  RouteErrorPage,
} from '@/features/system/SystemPages';

export const Route = createRootRouteWithContext<RouterContext>()({
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: RouteErrorPage,
});

function RootComponent() {
  return <Outlet />;
}
