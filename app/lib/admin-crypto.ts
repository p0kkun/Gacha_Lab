import crypto from 'crypto';

const SESSION_TOKEN_BYTES = 32;

export function generateSessionToken(): string {
  return crypto.randomBytes(SESSION_TOKEN_BYTES).toString('hex');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function hashPassword(
  password: string
): { hash: string; salt: string; cost: number } {
  const salt = crypto.randomBytes(16).toString('hex');
  const cost = 64;
  const derivedKey = crypto.scryptSync(password, salt, cost);
  return { hash: derivedKey.toString('hex'), salt, cost };
}

export function verifyPassword(
  password: string,
  hash: string,
  salt: string,
  cost: number
): boolean {
  const derivedKey = crypto.scryptSync(password, salt, cost);
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), derivedKey);
}

export function createPasswordHash(password: string): string {
  const { hash, salt, cost } = hashPassword(password);
  return `${salt}:${cost}:${hash}`;
}

export function verifyPasswordHash(
  password: string,
  storedHash: string
): boolean {
  const [salt, costRaw, hash] = storedHash.split(':');
  const cost = Number(costRaw);
  if (!salt || !hash || !Number.isFinite(cost)) return false;
  return verifyPassword(password, hash, salt, cost);
}
