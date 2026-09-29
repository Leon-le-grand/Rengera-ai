import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export class SupabaseConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SupabaseConfigurationError';
  }
}

let adminClient: SupabaseClient | null = null;
let publicClient: SupabaseClient | null = null;

function requireValue(value: string | undefined, name: string): string {
  const normalized = value?.trim();
  if (!normalized) {
    throw new SupabaseConfigurationError(
      `Supabase is not configured. Add ${name} in Vercel and redeploy.`,
    );
  }
  return normalized;
}

function getSupabaseUrl(): string {
  return requireValue(
    process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL,
    'SUPABASE_URL',
  );
}

export function getSupabaseAdminClient(): SupabaseClient {
  if (adminClient) {
    return adminClient;
  }

  adminClient = createClient(
    getSupabaseUrl(),
    requireValue(process.env.SUPABASE_SERVICE_ROLE_KEY, 'SUPABASE_SERVICE_ROLE_KEY'),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  return adminClient;
}

export function getSupabasePublicClient(): SupabaseClient {
  if (publicClient) {
    return publicClient;
  }

  publicClient = createClient(
    getSupabaseUrl(),
    requireValue(
      process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'SUPABASE_ANON_KEY',
    ),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    },
  );

  return publicClient;
}
