// Ticket Store: profile pictures.
import { getStore } from '@netlify/blobs';
import { normUser, USER_RE } from '../lib/account.mjs';

export default async (req) => {
  const u = normUser(new URL(req.url).searchParams.get('u'));
  if (!USER_RE.test(u)) return new Response('Not found', { status: 404 });
  const img = await getStore({ name: 'avatars' }).get(u, { type: 'arrayBuffer' });
  if (!img) return new Response('Not found', { status: 404, headers: { 'cache-control': 'no-store' } });
  // the page asks with ?v=<version>, so a new picture gets a new address
  return new Response(img, { headers: { 'content-type': 'image/jpeg', 'cache-control': 'public, max-age=31536000, immutable' } });
};

export const config = { path: '/api/avatar' };
