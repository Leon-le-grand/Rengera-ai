'use server';

import { headers } from 'next/headers';
import {
  clearAdminSessionCookie,
  clearUserSessionCookie,
  getConfiguredAdminEmail,
  hashPassword,
  setAdminSessionCookie,
  setUserSessionCookie,
  verifyPassword,
  type AccountUser,
  type AdminUser,
} from '@/lib/auth';
import {
  getSupabaseAdminClient,
  SupabaseConfigurationError,
} from '@/lib/supabase';

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: AdminUser & { id?: string | null };
  account?: AccountUser;
  requiresSupabase?: boolean;
}

interface LoginAttempt {
  count: number;
  resetAt: number;
}

const MAX_LOGIN_ATTEMPTS = 5;
const MAX_SIGNUP_ATTEMPTS = 3;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_ADMIN_EMAIL = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123';
const MIN_PASSWORD_LENGTH = 8;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const loginAttempts = new Map<string, LoginAttempt>();
const signupAttempts = new Map<string, LoginAttempt>();

async function getClientAddress(): Promise<string> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for');
  return forwardedFor?.split(',')[0]?.trim() || 'unknown-client';
}

function isBlocked(store: Map<string, LoginAttempt>, clientAddress: string, limit: number): boolean {
  const attempt = store.get(clientAddress);
  if (!attempt) {
    return false;
  }

  if (attempt.resetAt <= Date.now()) {
    store.delete(clientAddress);
    return false;
  }

  return attempt.count >= limit;
}

function recordAttempt(store: Map<string, LoginAttempt>, clientAddress: string): void {
  const existingAttempt = store.get(clientAddress);
  if (!existingAttempt || existingAttempt.resetAt <= Date.now()) {
    store.set(clientAddress, {
      count: 1,
      resetAt: Date.now() + ATTEMPT_WINDOW_MS,
    });
    return;
  }

  existingAttempt.count += 1;
}

function recordFailedLogin(clientAddress: string): void {
  recordAttempt(loginAttempts, clientAddress);
}

function isLoginBlocked(clientAddress: string): boolean {
  return isBlocked(loginAttempts, clientAddress, MAX_LOGIN_ATTEMPTS);
}

/**
 * Shared credential check. The environment-configured administrator always wins,
 * so a sign-up can never shadow the admin login. Everything else is verified
 * against the Supabase `app_users` table with scrypt.
 */
async function authenticateCredentials(
  identifier: string,
  password: string,
): Promise<{ admin: AdminUser | null; citizen: AccountUser | null }> {
  const normalizedIdentifier = identifier.trim().toLowerCase();
  const configuredEmail = getConfiguredAdminEmail();
  const configuredPasswordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const configuredPlainPassword = process.env.ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD;

  if (normalizedIdentifier === configuredEmail) {
    const passwordMatches = configuredPasswordHash
      ? await verifyPassword(password, configuredPasswordHash)
      : password === configuredPlainPassword;

    if (passwordMatches) {
      return {
        admin: { name: 'Administrator', email: configuredEmail, role: 'admin' },
        citizen: null,
      };
    }
  }

  if (!EMAIL_PATTERN.test(normalizedIdentifier)) {
    return { admin: null, citizen: null };
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('app_users')
      .select('id, full_name, email, password_hash, role, status')
      .eq('email', normalizedIdentifier)
      .maybeSingle();

    if (error) {
      throw new SupabaseConfigurationError(
        'Citizen accounts are unavailable because the Supabase app_users table is missing. Run supabase/migrations/007_create_app_users.sql in the SQL Editor, then retry.',
      );
    }

    if (!data || data.status !== 'active') {
      return { admin: null, citizen: null };
    }

    const passwordMatches = await verifyPassword(password, String(data.password_hash || ''));
    if (!passwordMatches) {
      return { admin: null, citizen: null };
    }

    const account: AccountUser = {
      id: String(data.id),
      name: String(data.full_name || data.email),
      email: String(data.email),
      role: data.role === 'admin' || data.role === 'staff' ? data.role : 'user',
    };

    void supabase
      .from('app_users')
      .update({ last_sign_in_at: new Date().toISOString() })
      .eq('id', account.id as string);

    return { admin: null, citizen: account };
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      throw error;
    }
    console.error('Citizen sign-in lookup failed:', error instanceof Error ? error.message : error);
    return { admin: null, citizen: null };
  }
}

export async function signIn(formData: FormData): Promise<AuthResult> {
  const clientAddress = await getClientAddress();
  if (isLoginBlocked(clientAddress)) {
    return {
      success: false,
      error: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
    };
  }

  const identifier = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');

  if (!identifier || !password) {
    return { success: false, error: 'Enter your email address and password.' };
  }

  try {
    const { admin, citizen } = await authenticateCredentials(identifier, password);

    if (!admin && !citizen) {
      recordFailedLogin(clientAddress);
      return { success: false, error: 'The email address or password is incorrect.' };
    }

    loginAttempts.delete(clientAddress);

    if (admin) {
      const sessionCreated = await setAdminSessionCookie(admin.email);
      if (!sessionCreated) {
        return {
          success: false,
          error: 'A secure administrator session could not be created. Please contact the site administrator.',
        };
      }
      await clearUserSessionCookie();
      return {
        success: true,
        user: admin,
        account: { id: null, name: admin.name, email: admin.email, role: 'admin' },
      };
    }

    const sessionCreated = citizen ? await setUserSessionCookie(citizen) : false;
    if (!sessionCreated) {
      return {
        success: false,
        error: 'A secure session could not be created. Please contact the site administrator.',
      };
    }
    await clearAdminSessionCookie();

    // `user` stays undefined for citizens so the client never promotes a
    // citizen session into the administrator workspace.
    return { success: true, account: citizen as AccountUser };
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      return { success: false, error: error.message, requiresSupabase: true };
    }
    console.error('Sign-in failed:', error instanceof Error ? error.message : error);
    return { success: false, error: 'Unable to sign in right now. Please try again.' };
  }
}

export async function signUp(formData: FormData): Promise<AuthResult> {
  const clientAddress = await getClientAddress();
  if (isBlocked(signupAttempts, clientAddress, MAX_SIGNUP_ATTEMPTS)) {
    return {
      success: false,
      error: 'Too many account creations from this device. Please wait 15 minutes and try again.',
    };
  }

  const fullName = String(formData.get('fullName') || '').trim().replace(/\s+/g, ' ');
  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const confirmPassword = String(formData.get('confirmPassword') || '');

  if (fullName.length < 2 || fullName.length > 120) {
    return { success: false, error: 'Enter your full name.' };
  }

  if (!EMAIL_PATTERN.test(email)) {
    return { success: false, error: 'Enter a valid email address.' };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      success: false,
      error: `Your password must contain at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'The two passwords do not match.' };
  }

  if (email === getConfiguredAdminEmail()) {
    return { success: false, error: 'That email address is reserved. Choose another one.' };
  }

  try {
    const supabase = getSupabaseAdminClient();
    const { data: existingUser, error: lookupError } = await supabase
      .from('app_users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (lookupError) {
      throw new SupabaseConfigurationError(
        'Citizen accounts are unavailable because the Supabase app_users table is missing. Run supabase/migrations/007_create_app_users.sql in the SQL Editor, then retry.',
      );
    }

    if (existingUser) {
      recordAttempt(signupAttempts, clientAddress);
      return { success: false, error: 'An account with that email already exists. Sign in instead.' };
    }

    const passwordHash = await hashPassword(password, MIN_PASSWORD_LENGTH);
    const { data: createdUser, error: insertError } = await supabase
      .from('app_users')
      .insert({
        full_name: fullName,
        email,
        password_hash: passwordHash,
        role: 'user',
        status: 'active',
      })
      .select('id, full_name, email, role')
      .single();

    if (insertError || !createdUser) {
      if (insertError?.message.includes('app_users_email_lower_key')) {
        recordAttempt(signupAttempts, clientAddress);
        return { success: false, error: 'An account with that email already exists. Sign in instead.' };
      }
      throw new SupabaseConfigurationError(
        `Could not create the account: ${insertError?.message || 'unknown error'}`,
      );
    }

    signupAttempts.delete(clientAddress);

    const account: AccountUser = {
      id: String(createdUser.id),
      name: String(createdUser.full_name || email),
      email: String(createdUser.email),
      role: 'user',
    };

    const sessionCreated = await setUserSessionCookie(account);
    if (!sessionCreated) {
      return {
        success: false,
        error: 'Your account was created, but a secure session could not be started. Please sign in.',
      };
    }
    await clearAdminSessionCookie();

    return { success: true, account };
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      recordAttempt(signupAttempts, clientAddress);
      return { success: false, error: error.message, requiresSupabase: true };
    }
    console.error('Sign-up failed:', error instanceof Error ? error.message : error);
    return { success: false, error: 'Unable to create your account right now. Please try again.' };
  }
}

export async function loginAdmin(formData: FormData): Promise<AuthResult> {
  return signIn(formData);
}

export async function logoutAdmin(): Promise<void> {
  await clearAdminSessionCookie();
  await clearUserSessionCookie();
}

export async function logoutUser(): Promise<void> {
  await clearAdminSessionCookie();
  await clearUserSessionCookie();
}
