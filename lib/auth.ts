import { createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export interface AdminUser {
  name: string;
  email: string;
  role: 'admin';
}

interface AdminSessionPayload {
  sub: 'admin';
  email: string;
  role: 'admin';
  issuedAt: number;
  expiresAt: number;
}

const ADMIN_SESSION_COOKIE = 'rengera_admin_session';
const DEFAULT_AUTH_SECRET = 'rengera-demo-secret-change-before-public-deploy';
const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const SCRYPT_COST = 32768;
const SCRYPT_BLOCK_SIZE = 8;
const SCRYPT_PARALLELIZATION = 1;
const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_MAX_MEMORY = 64 * 1024 * 1024;

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

export async function hashAdminPassword(password: string): Promise<string> {
  if (password.length < 12) {
    throw new Error('Administrator passwords must contain at least 12 characters.');
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

export async function verifyAdminPassword(password: string, encodedHash: string): Promise<boolean> {
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

function signSession(payload: AdminSessionPayload, secret: string): string {
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = createHmac('sha256', secret).update(encodedPayload).digest('base64url');

  return `${encodedPayload}.${signature}`;
}

function verifySessionToken(token: string, secret: string): AdminSessionPayload | null {
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
    ) as Partial<AdminSessionPayload>;
    const now = Math.floor(Date.now() / 1000);

    if (
      payload.sub !== 'admin' ||
      payload.role !== 'admin' ||
      typeof payload.email !== 'string' ||
      typeof payload.issuedAt !== 'number' ||
      typeof payload.expiresAt !== 'number' ||
      payload.issuedAt > now + 60 ||
      payload.expiresAt <= now
    ) {
      return null;
    }

    return payload as AdminSessionPayload;
  } catch {
    return null;
  }
}

export function createAdminSessionToken(email: string): string | null {
  const secret = getAuthSecret();
  if (!secret) {
    return null;
  }

  const issuedAt = Math.floor(Date.now() / 1000);
  return signSession(
    {
      sub: 'admin',
      email,
      role: 'admin',
      issuedAt,
      expiresAt: issuedAt + SESSION_DURATION_SECONDS,
    },
    secret,
  );
}

export async function setAdminSessionCookie(email: string): Promise<boolean> {
  const token = createAdminSessionToken(email);
  if (!token) {
    return false;
  }

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DURATION_SECONDS,
  });

  return true;
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export async function getAdminSession(): Promise<AdminUser | null> {
  const secret = getAuthSecret();
  if (!secret) {
    return null;
  }

  const token = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const payload = verifySessionToken(token, secret);
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase() || 'admin';
  if (!payload || !configuredEmail || payload.email.toLowerCase() !== configuredEmail) {
    return null;
  }

  return {
    name: 'Administrator',
    email: payload.email,
    role: 'admin',
  };
}
