import type { ApiErrorEnvelope } from './types';

export type ApiErrorKind = 'http' | 'network' | 'protocol' | 'aborted';

const DEFAULT_MESSAGES: Record<number, string> = {
  400: 'The request was not accepted.',
  401: 'Your session could not be verified. Sign in again to continue.',
  403: 'You do not have permission to do that.',
  404: 'That resource was not found.',
  409: 'That change conflicts with the current state. Refresh and try again.',
  413: 'That request is too large.',
  422: 'Some of the submitted details were not accepted.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'The service encountered a problem. Please try again.',
  501: 'This feature is not available in this build.',
  502: 'The service is temporarily unavailable.',
  503: 'The service is temporarily unavailable.',
  504: 'The service took too long to respond. Please try again.',
};

const FALLBACK_MESSAGE =
  'The request could not be completed. Please try again.';

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly requestId: string | null;
  readonly details: unknown;
  readonly kind: ApiErrorKind;

  constructor(options: {
    status: number;
    code: string;
    message: string;
    requestId?: string | null;
    details?: unknown;
    kind?: ApiErrorKind;
  }) {
    super(options.message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.requestId = options.requestId ?? null;
    this.details = options.details;
    this.kind = options.kind ?? 'http';
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isValidationError(): boolean {
    return this.status === 422;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get isNotImplemented(): boolean {
    return this.status === 501;
  }

  get isUnavailable(): boolean {
    return (
      this.kind === 'network' ||
      this.status === 502 ||
      this.status === 503 ||
      this.status === 504
    );
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function envelopeMessage(payload: unknown): {
  code: string;
  message: string;
  requestId: string | null;
  details: unknown;
} | null {
  if (!payload || typeof payload !== 'object') return null;
  const error = (payload as Partial<ApiErrorEnvelope>).error;
  if (!error || typeof error !== 'object') return null;
  const code = typeof error.code === 'string' ? error.code : '';
  const message = typeof error.message === 'string' ? error.message.trim() : '';
  if (!code && !message) return null;
  return {
    code: code || 'http_error',
    message: message || FALLBACK_MESSAGE,
    requestId:
      typeof error.request_id === 'string' && error.request_id
        ? error.request_id
        : null,
    details: error.details,
  };
}

export function apiErrorFromResponse(
  status: number,
  payload: unknown,
  headerRequestId: string | null,
): ApiError {
  const envelope = envelopeMessage(payload);
  return new ApiError({
    status,
    code: envelope?.code ?? statusCodeName(status),
    message: envelope?.message ?? DEFAULT_MESSAGES[status] ?? FALLBACK_MESSAGE,
    requestId: envelope?.requestId ?? headerRequestId,
    details: envelope?.details,
    kind: 'http',
  });
}

export function apiErrorFromNetwork(error: unknown): ApiError {
  const aborted =
    error instanceof DOMException && error.name === 'AbortError';
  return new ApiError({
    status: 0,
    code: aborted ? 'request_aborted' : 'network_error',
    message: aborted
      ? 'The request was cancelled.'
      : 'Could not reach the Rengera API. Check your connection and try again.',
    kind: aborted ? 'aborted' : 'network',
  });
}

export function apiProtocolError(message: string): ApiError {
  return new ApiError({
    status: 0,
    code: 'protocol_error',
    message,
    kind: 'protocol',
  });
}

function statusCodeName(status: number): string {
  switch (status) {
    case 400:
      return 'bad_request';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    case 413:
      return 'payload_too_large';
    case 422:
      return 'validation_error';
    case 429:
      return 'rate_limited';
    case 501:
      return 'not_implemented';
    default:
      return status >= 500 ? 'server_error' : 'http_error';
  }
}

export interface FriendlyError {
  title: string;
  message: string;
  requestId: string | null;
  canRetry: boolean;
}

/**
 * Safe, user-facing mapping. Request IDs are surfaced for support, but raw
 * server details and stack traces are never rendered.
 */
export function describeApiError(
  error: unknown,
  context: 'generic' | 'session' | 'answer' | 'law' = 'generic',
): FriendlyError {
  if (!isApiError(error)) {
    return {
      title: 'Something went wrong',
      message: FALLBACK_MESSAGE,
      requestId: null,
      canRetry: true,
    };
  }

  if (error.kind === 'aborted') {
    return {
      title: 'Request cancelled',
      message: 'The request was cancelled before it finished.',
      requestId: null,
      canRetry: true,
    };
  }

  if (error.isUnauthorized) {
    return {
      title: 'Sign-in required',
      message:
        context === 'session'
          ? 'The account service could not verify a session.'
          : 'Your session has expired or is not valid. Sign in again to continue.',
      requestId: error.requestId,
      canRetry: false,
    };
  }

  if (error.isForbidden) {
    return {
      title: 'Access denied',
      message:
        'Your account does not have permission for this request. The server remains the authority.',
      requestId: error.requestId,
      canRetry: false,
    };
  }

  if (error.status === 404) {
    return {
      title:
        context === 'law' ? 'Law not found' : 'Not available in this build',
      message:
        context === 'law'
          ? 'The requested law or article is not available from the API.'
          : 'The requested service or resource was not found. It may not be enabled in this build.',
      requestId: error.requestId,
      canRetry: context !== 'law',
    };
  }

  if (error.isValidationError) {
    return {
      title: 'Check the submitted details',
      message: error.message,
      requestId: error.requestId,
      canRetry: false,
    };
  }

  if (error.isRateLimited) {
    return {
      title: 'Too many requests',
      message: 'Please wait a moment before trying again.',
      requestId: error.requestId,
      canRetry: true,
    };
  }

  if (error.isUnavailable) {
    return {
      title: 'Service unavailable',
      message:
        'The Rengera API could not be reached. Check your connection, or try again when the service is available.',
      requestId: error.requestId,
      canRetry: true,
    };
  }

  if (error.isServerError) {
    return {
      title: 'Service error',
      message:
        error.status === 501
          ? 'This feature is not available in this build.'
          : 'The service is temporarily unavailable. Please try again.',
      requestId: error.requestId,
      canRetry: error.status !== 501,
    };
  }

  return {
    title: 'Request failed',
    message: error.message || FALLBACK_MESSAGE,
    requestId: error.requestId,
    canRetry: true,
  };
}
