export function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function asRawString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

export function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function asBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is string => typeof item === 'string' && item.trim().length > 0,
  );
}

/** Unwraps common `{ data: ... }` envelopes without requiring one shape. */
export function unwrapData(value: unknown): unknown {
  const record = asRecord(value);
  if (record && 'data' in record) return record.data;
  return value;
}

export function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}
