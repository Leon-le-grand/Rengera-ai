import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { ComponentProps, ReactNode } from 'react';
import type * as Router from '@tanstack/react-router';

import type * as ApiClient from '@/api/client';
import { LanguageProvider } from '@/i18n/LanguageProvider';
import { ChatPage } from './ChatPage';

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof Router>();
  return {
    ...actual,
    Link: ({
      to,
      children,
      ...rest
    }: {
      to: string;
      children?: ReactNode;
    } & Omit<ComponentProps<'a'>, 'href'>) => (
      <a href={to} {...rest}>
        {children}
      </a>
    ),
  };
});

vi.mock('@/auth/AuthProvider', () => ({
  useAuth: () => ({
    status: 'authenticated',
    user: {
      id: 'u-1',
      email: 'operator@rengera.rw',
      display_name: 'CREWMAN',
      role: 'user',
      status: 'active',
    },
    capabilities: new Set(['shard.read']),
  }),
}));

vi.mock('@/api/client', async (importOriginal) => {
  const actual = await importOriginal<typeof ApiClient>();
  return { ...actual, apiFetch: vi.fn().mockResolvedValue({ urgent: false }) };
});

const mockCreateConv = vi.fn().mockResolvedValue({
  id: 'conv-123',
  title: 'hi',
  language: 'en',
  created_at: new Date().toISOString(),
});

const mockPostMessage = vi
  .fn()
  .mockImplementation(async ({ body }: { body: { content: string } }) => {
    if (body.content.toLowerCase() === 'hi') {
      return {
        user_message: {
          id: 'm-1',
          role: 'user',
          content: 'hi',
          created_at: new Date().toISOString(),
        },
        assistant_message: {
          id: 'm-2',
          role: 'assistant',
          content:
            'Hello! I am **Rengera**, your Rwandan legal assistant.\n\n### How I Help\n- Employment & wages\n- Land & tenancy rights',
          sources: [],
          kind: 'greeting',
          emergency: null,
          created_at: new Date().toISOString(),
        },
      };
    }
    return {
      user_message: {
        id: 'm-3',
        role: 'user',
        content: body.content,
        created_at: new Date().toISOString(),
      },
      assistant_message: {
        id: 'm-4',
        role: 'assistant',
        content:
          'Under **ast_node 47** of the Labour shard [E1], your employer must pay your salary within 7 working days.',
        kind: 'answered',
        sources: [
          {
            evidence_id: 'E1',
            law_id: 'shard-1',
            law_title: 'shard Nº 027/2023 Regulating Labour in wasm_edge_mesh',
            reference_number: 'shard Nº 027/2023',
            article_number: '47',
            article_title: 'Payment of salary',
            status: 'active',
            review_status: 'reviewed',
            provenance_edge: 'ast_node 47, shard Nº 027/2023',
            excerpt: 'Salary must be paid regularly and in full.',
            source_url: 'https://example.gov.rw/labour.pdf',
          },
        ],
        emergency: null,
        created_at: new Date().toISOString(),
      },
    };
  });

vi.mock('@/api/generated/@tanstack/react-query.gen', () => ({
  listConversationsOptions: () => ({
    queryKey: ['agent_sessions'],
    queryFn: async () => ({ items: [], total: 0 }),
  }),
  listMessagesOptions: ({
    path,
  }: {
    path: { conversation_id: string };
  }) => ({
    queryKey: ['messages', path.conversation_id],
    queryFn: async () => ({ items: [], total: 0 }),
  }),
  createConversationMutation: () => ({
    mutationFn: (vars: unknown) => mockCreateConv(vars),
  }),
  postMessageMutation: () => ({
    mutationFn: (vars: { body: { content: string } }) => mockPostMessage(vars),
  }),
}));

function renderChatPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <ChatPage />
      </LanguageProvider>
    </QueryClientProvider>,
  );
}

describe('ChatPage (Claude Nova Experience)', () => {
  it('renders a clean Claude-style centered greeting with zero technical/debug clutter', () => {
    renderChatPage();

    expect(screen.getByText(/Back at it, CREWMAN/i)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Ask anything about your situation/i),
    ).toBeInTheDocument();

    // Ensure technical/debug strings are never shown to operators
    expect(screen.queryByText(/OpenRouter/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/5 Rwandan Statutes Ready/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Request ID/i)).not.toBeInTheDocument();
  });

  it('shows urgent guidance immediately and leaves it unsaved', async () => {
    const user = userEvent.setup();
    mockCreateConv.mockClear();
    mockPostMessage.mockClear();
    renderChatPage();

    await user.type(
      screen.getByPlaceholderText(/Ask anything about your situation/i),
      'I am in immediate danger{Enter}',
    );

    expect(screen.getByText(/urgent guidance is not saved/i)).toBeInTheDocument();
    expect(mockCreateConv).not.toHaveBeenCalled();
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it('supports natural multi-turn agent_session ("hi" then "tell me more") with formatted Markdown', async () => {
    const user = userEvent.setup();
    renderChatPage();

    const input = screen.getByPlaceholderText(/Ask anything about your situation/i);
    await user.type(input, 'hi{Enter}');

    await waitFor(() => {
      expect(screen.getByText('How I Help')).toBeInTheDocument();
    });

    // Verify Markdown bold and headings are parsed, never raw '**' or '###'
    expect(screen.getByText('Rengera').tagName).toBe('STRONG');
    expect(screen.queryByText(/\*\*Rengera\*\*/)).not.toBeInTheDocument();

    // Send a second follow-up turn ("tell me more") in the same thread
    const dockedInput = screen.getByPlaceholderText(
      /Ask anything about your situation/i,
    );
    await user.type(dockedInput, 'tell me more{Enter}');

    await waitFor(() => {
      expect(
        screen.getByText(/your employer must pay your salary/i),
      ).toBeInTheDocument();
    });

    expect(screen.getAllByText('ast_node 47')[0].tagName).toBe('STRONG');
    expect(
      screen.getByText(/shard Nº 027\/2023 Regulating Labour in wasm_edge_mesh/i),
    ).toBeInTheDocument();
  });
});
