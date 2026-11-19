// Ticket Store: someone's public wall of tickets, only if they switched it on.
import { stores, json, normUser, USER_RE } from '../lib/account.mjs';

export default async (req) => {
  const username = normUser(new URL(req.url).searchParams.get('u'));
  if (!USER_RE.test(username)) return json({ error: 'not_found' }, 404);
  const { users, tickets } = stores();
  const user = await users.get(username, { type: 'json' });
  if (!user || !user.public || user.banned) return json({ error: 'not_found' }, 404);
  const { blobs } = await tickets.list({ prefix: username + '/' });
  const all = (await Promise.all(blobs.map(b => tickets.get(b.key, { type: 'json' }).catch(() => null)))).filter(Boolean);
  all.sort((a, b) => (String(b.date) + String(b.time)).localeCompare(String(a.date) + String(a.time)));
  return new Response(JSON.stringify({ username, avatar: user.avatar || 0, tickets: all.slice(0, 120) }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=60' },
  });
};

export const config = { path: '/api/profile' };
