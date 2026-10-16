import { getAvailableApiSites } from '@/lib/config';
import { getDetailFromApi } from '@/lib/downstream';
import {
  fetchUpstreamWithMeta,
  getCache,
  setCache,
} from '@/lib/libretv/fetch-utils';
import { validStreamSignature } from '@/lib/live-proxy';
import { readLimitedText } from '@/lib/live-server';
import { SearchResult } from '@/lib/types';
import { rewriteVodManifest } from '@/lib/vod-manifest';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  let url = sp.get('url') || '';
  let expires = Number(sp.get('expires'));
  try {
    if (sp.has('url')) {
      if (!validStreamSignature(url, expires, sp.get('token') || ''))
        return new Response('Invalid manifest token', { status: 403 });
    } else {
      const id = sp.get('id') || '';
      const episodeText = sp.get('episode') || '';
      const episode = Number(episodeText);
      if (
        !/^[\w-]+$/.test(id) ||
        !/^\d+$/.test(episodeText) ||
        !Number.isSafeInteger(episode)
      )
        return new Response('Invalid episode', { status: 400 });
      const site = (await getAvailableApiSites()).find(
        (s) => s.key === sp.get('source')
      );
      if (!site) return new Response('Source unavailable', { status: 404 });
      const key = JSON.stringify(['ad-filter:detail', site.key, site.api, id]);
      let detail = getCache<SearchResult>(key);
      if (!detail) {
        detail = await getDetailFromApi(site, id);
        setCache(key, detail, 60000);
      }
      url = detail.episodes[episode];
      if (!url) return new Response('Episode unavailable', { status: 404 });
      expires = Math.floor(Date.now() / 1000) + 6 * 60 * 60;
    }
    const { res, finalUrl } = await fetchUpstreamWithMeta(url, {
      timeoutMs: 12000,
      signal: request.signal,
    });
    if (!res.ok) {
      await res.body?.cancel();
      return new Response('Playlist unavailable', { status: 502 });
    }
    const content = await readLimitedText(res, 1024 * 1024);
    if (!content.trimStart().startsWith('#EXTM3U'))
      return new Response('Invalid playlist', { status: 502 });
    return new Response(
      rewriteVodManifest(
        content.trimStart(),
        finalUrl,
        expires,
        sp.get('filter') !== '0'
      ),
      {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'private, no-store',
        },
      }
    );
  } catch {
    return new Response('Playlist temporarily unavailable', { status: 502 });
  }
}
