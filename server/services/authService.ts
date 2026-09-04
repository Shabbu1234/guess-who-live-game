import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { db } from '../db.js';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_guess_who_2026';

// Session tokens store in memory or database for server-side auth
const activeSessions = new Set<string>();

export function generateSessionToken(username: string): string {
  const payload = `${username}:${Date.now()}`;
  const hmac = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');
  const token = `${Buffer.from(payload).toString('base64')}.${hmac}`;
  activeSessions.add(token);
  return token;
}

export function verifySessionToken(token: string | undefined): boolean {
  if (!token) return false;
  if (!activeSessions.has(token)) return false;

  try {
    const [base64Payload, hmac] = token.split('.');
    if (!base64Payload || !hmac) return false;

    const payload = Buffer.from(base64Payload, 'base64').toString('utf-8');
    const expectedHmac = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('hex');

    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(expectedHmac));
  } catch (err) {
    return false;
  }
}

export function invalidateSessionToken(token: string | undefined) {
  if (token) {
    activeSessions.delete(token);
  }
}

export function verifyAdminPassword(password: string): boolean {
  const adminRow = db.prepare('SELECT password_hash FROM admins WHERE username = ?').get('admin') as { password_hash: string } | undefined;
  if (!adminRow) return false;
  return bcrypt.compareSync(password, adminRow.password_hash);
}
