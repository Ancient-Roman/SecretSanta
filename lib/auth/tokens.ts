import { jwtVerify, SignJWT } from 'jose';
import crypto from 'crypto';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'dev-secret-change-in-production'
);

export interface SessionPayload {
  userId: number;
  email: string;
  isHost: boolean;
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET_KEY);
  return token;
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const verified = await jwtVerify(token, SECRET_KEY);
    return verified.payload as SessionPayload;
  } catch {
    return null;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateMagicToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateFamilyCode(): string {
  // 6-char code without ambiguous chars (0/O/1/I/l)
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  const randomValues = crypto.getRandomValues(new Uint8Array(6));
  for (let i = 0; i < 6; i++) {
    code += chars[randomValues[i] % chars.length];
  }
  return code;
}
