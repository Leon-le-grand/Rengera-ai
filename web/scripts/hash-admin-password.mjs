import { randomBytes, scrypt } from 'node:crypto';

const password = process.env.ADMIN_PASSWORD;

if (!password) {
  console.error('Set ADMIN_PASSWORD in the shell before running this script.');
  process.exit(1);
}

if (password.length < 12) {
  console.error('Use a password with at least 12 characters.');
  process.exit(1);
}

const salt = randomBytes(16);
const derivedKey = await new Promise((resolve, reject) => {
  scrypt(
    password,
    salt,
    64,
    { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
    (error, key) => (error ? reject(error) : resolve(key)),
  );
});

console.log(
  ['scrypt', 32768, 8, 1, salt.toString('base64url'), derivedKey.toString('base64url')].join('$'),
);
