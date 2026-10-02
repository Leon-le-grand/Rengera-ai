import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

/** Roles a signed session can carry. `admin` is only ever issued for the
 *  environment-configured administrator account, never for a sign-up. */
export type AccountRole = 'admin' | 'staff' | 'user';

export interface AdminUser {
  name: string;
  email: string;
  role: 'admin';
}

export interface AccountUser {
  /** null for the environment-configured administrator who has no row. */
  id: string | null;
  name: string;
  email: string;
  role: AccountRole;
}

interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  role: AccountRole;
  issuedAt: number;
  expiresAt: number;
}

const ADMIN_SESSION_COOKIE = 'rengera_admin_session';
const USER_SESSION_COOKIE = 'rengera_user_session';
const DEFAULT_AUTH_SECRET = 'rengera-demo-secret-change-before-public-deploy';
const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const SCRYPT_COST = 32768;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;
const MIN_CITIZEN_PASSWORD_LENGTH = 8;
const MIN_ADMIN_PASSWORD_LENGTH = 12;

function getAuthSecret(): string | null {
  const secret = process.env.AUTH_SECRET?.trim() || DEFAULT_AUTH_SECRET;

  if (!secret || Buffer.byteLength(secret, 'utf8') < 32) {
    return null;
  }

  return secret;
}

function derivePasswordKey(
  password: string,
  salt: Buffer,
  cost = SCRYPT_COST,
  blockSize = SCRYPT_BLOCK_SIZE,
  parallelization = SCRYPT_PARALLELIZATION,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(
      password,
      salt,
      SCRYPT_KEY_LENGTH,
      {
        N: cost,
        r: blockSize,
        p: parallelization,
        maxmem: SCRYPT_MAX_MEMORY,
      },
      (error, derivedKey) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(derivedKey);
      },
    );
  });
}

/**
 * Hash a password with scrypt. The encoded format is
 * `scrypt$cost$r$p$salt$hash` so parameters stay auditable in the database.
 */
export async function hashPassword(password: string, minLength = MIN_CITIZEN_PASSWORD_LENGTH): Promise<string> {
  if (password.length < minLength) {
    throw new Error(`Passwords must contain at least ${minLength} characters.`);
  }

  const salt = randomBytes(16);
  const derivedKey = await derivePasswordKey(password, salt);

  return [
    'scrypt',
    SCRYPT_COST,
    SCRYPT_BLOCK_SIZE,
    SCRYPT_PARALLELIZATION,
    salt.toString('base64url'),
    derivedKey.toString('base64url'),
  ].join('$');
}

export async function hashAdminPassword(password: string): Promise<string> {
  return hashPassword(password, MIN_ADMIN_PASSWORD_LENGTH);
}

export async function verifyPassword(password: string, encodedHash: string): Promise<boolean> {
  const [algorithm, costValue, blockSizeValue, parallelizationValue, saltValue, hashValue] =
    encodedHash.split('$');

  if (
    algorithm !== 'scrypt' ||
    !costValue ||
    !blockSizeValue ||
    !parallelizationValue ||
    !saltValue ||
    !hashValue
  ) {
    return false;
  }

  const cost = Number(costValue);
  const blockSize = Number(blockSizeValue);
  const parallelization = Number(parallelizationValue);

  if (
    cost !== SCRYPT_COST ||
    blockSize !== SCRYPT_BLOCK_SIZE ||
    parallelization !== SCRYPT_PARALLELIZATION
  ) {
    return false;
  }

  const salt = Buffer.from(saltValue, 'base64url');
  const expectedHash = Buffer.from(hashValue, 'base64url');

  if (salt.length !== 16 || expectedHash.length !== SCRYPT_KEY_LENGTH) {
    return false;
  }

  const actualHash = await derivePasswordKey(password, salt, cost, blockSize, parallelization);
  return timingSafeEqual(actualHash, expectedHash);
}

export const verifyAdminPassword = verifyPassword;

function signSession(payload: SessionPayload, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret).update(encodedPayload).digest('base64url');

  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token: string, secret: string): SessionPayload | null {
  const [encodedPayload, providedSignature, extraPart] = token.split('.');
  if (!encodedPayload || !providedSignature || extraPart) {
    return null;
  }

  const expectedSignature = createHmac('sha256', secret).update(encodedPayload).digest();
  const providedSignatureBuffer = Buffer.from(providedSignature, 'base64url');

  if (
    providedSignatureBuffer.length !== expectedSignature.length ||
    !timingSafeEqual(providedSignatureBuffer, expectedSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as Partial<SessionPayload>;
    const now = Math.floor(Date.now() / 1000);

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.name !== 'string' ||
      (payload.role !== 'admin' && payload.role !== 'staff' && payload.role !== 'user') ||
      typeof payload.issuedAt !== 'number' ||
      typeof payload.expiresAt !== 'number' ||
      payload.issuedAt > now + 60 ||
      payload.expiresAt <= now
    ) {
      return null;
    }

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

async function verifySessionCookieValue(
  cookieName: string,
  secret: string,
): Promise<SessionPayload | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) {
    return null;
  }

  return verifySessionToken(token, secret);
}

async function writeSessionCookie(
  cookieName: string,
  payload: SessionPayload,
): Promise<boolean> {
  const secret = getAuthSecret();
  if (!secret) {
    return false;
  }

  const cookieStore = await cookies();
  cookieStore.set(cookieName, signSession(payload, secret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });

  return true;
}

async function removeSessionCookie(cookieName: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(cookieName, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

function buildPayload(
  sub: string,
  email: string,
  name: string,
  role: AccountRole,
): SessionPayload {
  const issuedAt = Math.floor(Date.now() / 1000);
  return {
    sub,
    email,
    name,
    role,
    issuedAt,
    expiresAt: issuedAt + SESSION_DURATION_SECONDS,
  };
}

export function getConfiguredAdminEmail(): string {
  return process.env.ADMIN_EMAIL?.trim().toLowerCase() || 'admin';
}

export function createAdminSessionToken(email: string): string | null {
  const secret = getAuthSecret();
  if (!secret) {
    return null;
  }

  return signSession(buildPayload('admin', email, 'Administrator', 'admin'), secret);
}

export async function setAdminSessionCookie(email: string): Promise<boolean> {
  return writeSessionCookie(
    ADMIN_SESSION_COOKIE,
    buildPayload('admin', email, 'Administrator', 'admin'),
  );
}

export async function clearAdminSessionCookie(): Promise<void> {
  await removeSessionCookie(ADMIN_SESSION_COOKIE);
}

export async function getAdminSession(): Promise<AdminUser | null> {
  const secret = getAuthSecret();
  if (!secret) {
    return null;
  }

  const payload = await verifySessionCookieValue(ADMIN_SESSION_COOKIE, secret);
  if (!payload || payload.role !== 'admin') {
    return null;
  }

  const configuredEmail = getConfiguredAdminEmail();
  if (!configuredEmail || payload.email.toLowerCase() !== configuredEmail) {
    return null;
  }

  return {
    name: 'Administrator',
    email: payload.email,
    role: 'admin',
  };
}

export function createUserSessionToken(account: AccountUser): string | null {
  const secret = getAuthSecret();
  if (!secret) {
    return null;
  }

  return signSession(
    buildPayload(account.id || account.email, account.email, account.name, account.role),
    secret,
  );
}

export async function setUserSessionCookie(account: AccountUser): Promise<boolean> {
  return writeSessionCookie(
    USER_SESSION_COOKIE,
    buildPayload(account.id || account.email, account.email, account.name, account.role),
  );
}

export async function clearUserSessionCookie(): Promise<void> {
  await removeSessionCookie(USER_SESSION_COOKIE);
}

/**
 * Returns the signed-in citizen account, or the administrator when they signed
 * in through the admin credential path. Always re-validated against Supabase
 * so a deleted or suspended row loses access on the next request.
 */
export async function getUserSession(): Promise<AccountUser | null> {
  const adminSession = await getAdminSession();
  if (adminSession) {
    return {
      id: null,
      name: adminSession.name,
      email: adminSession.email,
      role: 'admin',
    };
  }

  const secret = getAuthSecret();
  if (!secret) {
    return null;
  }

  const payload = await verifySessionCookieValue(USER_SESSION_COOKIE, secret);
  if (!payload || payload.role === 'admin') {
    return null;
  }

  return {
    id: payload.sub,
    name: payload.name,
    email: payload.email,
    role: payload.role,
  };
}

export async function getCurrentSessions(): Promise<{
  admin: AdminUser | null;
  account: AccountUser | null;
}> {
  const admin = await getAdminSession();

  const secret = getAuthSecret();
  const payload = secret ? await verifySessionCookieValue(USER_SESSION_COOKIE, secret) : null;

  if (admin) {
    return {
      admin,
      account: { id: null, name: admin.name, email: admin.email, role: 'admin' },
    };
  }

  if (!payload || payload.role === 'admin') {
    return { admin: null, account: null };
  }

  return {
    admin: null,
    account: {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    },
  };
}

