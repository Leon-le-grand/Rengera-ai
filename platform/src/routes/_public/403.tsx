import { createFileRoute } from '@tanstack/react-router';

import { ForbiddenContent } from '@/features/system/SystemPages';

export const Route = createFileRoute('/_public/403')({
  component: ForbiddenContent,
});
