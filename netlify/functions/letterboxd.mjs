// Ticket Store: reads someone's public Letterboxd diary feed so the page can turn entries into tickets.
const USER_RE = /^[A-Za-z0-9_]{2,30}$/;
const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
const decode = s => String(s || '')
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&([a-z]+);/gi, (m, n) => ENT[n.toLowerCase()] ?? m);
const tag = (xml, name) => {
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`));
  if (!m) return '';
  return m[1].replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1').trim();
};
function reviewText(descHtml) {
  const html = decode(descHtml.replace(/^<!\[CDATA\[|\]\]>$/g, ''));
  const paras = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => m[1])
    .filter(p => !/<img/i.test(p))
    .map(p => decode(p.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '')).trim())
    .filter(p => p && !/^Watched on /i.test(p) && !/^This review may contain spoilers/i.test(p));
  return paras.join('\n').slice(0, 600);
}

export function parseFeed(xml) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => m[1]);
  const out = [];
  for (const it of items) {
    const title = decode(tag(it, 'letterboxd:filmTitle'));
    if (!title) continue; // lists and other non-diary items
    const rating = parseFloat(tag(it, 'letterboxd:memberRating'));
    out.push({
      guid: tag(it, 'guid'),
      title, year: tag(it, 'letterboxd:filmYear'),
      watched: tag(it, 'letterboxd:watchedDate'),
      rating: Number.isFinite(rating) ? rating : 0,
      liked: /^yes$/i.test(tag(it, 'letterboxd:memberLike')),
      rewatch: /^yes$/i.test(tag(it, 'letterboxd:rewatch')),
      tmdbId: tag(it, 'tmdb:movieId'),
      review: reviewText(tag(it, 'description')),
      link: tag(it, 'link'),
    });
  }
  return out;
}

export default async (req) => {
  const u = (new URL(req.url).searchParams.get('u') || '').trim().replace(/^@/, '');
  if (!USER_RE.test(u)) return json({ error: 'bad_username' }, 400);
  let r;
  try {
    r = await fetch(`https://letterboxd.com/${encodeURIComponent(u)}/rss/`, {
      headers: { 'user-agent': 'TicketStore/1.0 (+https://ticket-store.netlify.app)', accept: 'application/rss+xml, application/xml;q=0.9, */*;q=0.5' },
    });
  } catch { return json({ error: 'unreachable' }, 502); }
  if (r.status === 404) return json({ error: 'not_found' }, 404);
  if (!r.ok) return json({ error: 'unreachable', status: r.status }, 502);
  const xml = await r.text();
  if (!xml.includes('<rss')) return json({ error: 'unreachable' }, 502);
  return json({ username: u, entries: parseFeed(xml) }, 200, { 'cache-control': 'public, max-age=300' });
};

export const config = { path: '/api/letterboxd' };
