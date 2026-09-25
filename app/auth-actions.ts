'use server';

import { headers } from 'next/headers';
import {
  clearAdminSessionCookie,
  setAdminSessionCookie,
  verifyAdminPassword,
  type AdminUser,
} from '@/lib/auth';

interface LoginResult {
  success: boolean;
  error?: string;
  user?: AdminUser;
}

interface LoginAttempt {
  count: number;
  resetAt: number;
}

const MAX_LOGIN_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_ADMIN_EMAIL = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123';
const loginAttempts = new Map<string, LoginAttempt>();

async function getClientAddress(): Promise<string> {
  const headerStore = await headers();
  const forwardedFor = headerStore.get('x-forwarded-for');
  return forwardedFor?.split(',')[0]?.trim() || 'unknown-client';
}

function isLoginBlocked(clientAddress: string): boolean {
  const attempt = loginAttempts.get(clientAddress);
  if (!attempt) {
    return false;
  }

  if (attempt.resetAt <= Date.now()) {
    loginAttempts.delete(clientAddress);
    return false;
  }

  return attempt.count >= MAX_LOGIN_ATTEMPTS;
}

function recordFailedLogin(clientAddress: string): void {
  const existingAttempt = loginAttempts.get(clientAddress);
  if (!existingAttempt || existingAttempt.resetAt <= Date.now()) {
    loginAttempts.set(clientAddress, {
      count: 1,
      resetAt: Date.now() + ATTEMPT_WINDOW_MS,
    });
    return;
  }

  existingAttempt.count += 1;
}

export async function loginAdmin(formData: FormData): Promise<LoginResult> {
  const clientAddress = await getClientAddress();
  if (isLoginBlocked(clientAddress)) {
    return {
      success: false,
      error: 'Too many sign-in attempts. Please wait 15 minutes and try again.',
    };
  }

  const email = String(formData.get('email') || '').trim().toLowerCase();
  const password = String(formData.get('password') || '');
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || DEFAULT_ADMIN_EMAIL;
  const configuredPasswordHash = process.env.ADMIN_PASSWORD_HASH?.trim();
  const configuredPlainPassword = process.env.ADMIN_PASSWORD?.trim() || DEFAULT_ADMIN_PASSWORD;

  if (!configuredEmail || (!configuredPasswordHash && !configuredPlainPassword)) {
    return {
      success: false,
      error: 'Administrator sign-in is not configured. Please contact the site administrator.',
    };
  }

  const emailMatches = email === configuredEmail;
  const passwordMatches = configuredPasswordHash
    ? await verifyAdminPassword(password, configuredPasswordHash)
    : password === configuredPlainPassword;

  if (!emailMatches || !passwordMatches) {
    recordFailedLogin(clientAddress);
    return {
      success: false,
      error: 'The email address or password is incorrect.',
    };
  }

  loginAttempts.delete(clientAddress);
  const sessionCreated = await setAdminSessionCookie(configuredEmail);
  if (!sessionCreated) {
    return {
      success: false,
      error: 'A secure administrator session could not be created. Please contact the site administrator.',
    };
  }

  return {
    success: true,
    user: {
      name: 'Administrator',
      email: configuredEmail,
      role: 'admin',
    },
  };
}

export async function logoutAdmin(): Promise<void> {
  await clearAdminSessionCookie();
}
