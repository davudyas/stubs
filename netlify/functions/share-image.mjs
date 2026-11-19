// Ticket Store: the picture chat apps show for a shared ticket link.
import { getStore } from '@netlify/blobs';

const ID_RE = /^[A-Za-z0-9_-]{8,24}$/;

export default async (req) => {
  const id = new URL(req.url).searchParams.get('id') || '';
  if (!ID_RE.test(id)) return new Response('Not found', { status: 404 });
  const img = await getStore({ name: 'share-previews' }).get(id, { type: 'arrayBuffer' });
  if (!img) return new Response(null, { status: 302, headers: { location: '/og-default.jpg' } });
  return new Response(img, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' } });
};

export const config = { path: '/api/share-image' };
