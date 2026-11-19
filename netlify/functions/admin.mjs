// Ticket Store: moderation. Every action checks on the server that the caller is the admin.
import { getStore } from '@netlify/blobs';
import { stores, json, normUser, USER_RE, sessionFrom, isAdmin, hashPassword } from '../lib/account.mjs';

const ID_RE = /^stub-[a-z0-9]{4,40}$/, SHARE_RE = /^[A-Za-z0-9_-]{8,24}$/;
const tempPassword = () => {
  const a = 'abcdefghjkmnpqrstuvwxyz23456789', b = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(b, x => a[x % a.length]).join('').replace(/(.{5})/, '$1-');
};

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  const sess = await sessionFrom(req);
  if (!sess || !isAdmin(sess.username)) return json({ error: 'forbidden' }, 403);
  let body; try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const { users, tickets, sessions, fails } = stores();
  const avatars = getStore({ name: 'avatars' });
  const shares = getStore({ name: 'shared-tickets', consistency: 'strong' });
  const previews = getStore({ name: 'share-previews' });
  const a = body.action;

  if (a === 'overview') {
    const [{ blobs: ub }, { blobs: tb }, { blobs: sb }] = await Promise.all([users.list(), tickets.list(), shares.list()]);
    const counts = {};
    for (const t of tb) { const u = t.key.split('/')[0]; counts[u] = (counts[u] || 0) + 1; }
    const list = (await Promise.all(ub.map(b => users.get(b.key, { type: 'json' }).catch(() => null)))).filter(Boolean)
      .map(u => ({ username: u.username, created: u.created || 0, public: !!u.public, avatar: u.avatar || 0, banned: !!u.banned, admin: isAdmin(u.username), tickets: counts[u.username] || 0 }))
      .sort((x, y) => y.created - x.created);
    const visits = Number(await getStore({ name: 'visits', consistency: 'strong' }).get('count')) || 0;
    return json({ users: list, totals: { users: list.length, tickets: tb.length, shares: sb.length, visits } });
  }

  if (a === 'shares') {
    const { blobs } = await shares.list();
    const all = (await Promise.all(blobs.map(async b => { const v = await shares.get(b.key, { type: 'json' }).catch(() => null); return v && { id: b.key, created: v.created || 0, title: v.ticket?.title || '', who: v.ticket?.loggedBy || v.ticket?.letterboxd || '', template: v.ticket?.template || '' }; }))).filter(Boolean);
    all.sort((x, y) => y.created - x.created);
    return json({ shares: all.slice(0, 200) });
  }
  if (a === 'delete_share') {
    const id = String(body.id || ''); if (!SHARE_RE.test(id)) return json({ error: 'bad_id' }, 400);
    await shares.delete(id); await previews.delete(id);
    return json({ ok: true });
  }

  // everything below acts on one user
  const u = normUser(body.u);
  if (!USER_RE.test(u)) return json({ error: 'bad_user' }, 400);
  const user = await users.get(u, { type: 'json' });
  if (!user) return json({ error: 'not_found' }, 404);

  if (a === 'user_tickets') {
    const { blobs } = await tickets.list({ prefix: u + '/' });
    const all = (await Promise.all(blobs.map(b => tickets.get(b.key, { type: 'json' }).catch(() => null)))).filter(Boolean);
    all.sort((x, y) => (String(y.date) + String(y.time)).localeCompare(String(x.date) + String(x.time)));
    return json({ tickets: all });
  }
  if (a === 'delete_ticket') {
    const id = String(body.id || ''); if (!ID_RE.test(id)) return json({ error: 'bad_id' }, 400);
    await tickets.delete(u + '/' + id); return json({ ok: true });
  }
  if (a === 'make_private') { await users.setJSON(u, { ...user, public: false }); return json({ ok: true }); }
  if (a === 'remove_avatar') { await avatars.delete(u); await users.setJSON(u, { ...user, avatar: 0 }); return json({ ok: true }); }

  if (isAdmin(u)) return json({ error: 'admin_account' }, 403);   // the admin account can't be banned, reset or deleted from here
  if (a === 'reset_password') {
    const password = tempPassword(), { salt, hash } = await hashPassword(password);
    await users.setJSON(u, { ...user, salt, hash, since: Date.now() }); await fails.delete(u);
    return json({ password });
  }
  if (a === 'ban') {
    const banned = !!body.banned;
    await users.setJSON(u, { ...user, banned, public: banned ? false : user.public, since: banned ? Date.now() : user.since });
    return json({ ok: true, banned });
  }
  if (a === 'delete_user') {
    const { blobs } = await tickets.list({ prefix: u + '/' });
    await Promise.all(blobs.map(b => tickets.delete(b.key)));
    await users.delete(u); await avatars.delete(u); await fails.delete(u);
    return json({ ok: true });
  }
  return json({ error: 'bad_action' }, 400);
};

export const config = { path: '/api/admin' };
