/** @jest-environment node */
import { validStreamSignature } from './live-proxy';
import { rewriteVodManifest, signedVodManifestUrl } from './vod-manifest';

const base = 'https://media.example.com/final/master.m3u8?token=abc';
const expires = Math.floor(Date.now() / 1000) + 3600;

it('signs extensionless variants and alternate audio while leaving HTTPS media direct', () => {
  const master =
    '#EXTM3U\n#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",URI="audio?id=2"\n#EXT-X-STREAM-INF:BANDWIDTH=1000\nvariant?id=1';
  const result = rewriteVodManifest(master, base, expires);
  expect(result).toContain(
    signedVodManifestUrl(
      'https://media.example.com/final/variant?id=1',
      expires
    )
  );
  expect(result).toContain(
    signedVodManifestUrl('https://media.example.com/final/audio?id=2', expires)
  );
  const media = rewriteVodManifest(
    '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key",IV=0x1\n#EXT-X-MAP:URI="init.mp4"\n#EXTINF:10,\nmovie.ts?x=1&y=2\n#EXT-X-ENDLIST',
    base,
    expires
  );
  expect(media).toContain('https://media.example.com/final/movie.ts?x=1&y=2');
  expect(media).toContain('URI="https://media.example.com/final/key"');
  expect(media).toContain('URI="https://media.example.com/final/init.mp4"');
  expect(media).not.toContain('/api/');
});

it('proxies HTTP segments to avoid mixed content, and rejects unsafe manifest targets', () => {
  expect(
    rewriteVodManifest(
      '#EXTM3U\n#EXTINF:4,\nhttp://media.example.com/a.ts\n#EXT-X-ENDLIST',
      base,
      expires
    )
  ).toContain('/api/live/stream?');
  for (const uri of [
    'http://127.0.0.1/x',
    'file:///etc/passwd',
    'https://user:pass@media.example.com/a',
  ]) {
    expect(() =>
      rewriteVodManifest(`#EXTM3U\n${uri}`, base, expires)
    ).toThrow();
  }
});

it('requires valid unexpired signatures, including the entire upstream query', () => {
  const url = new URL(
    signedVodManifestUrl(base, expires),
    'https://tintintv.app'
  );
  const token = url.searchParams.get('token') || '';
  expect(validStreamSignature(base, expires, token)).toBe(true);
  expect(validStreamSignature(base + 'bad', expires, token)).toBe(false);
  expect(validStreamSignature(base, 1, token)).toBe(false);
});

it('keeps all media and forwards disabled filtering to nested playlists', () => {
  const master = '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000\nvariant.m3u8';
  expect(rewriteVodManifest(master, base, expires, false)).toContain(
    '&filter=0'
  );
  const media =
    '#EXTM3U\n#EXT-X-DISCONTINUITY\n#EXTINF:5,\n/ads/a.ts\n#EXT-X-DISCONTINUITY\n#EXTINF:300,\nmovie.ts\n#EXT-X-ENDLIST';
  expect(rewriteVodManifest(media, base, expires, false)).toContain(
    'https://media.example.com/ads/a.ts'
  );
  expect(
    rewriteVodManifest(media, base, expires, false).match(
      /#EXT-X-DISCONTINUITY/g
    )
  ).toHaveLength(2);
});
