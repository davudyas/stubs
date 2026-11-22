// Ticket Store: search for people by username. Only public, not blocked walls are ever returned.
import { stores, json, normUser } from '../lib/account.mjs';

export default async (req) => {
  const q = normUser(new URL(req.url).searchParams.get('q')).replace(/^@/, '').replace(/[^a-z0-9_.]/g, '').slice(0, 20);
  if (q.length < 2) return json({ people: [] });
  const { users, tickets } = stores();
  // usernames are the keys, so matching costs no reads; only matches are opened
  const { blobs } = await users.list();
  const keys = blobs.map(b => b.key).filter(k => k.includes(q));
  keys.sort((a, b) => (a.startsWith(q) ? 0 : 1) - (b.startsWith(q) ? 0 : 1) || a.length - b.length || a.localeCompare(b));
  const people = [];
  for (const key of keys.slice(0, 40)) {
    const u = await users.get(key, { type: 'json' }).catch(() => null);
    if (!u || !u.public || u.banned) continue;
    const { blobs } = await tickets.list({ prefix: key + '/' });
    people.push({ username: key, avatar: u.avatar || 0, tickets: blobs.length });
    if (people.length >= 12) break;
  }
  return new Response(JSON.stringify({ people }), { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'private, max-age=60' } });
};

export const config = { path: '/api/people' };
