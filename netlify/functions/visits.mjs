// Ticket Store: counts visitors. Each browser is counted once (the page remembers it was counted).
import { getStore } from '@netlify/blobs';

export default async (req) => {
  const store = getStore({ name: 'visits', consistency: 'strong' });
  let count = Number(await store.get('count')) || 0;
  if (req.method === 'POST') {
    count += 1;
    await store.set('count', String(count));
  }
  return new Response(JSON.stringify({ count }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
};

export const config = { path: '/api/visits' };
