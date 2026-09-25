const DEFAULT_TIMEOUT_MS = 45_000;

export type SpaceBunnyMessageRole = 'system' | 'user' | 'assistant';

export interface SpaceBunnyMessage {
  role: SpaceBunnyMessageRole;
  content: string;
}

export class SpaceBunnyConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpaceBunnyConfigurationError';
  }
}

interface SpaceBunnyConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
  embeddingModel: string;
}

function getConfig(requireEmbeddingModel = false): SpaceBunnyConfig {
  const apiKey = process.env.SPACE_BUNNY_API_KEY?.trim() || '';
  const baseUrl = process.env.SPACE_BUNNY_API_URL?.trim() || '';
  const model = process.env.SPACE_BUNNY_MODEL?.trim() || '';
  const embeddingModel = process.env.SPACE_BUNNY_EMBEDDING_MODEL?.trim() || '';

  const missing: string[] = [];
  if (!apiKey) missing.push('SPACE_BUNNY_API_KEY');
  if (!baseUrl) missing.push('SPACE_BUNNY_API_URL');
  if (!model) missing.push('SPACE_BUNNY_MODEL');
  if (requireEmbeddingModel && !embeddingModel) missing.push('SPACE_BUNNY_EMBEDDING_MODEL');

  if (missing.length > 0) {
    throw new SpaceBunnyConfigurationError(
      `Space Bunny is not configured. Add ${missing.join(', ')} in Vercel and redeploy.`,
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new SpaceBunnyConfigurationError(
      'SPACE_BUNNY_API_URL must be a valid provider URL, usually ending in /v1.',
    );
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new SpaceBunnyConfigurationError('SPACE_BUNNY_API_URL must use http or https.');
  }

  return { apiKey, baseUrl: parsedUrl.toString(), model, embeddingModel };
}

function buildEndpoint(baseUrl: string, resource: 'chat/completions' | 'embeddings'): string {
  const url = new URL(baseUrl);
  const normalizedPath = url.pathname.replace(/\/+$/, '');

  if (normalizedPath.endsWith(`/${resource}`)) {
    return url.toString();
  }

  url.pathname = `${normalizedPath}/${resource}`;
  return url.toString();
}

function redactSensitiveText(value: string, apiKey: string): string {
  const withoutKey = apiKey ? value.split(apiKey).join('[redacted]') : value;
  return withoutKey.slice(0, 600);
}

async function requestJson(
  resource: 'chat/completions' | 'embeddings',
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const config = getConfig(resource === 'embeddings');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  try {
    const response = await fetch(buildEndpoint(config.baseUrl, resource), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
      cache: 'no-store',
    });

    const responseText = await response.text();
    if (!response.ok) {
      const detail = redactSensitiveText(responseText, config.apiKey);
      if (response.status === 401 || response.status === 403) {
        throw new Error('Space Bunny rejected the API key. Check SPACE_BUNNY_API_KEY.');
      }
      if (response.status === 404) {
        throw new Error(
          `Space Bunny endpoint not found (${response.status}). Check SPACE_BUNNY_API_URL and the model name.`,
        );
      }
      throw new Error(`Space Bunny request failed (${response.status}): ${detail || response.statusText}`);
    }

    try {
      return JSON.parse(responseText) as Record<string, unknown>;
    } catch {
      throw new Error('Space Bunny returned a response that was not valid JSON.');
    }
  } catch (error) {
    if (error instanceof SpaceBunnyConfigurationError) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Space Bunny request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function extractMessageContent(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (Array.isArray(value)) {
    const text = value
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
          return part.text;
        }
        return '';
      })
      .join('')
      .trim();
    return text || null;
  }

  return null;
}

export function getSpaceBunnyRuntime(): {
  model: string;
  embeddingModel: string;
  configured: boolean;
} {
  return {
    model: process.env.SPACE_BUNNY_MODEL?.trim() || '',
    embeddingModel: process.env.SPACE_BUNNY_EMBEDDING_MODEL?.trim() || '',
    configured: Boolean(
      process.env.SPACE_BUNNY_API_KEY?.trim() &&
      process.env.SPACE_BUNNY_API_URL?.trim() &&
      process.env.SPACE_BUNNY_MODEL?.trim(),
    ),
  };
}

export async function createSpaceBunnyChatCompletion(
  messages: SpaceBunnyMessage[],
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const config = getConfig();
  const payload = await requestJson('chat/completions', {
    model: config.model,
    messages,
    temperature: options.temperature ?? 0.2,
    ...(options.maxTokens ? { max_tokens: options.maxTokens } : {}),
    stream: false,
  });

  if (payload.error && typeof payload.error === 'object') {
    const providerError = payload.error as { message?: unknown };
    if (typeof providerError.message === 'string') {
      throw new Error(`Space Bunny error: ${providerError.message}`);
    }
  }

  const choices = Array.isArray(payload.choices) ? payload.choices : [];
  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== 'object') {
    throw new Error('Space Bunny returned no completion choices.');
  }

  const message = (firstChoice as { message?: unknown }).message;
  const content = message && typeof message === 'object'
    ? extractMessageContent((message as { content?: unknown }).content)
    : null;

  if (!content) {
    throw new Error('Space Bunny returned an empty completion.');
  }

  return content;
}

export async function createSpaceBunnyEmbedding(input: string): Promise<number[] | null> {
  if (!process.env.SPACE_BUNNY_EMBEDDING_MODEL?.trim()) {
    return null;
  }

  const config = getConfig(true);
  const payload = await requestJson('embeddings', {
    model: config.embeddingModel,
    input,
  });

  const data = Array.isArray(payload.data) ? payload.data : [];
  const firstItem = data[0];
  if (!firstItem || typeof firstItem !== 'object') {
    throw new Error('Space Bunny returned no embedding data.');
  }

  const embedding = (firstItem as { embedding?: unknown }).embedding;
  if (!Array.isArray(embedding) || !embedding.every((value) => typeof value === 'number')) {
    throw new Error('Space Bunny returned an invalid embedding.');
  }

  return embedding;
}
