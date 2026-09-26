export type CacheStrategy = 'network-only' | 'network-first' | 'cache-first';

export function getCacheStrategyForRequest(
  method: string,
  urlInput: string
): CacheStrategy | null {
  if (method !== 'GET') return null;

  const url = new URL(urlInput);
  if (!url.protocol.startsWith('http')) return null;

  if (url.pathname.startsWith('/api/')) {
    return 'network-only';
  }

  if (url.pathname.startsWith('/_next/') || !/\.[^/]+$/.test(url.pathname)) {
    return 'network-first';
  }

  if (/\.(jpg|jpeg|png|gif|svg|ico|webp)$/i.test(url.pathname)) {
    return 'cache-first';
  }

  return 'cache-first';
}
