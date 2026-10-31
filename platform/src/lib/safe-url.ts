/**
 * Only absolute http(s) URLs are accepted as external source links. Relative,
 * javascript:, data: and other schemes are rejected rather than rendered.
 */
export function safeHttpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    return url.href;
  } catch {
    return null;
  }
}

const DEFAULT_RETURN_PATH = '/chat';

/**
 * Validates a post-login return path. Only same-origin absolute paths are
 * accepted, preventing protocol-relative and backslash open redirects.
 */
export function safeReturnPath(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_RETURN_PATH;
  const candidate = value.trim();
  if (!candidate.startsWith('/')) return DEFAULT_RETURN_PATH;
  if (candidate.startsWith('//') || candidate.includes('\\')) {
    return DEFAULT_RETURN_PATH;
  }
  for (const character of candidate) {
    const code = character.codePointAt(0) ?? 0;
    if (code <= 0x1f || code === 0x7f) return DEFAULT_RETURN_PATH;
  }

  try {
    const url = new URL(candidate, 'https://rengera.invalid');
    if (url.origin !== 'https://rengera.invalid') return DEFAULT_RETURN_PATH;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return DEFAULT_RETURN_PATH;
  }
}
