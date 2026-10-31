import {
  ApiError,
  apiErrorFromNetwork,
  apiErrorFromResponse,
  isApiError,
} from './errors';

const DEFAULT_API_BASE_URL = 'http://localhost:8000';
const DEFAULT_TIMEOUT_MS = 20_000;

let csrfToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

/**
 * The CSRF token is held in memory only. A same-origin API session should set
 * it during login/session refresh; it is never persisted to localStorage.
 */
export function setCsrfToken(token: string | null) {
  csrfToken = token && token.trim() ? token.trim() : null;
}

export function getCsrfToken(): string | null {
  return csrfToken;
}

/**
 * Register a single listener for a rejected request that indicates the session
 * is no longer valid. The auth provider uses this to refresh capabilities and
 * clear private cache. It is presentation coordination, not authorization.
 */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler;
}

export function getApiBaseUrl(): string {
  const configured = import.meta.env.VITE_API_BASE_URL;
  const base =
    typeof configured === 'string' && configured.trim()
      ? configured.trim()
      : DEFAULT_API_BASE_URL;
  return base.replace(/\/+$/, '');
}

export interface ApiRequestOptions
  extends Omit<RequestInit, 'body' | 'headers'> {
  body?: unknown;
  headers?: Record<string, string>;
  /** Overrides the in-memory CSRF token for this request. */
  csrfToken?: string | null;
  /** Suppresses the global 401 listener, e.g. for login/session requests. */
  skipUnauthorizedHandler?: boolean;
  timeoutMs?: number;
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === 'string' ||
    value instanceof FormData ||
    value instanceof Blob ||
    value instanceof URLSearchParams ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value)
  );
}

function isUnsafeMethod(method: string): boolean {
  return !['GET', 'HEAD', 'OPTIONS'].includes(method);
}

function requestIdFromHeaders(response: Response): string | null {
  try {
    return response.headers.get('x-request-id');
  } catch {
    return null;
  }
}

function parsePayload(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/**
 * Typed JSON transport for the versioned API.
 *
 * Responsibilities kept out of generated code:
 * - base URL and credentials
 * - in-memory CSRF header for unsafe methods
 * - stable error envelope mapping
 * - JSON parsing and request IDs
 */
export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  if (!path.startsWith('/')) {
    throw new ApiError({
      status: 0,
      code: 'invalid_path',
      message: 'API paths must be absolute paths such as /v1/laws.',
      kind: 'protocol',
    });
  }

  const method = (options.method ?? 'GET').toUpperCase();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json');

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (isBodyInit(options.body)) {
      body = options.body;
    } else {
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      body = JSON.stringify(options.body);
    }
  }

  if (isUnsafeMethod(method)) {
    const token = options.csrfToken ?? csrfToken;
    if (token) headers.set('X-CSRF-Token', token);
  }

  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const controller = new AbortController();
  let timedOut = false;
  let externalAbortHandler: (() => void) | null = null;

  const timer =
    timeoutMs > 0
      ? window.setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : null;

  if (options.signal) {
    if (options.signal.aborted) {
      controller.abort();
    } else {
      externalAbortHandler = () => controller.abort();
      options.signal.addEventListener('abort', externalAbortHandler, {
        once: true,
      });
    }
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      method,
      headers,
      body,
      credentials: 'include',
      signal: controller.signal,
    });
  } catch (error) {
    if (timedOut) {
      throw new ApiError({
        status: 0,
        code: 'timeout',
        message: 'The Rengera API did not respond in time. Please try again.',
        kind: 'network',
      });
    }
    throw apiErrorFromNetwork(error);
  } finally {
    if (timer !== null) window.clearTimeout(timer);
    if (options.signal && externalAbortHandler) {
      options.signal.removeEventListener('abort', externalAbortHandler);
    }
  }

  const text = await response.text();
  const payload = parsePayload(text);

  if (!response.ok) {
    const error = apiErrorFromResponse(
      response.status,
      payload,
      requestIdFromHeaders(response),
    );
    if (
      error.status === 401 &&
      !options.skipUnauthorizedHandler &&
      path !== '/v1/session'
    ) {
      unauthorizedHandler?.();
    }
    throw error;
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return payload as T;
}

export { ApiError, isApiError };
