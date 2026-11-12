import { createFileRoute } from '@tanstack/react-router';

import { ChatPage } from '@/features/chat/ChatPage';

interface ChatSearch {
  q?: string;
  c?: string;
}

export const Route = createFileRoute('/_app/chat')({
  validateSearch: (search: Record<string, unknown>): ChatSearch => ({
    q:
      typeof search.q === 'string' && search.q.trim()
        ? search.q.slice(0, 2000)
        : undefined,
    c:
      typeof search.c === 'string' && search.c.trim()
        ? search.c.trim()
        : undefined,
  }),
  component: ChatRoute,
});

function ChatRoute() {
  const { q, c } = Route.useSearch();
  return <ChatPage key={`${c ?? 'new'}:${q ?? ''}`} initialQuestion={q ?? ''} conversationId={c ?? null} />;
}
