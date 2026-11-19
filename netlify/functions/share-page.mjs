// Ticket Store: /t/<id> gives chat apps a title and picture for a shared ticket, then sends people to the ticket.
import { getStore } from '@netlify/blobs';

const ID_RE = /^[A-Za-z0-9_-]{8,24}$/;
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export default async (req, context) => {
  const id = (context && context.params && context.params.id) || new URL(req.url).pathname.split('/').pop();
  const origin = new URL(req.url).origin;
  if (!ID_RE.test(id)) return Response.redirect(origin + '/', 302);
  const saved = await getStore({ name: 'shared-tickets', consistency: 'strong' }).get(id, { type: 'json' });
  if (!saved) return Response.redirect(origin + '/?t=' + id, 302);
  const t = saved.ticket || {};
  const who = (t.loggedBy || t.letterboxd || '').trim();
  const r = Number(t.rating) || 0;
  const starsTxt = r > 0 ? '★'.repeat(Math.floor(r)) + (r % 1 ? '½' : '') : '';
  const title = `${t.title || 'A film'}${t.year ? ' (' + t.year + ')' : ''}`;
  const desc = [starsTxt, who ? `A ticket from ${who}` : 'A ticket from Ticket Store', t.home ? 'watched at home' : (t.cinema ? 'at ' + t.cinema : '')].filter(Boolean).join(' · ');
  const target = '/?t=' + id;
  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">
<title>${esc(title)} · Ticket Store</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta property="og:type" content="website"><meta property="og:site_name" content="Ticket Store">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:image" content="${origin}/api/share-image?id=${id}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
<meta property="og:url" content="${origin}/t/${id}">
<meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${origin}/api/share-image?id=${id}">
<meta http-equiv="refresh" content="0; url=${target}">
<style>body{background:#1E0F17;color:#F3ECDF;font-family:system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0}a{color:#F2CD7E}</style>
</head><body><p><a href="${target}">Open the ticket</a></p><script>location.replace(${JSON.stringify(target)})</script></body></html>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=300' } });
};

export const config = { path: '/t/:id' };
