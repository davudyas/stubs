// Ticket Store: each account's saved tickets.
import { stores, json, userFrom } from '../lib/account.mjs';

const ID_RE = /^stub-[a-z0-9]{4,40}$/, MAX_BYTES = 500_000, MAX_TICKETS = 500;

export default async (req) => {
  const username = await userFrom(req);
  if (!username) return json({ error: 'not_logged_in' }, 401);
  const { tickets } = stores(), prefix = username + '/';

  if (req.method === 'GET') {
    const { blobs } = await tickets.list({ prefix });
    const all = await Promise.all(blobs.map(b => tickets.get(b.key, { type: 'json' }).catch(() => null)));
    return json(all.filter(Boolean));
  }
  if (req.method === 'PUT') {
    const raw = await req.text();
    if (raw.length > MAX_BYTES) return json({ error: 'too_big' }, 413);
    let t; try { t = JSON.parse(raw); } catch { return json({ error: 'bad_json' }, 400); }
    if (!t || typeof t !== 'object' || !ID_RE.test(String(t.id || ''))) return json({ error: 'bad_ticket' }, 400);
    const key = prefix + t.id;
    if (!(await tickets.get(key))) {
      const { blobs } = await tickets.list({ prefix });
      if (blobs.length >= MAX_TICKETS) return json({ error: 'full' }, 507);
    }
    await tickets.setJSON(key, t);
    return json({ ok: true });
  }
  if (req.method === 'DELETE') {
    const id = new URL(req.url).searchParams.get('id') || '';
    if (!ID_RE.test(id)) return json({ error: 'bad_id' }, 400);
    await tickets.delete(prefix + id);
    return json({ ok: true });
  }
  return json({ error: 'method' }, 405);
};

export const config = { path: '/api/tickets' };
