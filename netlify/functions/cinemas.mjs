// Ticket Store: finds cinemas anywhere in the world by name or place, from OpenStreetMap (via Photon).
const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });

export default async (req) => {
  const url = new URL(req.url);
  const q = (url.searchParams.get('q') || '').trim().slice(0, 60);
  if (q.length < 2) return json({ cinemas: [] });
  const lang = { de: 'de', en: 'en', fr: 'fr' }[url.searchParams.get('lang')] || 'default';
  const api = new URL('https://photon.komoot.io/api/');
  api.searchParams.set('q', q); api.searchParams.set('limit', '20'); api.searchParams.set('lang', lang);
  api.searchParams.append('osm_tag', 'amenity:cinema');
  let r;
  try { r = await fetch(api, { headers: { 'user-agent': 'TicketStore/1.0 (+https://ticket-store.netlify.app)' } }); }
  catch { return json({ error: 'unreachable' }, 502); }
  if (!r.ok) return json({ error: 'unreachable', status: r.status }, 502);
  const data = await r.json().catch(() => null);
  const seen = new Set(), cinemas = [];
  for (const f of (data && data.features) || []) {
    const p = f.properties || {};
    if (!p.name) continue;
    const place = [p.district && p.district !== p.city ? p.district : '', p.city || p.county || p.state || ''].filter(Boolean).join(', ');
    const key = (p.name + '|' + place).toLowerCase();
    if (seen.has(key)) continue; seen.add(key);
    cinemas.push({ name: p.name, place, country: p.country || '', cc: (p.countrycode || '').toUpperCase() });
    if (cinemas.length >= 10) break;
  }
  return json({ cinemas }, 200, { 'cache-control': 'public, max-age=86400' });
};

export const config = { path: '/api/cinemas' };
