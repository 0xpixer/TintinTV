import { filterVodAds } from '@/lib/ad-filter';
import { isValidProxyUrl } from '@/lib/libretv/ssrf';
import { signedStreamUrl } from '@/lib/live-proxy';

export function signedVodManifestUrl(
  url: string,
  expires: number,
  filter = true
) {
  return (
    signedStreamUrl(url, expires).replace(
      '/api/live/stream?',
      '/api/play/manifest?'
    ) + (filter ? '' : '&filter=0')
  );
}

// Only playlists pass through the server. HTTPS media stays direct, including
// encrypted keys and initialization segments, avoiding a full-video relay bill.
export function rewriteVodManifest(
  content: string,
  base: string,
  expires: number,
  filter = true
) {
  const filtered = (filter ? filterVodAds(content) : content).replace(
    /\r\n/g,
    '\n'
  );
  const master = /^#EXT-X-STREAM-INF:/m.test(filtered);
  const rewrite = (uri: string, playlist: boolean) => {
    const target = new URL(uri, base).href;
    if (!isValidProxyUrl(target)) throw new Error('Unsafe media target');
    if (playlist) return signedVodManifestUrl(target, expires, filter);
    return target.startsWith('https:')
      ? target
      : signedStreamUrl(target, expires);
  };
  return filtered
    .split('\n')
    .map((line) => {
      if (!line.trim()) return line;
      if (line.startsWith('#')) {
        const playlist = /^#EXT-X-(?:MEDIA:|I-FRAME-STREAM-INF:)/.test(line);
        return line.replace(
          /URI="([^"]+)"/g,
          (_, uri: string) => `URI="${rewrite(uri, playlist)}"`
        );
      }
      return rewrite(line.trim(), master);
    })
    .join('\n');
}
