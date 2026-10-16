import { fetchUpstreamWithMeta } from '@/lib/libretv/fetch-utils';
import { rewriteLiveManifest, validStreamSignature } from '@/lib/live-proxy';
import { readLimitedText } from '@/lib/live-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const url = sp.get('url') || '';
  const expires = Number(sp.get('expires'));
  if (!validStreamSignature(url, expires, sp.get('token') || ''))
    return new Response('Invalid stream token', { status: 403 });
  try {
    const headers: Record<string, string> = {};
    const range = request.headers.get('range');
    if (range && /^bytes=\d*-\d*$/.test(range)) headers.Range = range;
    const { res, finalUrl } = await fetchUpstreamWithMeta(url, {
      headers,
      signal: request.signal,
      timeoutMs: 15000,
    });
    if (!res.ok) {
      await res.body?.cancel();
      return new Response('Stream unavailable', { status: 502 });
    }
    const type = res.headers.get('content-type') || 'application/octet-stream';
    const manifest = /mpegurl/i.test(type) || /\.m3u8?(?:\?|$)/i.test(finalUrl);
    if (manifest) {
      const text = await readLimitedText(res, 1024 * 1024);
      if (!text.trimStart().startsWith('#EXTM3U'))
        return new Response('Invalid playlist', { status: 502 });
      return new Response(rewriteLiveManifest(text, finalUrl, expires), {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'private, no-store',
        },
      });
    }
    if (/text\/html|application\/json/i.test(type)) {
      await res.body?.cancel();
      return new Response('Invalid media', { status: 502 });
    }
    const responseHeaders = new Headers({
      'Content-Type': type,
      'Cache-Control': 'private, max-age=30',
    });
    for (const name of ['content-range', 'accept-ranges']) {
      const value = res.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    let bytes = 0;
    const limit = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        bytes += chunk.byteLength;
        if (bytes > 32 * 1024 * 1024)
          throw new Error('Media segment too large');
        controller.enqueue(chunk);
      },
    });
    return new Response(res.body?.pipeThrough(limit), {
      status: res.status,
      headers: responseHeaders,
    });
  } catch {
    return new Response('Stream temporarily unavailable', { status: 502 });
  }
}
