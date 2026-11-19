// Ticket Store: stores a shared ticket and hands it back by its link id.
import { getStore } from '@netlify/blobs';

const MAX_BYTES = 450_000;
const ID_RE = /^[A-Za-z0-9_-]{8,24}$/;
const TEXT_KEYS = ['title', 'tagline', 'director', 'year', 'runtime', 'date', 'time', 'cinema', 'screen', 'platform', 'format', 'row', 'seat',
  'price', 'currency', 'rating', 'withWho', 'note', 'loggedBy', 'letterboxd', 'template', 'posterOpacity', 'posterX', 'posterY', 'serial'];
const BOOL_KEYS = ['usFormat', 'home', 'liked', 'grain', 'stamp'];
const COLOR_KEYS = ['paper', 'ink', 'accent'];
const STICKER_TYPES = new Set(['premiere', 'soldout', 'glasses', 'popcorn', 'heart', 'fav', 'twice', 'cried', 'tenten', 'datenight', 'spoilers', 'clapper']);

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });

function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const num = (v, lo, hi, d) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };

function clean(t) {
  const out = {};
  for (const k of TEXT_KEYS) if (t[k] != null) out[k] = String(t[k]).slice(0, k === 'note' ? 400 : 160);
  for (const k of BOOL_KEYS) if (t[k] != null) out[k] = !!t[k];
  for (const k of COLOR_KEYS) if (typeof t[k] === 'string' && /^#[0-9a-fA-F]{6}$/.test(t[k])) out[k] = t[k];
  if (typeof t.poster === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(t.poster)) out.poster = t.poster;
  if (Array.isArray(t.stickers)) {
    out.stickers = t.stickers.slice(0, 24).filter(s => s && STICKER_TYPES.has(s.type)).map((s, i) => ({
      id: 's' + i, type: s.type, side: s.side === 'back' ? 'back' : 'front',
      x: num(s.x, 0, 1600, 600), y: num(s.y, 0, 620, 300), rot: num(s.rot, -7, 7, 0), k: num(s.k, 0.3, 3, 1),
    }));
  }
  return out;
}

export default async (req) => {
  const store = getStore({ name: 'shared-tickets', consistency: 'strong' });
  if (req.method === 'POST') {
    const body = await req.text();
    if (body.length > MAX_BYTES) return json({ error: 'too_big' }, 413);
    let data;
    try { data = JSON.parse(body); } catch { return json({ error: 'bad_json' }, 400); }
    if (!data || typeof data !== 'object' || Array.isArray(data)) return json({ error: 'bad_ticket' }, 400);
    const id = newId();
    await store.setJSON(id, { ticket: clean(data), created: Date.now() });
    return json({ id }, 201);
  }
  const id = new URL(req.url).searchParams.get('id') || '';
  if (!ID_RE.test(id)) return json({ error: 'bad_id' }, 400);
  const saved = await store.get(id, { type: 'json' });
  if (!saved) return json({ error: 'not_found' }, 404);
  return json(saved.ticket, 200, { 'cache-control': 'public, max-age=3600' });
};

export const config = { path: '/api/share' };
