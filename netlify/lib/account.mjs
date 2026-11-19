// Ticket Store accounts: shared helpers for the auth and tickets functions.
import { getStore } from '@netlify/blobs';
import { timingSafeEqual } from 'node:crypto';

export const SESSION_DAYS = 180;
// The site's admin. Only these accounts can open Moderation; every admin request is checked here on the server.
export const ADMINS = new Set(['davud']);
export const isAdmin = u => ADMINS.has(String(u || ''));
export const USER_RE = /^[a-z0-9_.]{3,20}$/;

export const stores = () => ({
  users: getStore({ name: 'users', consistency: 'strong' }),
  sessions: getStore({ name: 'sessions', consistency: 'strong' }),
  fails: getStore({ name: 'login-fails', consistency: 'strong' }),
  tickets: getStore({ name: 'user-tickets', consistency: 'strong' }),
});

export const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

export const normUser = u => String(u || '').trim().toLowerCase();

const b64 = bytes => Buffer.from(bytes).toString('base64url');
export const randomToken = (n = 32) => b64(crypto.getRandomValues(new Uint8Array(n)));

export async function hashPassword(password, saltB64) {
  const salt = saltB64 ? Buffer.from(saltB64, 'base64url') : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 210000 }, key, 256);
  return { salt: b64(salt), hash: b64(new Uint8Array(bits)) };
}
export function sameHash(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function createSession(username) {
  const token = randomToken();
  await stores().sessions.setJSON(token, { username, created: Date.now() + 1 });
  return token;
}
export function tokenFrom(req) {
  const m = (req.headers.get('authorization') || '').match(/^Bearer ([A-Za-z0-9_-]{30,64})$/);
  return m ? m[1] : null;
}
export async function sessionFrom(req) {
  const token = tokenFrom(req); if (!token) return null;
  const { sessions, users } = stores();
  const s = await sessions.get(token, { type: 'json' });
  if (!s) return null;
  if (Date.now() - s.created > SESSION_DAYS * 864e5) { await sessions.delete(token); return null; }
  const user = await users.get(s.username, { type: 'json' });
  // account deleted, or password changed after this session started
  if (!user || user.banned || (user.since && s.created < user.since)) { await sessions.delete(token); return null; }
  return { token, username: s.username, user };
}
export async function userFrom(req) {
  const s = await sessionFrom(req);
  return s ? s.username : null;
}
