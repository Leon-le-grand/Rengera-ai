// Chat completions that quote several articles can legitimately take a while.
// Embeddings are cheap and keep the short timeout.
const DEFAULT_TIMEOUT_MS = 45_000;
const DEFAULT_CHAT_TIMEOUT_MS = 120_000;

function resolveTimeoutMs(resource: 'chat/completions' | 'embeddings'): number {
  const configured = Number(process.env.SPACE_BUNNY_TIMEOUT_MS);
  if (Number.isFinite(configured) && configured > 0) return configured;

  if (resource === 'chat/completions') {
    const chatConfigured = Number(process.env.SPACE_BUNNY_CHAT_TIMEOUT_MS);
    if (Number.isFinite(chatConfigured) && chatConfigured > 0) return chatConfigured;
    return DEFAULT_CHAT_TIMEOUT_MS;
  }

  return DEFAULT_TIMEOUT_MS;
}
const DEFAULT_API_URL = 'https://api.aimlapi.com/v1';
const DEFAULT_MODEL = 'stealth/space-bunny-alpha';

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
  label: string;
}

function getConfig(requireEmbeddingModel = false): SpaceBunnyConfig {
  // The key is optional: some gateways serve free models without auth, and the
  // server answers 401 when a key is actually required. Never block startup —
  // surface provider errors at request time instead.
  const apiKey = process.env.SPACE_BUNNY_API_KEY?.trim() || '';
  const baseUrl = process.env.SPACE_BUNNY_API_URL?.trim() || DEFAULT_API_URL;
  const model = process.env.SPACE_BUNNY_MODEL?.trim() || DEFAULT_MODEL;
  const embeddingModel = process.env.SPACE_BUNNY_EMBEDDING_MODEL?.trim() || '';

  if (requireEmbeddingModel && !embeddingModel) {
    throw new SpaceBunnyConfigurationError(
      'Space Bunny is not configured. Add SPACE_BUNNY_EMBEDDING_MODEL in Vercel and redeploy.',
    );
  }

  return { apiKey, baseUrl: normalizeBaseUrl(baseUrl), model, embeddingModel, label: 'primary' };
}

/**
 * Optional second provider. Same OpenAI-compatible shape, different key/model —
 * e.g. a Claude model on the same gateway for Kinyarwanda/French quality, or a
 * completely different endpoint. Used only when the primary fails.
 */
function getFallbackConfig(): SpaceBunnyConfig | null {
  const apiKey = process.env.AI_FALLBACK_API_KEY?.trim() || '';
  if (!apiKey) return null;

  const baseUrl = process.env.AI_FALLBACK_API_URL?.trim()
    || process.env.SPACE_BUNNY_API_URL?.trim()
    || DEFAULT_API_URL;
  const model = process.env.AI_FALLBACK_MODEL?.trim()
    || process.env.SPACE_BUNNY_MODEL?.trim()
    || DEFAULT_MODEL;
  const embeddingModel = process.env.SPACE_BUNNY_EMBEDDING_MODEL?.trim() || '';

  return { apiKey, baseUrl: normalizeBaseUrl(baseUrl), model, embeddingModel, label: 'fallback' };
}

function normalizeBaseUrl(baseUrl: string): string {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(baseUrl);
  } catch {
    throw new SpaceBunnyConfigurationError(
      'Provider API URL must be valid, usually ending in /v1.',
    );
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new SpaceBunnyConfigurationError('Provider API URL must use http or https.');
  }

  return parsedUrl.toString();
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
  config: SpaceBunnyConfig,
  resource: 'chat/completions' | 'embeddings',
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), resolveTimeoutMs(resource));

  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
    const response = await fetch(buildEndpoint(config.baseUrl, resource), {
      method: 'POST',
      headers,
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
      if (response.status === 402) {
        throw new Error(
          'The AI provider refused for billing reasons (402). The workspace has no budget/credits for this model — check billing or pick a free model.',
        );
      }
      if (response.status === 404) {
        throw new Error(
          `Space Bunny endpoint not found (${response.status}). Check SPACE_BUNNY_API_URL and the model name.`,
        );
      }
      if (response.status === 410) {
        throw new Error(
          'That model is retired or unavailable on the provider (410). Pick another SPACE_BUNNY_MODEL from the live list.',
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
    model: process.env.SPACE_BUNNY_MODEL?.trim() || DEFAULT_MODEL,
    embeddingModel: process.env.SPACE_BUNNY_EMBEDDING_MODEL?.trim() || '',
    configured: Boolean(process.env.SPACE_BUNNY_API_KEY?.trim()),
  };
}

export async function createSpaceBunnyChatCompletion(
  messages: SpaceBunnyMessage[],
  options: { temperature?: number; maxTokens?: number; timeoutMs?: number } = {},
): Promise<string> {
  const candidates: SpaceBunnyConfig[] = [getConfig()];
  const fallback = getFallbackConfig();
  if (fallback) candidates.push(fallback);

  let lastError: unknown = null;
  for (const config of candidates) {
    try {
      return await chatCompletionWith(config, messages, options);
    } catch (error) {
      lastError = error;
      console.error(`AI ${config.label} provider (${config.model}) failed:`, error instanceof Error ? error.message : error);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('AI request failed on every configured provider.');
}

async function chatCompletionWith(
  config: SpaceBunnyConfig,
  messages: SpaceBunnyMessage[],
  options: { temperature?: number; maxTokens?: number; timeoutMs?: number },
): Promise<string> {
  const payload = await requestJson(config, 'chat/completions', {
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
  const payload = await requestJson(config, 'embeddings', {
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
