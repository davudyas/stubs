// Ticket Store: asks TMDB on the site's behalf so the key stays on Netlify, never in the page.
// Set the key in Netlify: Project configuration > Environment variables > TMDB_KEY.
const ALLOWED_PARAMS = new Set(['query', 'year', 'first_air_date_year', 'include_adult', 'append_to_response', 'include_image_language', 'language', 'page']);
// films and TV series (a series, and one of its seasons for the episode list)
const ALLOWED_PATH = /^\/(search\/(movie|tv)|movie\/\d{1,9}|tv\/\d{1,9}(\/season\/\d{1,3})?)$/;

const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });

export default async (req) => {
  const key = ((globalThis.Netlify && Netlify.env.get('TMDB_KEY')) || process.env.TMDB_KEY || '').trim();
  const url = new URL(req.url);

  if (url.searchParams.has('ping')) return json({ ready: !!key }, 200, { 'cache-control': 'no-store' });
  if (!key) return json({ error: 'no_key' }, 503);

  const path = url.searchParams.get('path') || '';
  if (!ALLOWED_PATH.test(path)) return json({ error: 'bad_path' }, 400);

  const target = new URL('https://api.themoviedb.org/3' + path);
  for (const [k, v] of url.searchParams) if (ALLOWED_PARAMS.has(k)) target.searchParams.set(k, v.slice(0, 200));
  const headers = { accept: 'application/json' };
  if (key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + key; else target.searchParams.set('api_key', key);

  try {
    const r = await fetch(target, { headers });
    const body = await r.text();
    if (r.status === 401) return json({ error: 'bad_key' }, 502);
    return new Response(body, { status: r.status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': r.ok ? 'public, max-age=3600' : 'no-store' } });
  } catch (e) {
    return json({ error: 'unreachable' }, 502);
  }
};

export const config = { path: '/api/tmdb' };
