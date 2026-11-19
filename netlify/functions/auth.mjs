// Ticket Store: sign up, log in, log out and "who am I", with username + password only.
import { stores, json, normUser, USER_RE, hashPassword, sameHash, createSession, tokenFrom, sessionFrom } from '../lib/account.mjs';

const MAX_FAILS = 6, LOCK_MS = 10 * 60 * 1000;

export default async (req) => {
  if (req.method !== 'POST') return json({ error: 'method' }, 405);
  let body; try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const action = body && body.action;
  const { users, sessions, fails } = stores();

  if (['me', 'set_public', 'change_password', 'delete_account'].includes(action)) {
    const sess = await sessionFrom(req);
    if (!sess) return json({ error: 'not_logged_in' }, 401);
    const { username, user } = sess;
    if (action === 'me') return json({ username, public: !!user.public });
    if (action === 'set_public') {
      await users.setJSON(username, { ...user, public: !!body.public });
      return json({ username, public: !!body.public });
    }
    const current = String(body.current || '');
    if (!sameHash((await hashPassword(current, user.salt)).hash, user.hash)) return json({ error: 'wrong_current' }, 403);
    if (action === 'change_password') {
      const next = String(body.password || '');
      if (next.length < 6 || next.length > 200) return json({ error: 'bad_password' }, 400);
      const { salt, hash } = await hashPassword(next);
      const since = Date.now();
      await users.setJSON(username, { ...user, salt, hash, since });
      await sessions.delete(sess.token);
      // every other device is logged out; this one gets a fresh session
      await new Promise(r => setTimeout(r, 5));
      return json({ username, token: await createSession(username), public: !!user.public });
    }
    if (action === 'delete_account') {
      const { tickets } = stores();
      const { blobs } = await tickets.list({ prefix: username + '/' });
      await Promise.all(blobs.map(b => tickets.delete(b.key)));
      await users.delete(username);
      await sessions.delete(sess.token);
      await fails.delete(username);
      return json({ ok: true });
    }
  }
  if (action === 'logout') {
    const token = tokenFrom(req); if (token) await sessions.delete(token);
    return json({ ok: true });
  }

  const username = normUser(body.username), password = String(body.password || '');
  if (!USER_RE.test(username)) return json({ error: 'bad_username' }, 400);
  if (password.length < 6 || password.length > 200) return json({ error: 'bad_password' }, 400);

  if (action === 'signup') {
    if (await users.get(username)) return json({ error: 'taken' }, 409);
    const { salt, hash } = await hashPassword(password);
    await users.setJSON(username, { username, salt, hash, created: Date.now() });
    return json({ username, token: await createSession(username) }, 201);
  }

  if (action === 'login') {
    const f = (await fails.get(username, { type: 'json' })) || { count: 0, until: 0 };
    if (f.until > Date.now()) return json({ error: 'locked', minutes: Math.ceil((f.until - Date.now()) / 60000) }, 429);
    const user = await users.get(username, { type: 'json' });
    const ok = user && sameHash((await hashPassword(password, user.salt)).hash, user.hash);
    if (!ok) {
      const count = f.count + 1;
      await fails.setJSON(username, { count: count >= MAX_FAILS ? 0 : count, until: count >= MAX_FAILS ? Date.now() + LOCK_MS : 0 });
      return json({ error: 'wrong' }, 401);
    }
    if (f.count) await fails.delete(username);
    return json({ username, token: await createSession(username) });
  }
  return json({ error: 'bad_action' }, 400);
};

export const config = { path: '/api/auth' };
