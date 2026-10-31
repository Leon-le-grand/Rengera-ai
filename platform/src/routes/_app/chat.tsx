import { createFileRoute } from '@tanstack/react-router';

import { ChatPage } from '@/features/chat/ChatPage';

interface ChatSearch {
  q?: string;
}

export const Route = createFileRoute('/_app/chat')({
  validateSearch: (search: Record<string, unknown>): ChatSearch => ({
    q:
      typeof search.q === 'string' && search.q.trim()
        ? search.q.slice(0, 2000)
        : undefined,
  }),
  component: ChatRoute,
});

function ChatRoute() {
  const { q } = Route.useSearch();
  // A new `?q=` arrival is a new conversation seed. Keying the page resets the
  // draft and transcript deliberately instead of syncing state in an effect.
  return <ChatPage key={q ?? ''} initialQuestion={q ?? ''} />;
}
