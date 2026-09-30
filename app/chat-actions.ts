'use server';

import {
  createSpaceBunnyChatCompletion,
  SpaceBunnyConfigurationError,
} from '@/lib/space-bunny';

export interface HandoverMessage {
  role: 'user' | 'model';
  content: string;
}

export interface SessionHandoverResult {
  success: boolean;
  summary?: string;
  error?: string;
}

const HANDOVER_PROMPT = `Create a short session handover for a legal-assistance conversation.

Use at most 120 words and exactly these four short sections:

OBJECTIVE: What the user is trying to resolve.
ESTABLISHED: Confirmed facts, retrieved laws, articles, and decisions.
UNRESOLVED: Unknown facts, missing laws, or questions still open.
NEXT: The single most useful next action.

Do not add a greeting, disclaimers, or invented legal conclusions. Preserve exact law and article numbers when present.`;

export async function createSessionHandover(
  messages: HandoverMessage[],
): Promise<SessionHandoverResult> {
  const relevantMessages = messages
    .filter((message) => message.content.trim())
    .slice(-24)
    .map((message) => ({
      role: message.role === 'model' ? ('assistant' as const) : ('user' as const),
      content: message.content.slice(0, 6_000),
    }));

  if (relevantMessages.length === 0) {
    return { success: true, summary: 'No prior legal discussion to hand over.' };
  }

  try {
    const transcript = relevantMessages
      .map((message) => `${message.role.toUpperCase()}:\n${message.content}`)
      .join('\n\n---\n\n');
    const summary = await createSpaceBunnyChatCompletion(
      [
        { role: 'system', content: HANDOVER_PROMPT },
        { role: 'user', content: transcript },
      ],
      { temperature: 0.1, maxTokens: 260 },
    );

    return { success: true, summary: summary.trim() };
  } catch (error) {
    if (error instanceof SpaceBunnyConfigurationError) {
      return { success: false, error: error.message };
    }

    const lastUserMessage = [...relevantMessages]
      .reverse()
      .find((message) => message.role === 'user')?.content;
    const fallback = lastUserMessage
      ? `OBJECTIVE: Continue the user's legal question.\n\nNEXT: ${lastUserMessage.slice(0, 400)}`
      : 'OBJECTIVE: Continue the previous legal discussion.';

    return {
      success: true,
      summary: fallback,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
