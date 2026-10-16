/** @jest-environment node */
import {
  rewriteLiveManifest,
  signedStreamUrl,
  validStreamSignature,
} from './live-proxy';

describe('live proxy authorization', () => {
  it('accepts only an unmodified, unexpired server signature', () => {
    const url = 'https://cdn.example/live/index.m3u8?token=a';
    const signed = new URL(signedStreamUrl(url), 'https://tintintv.test');
    const expires = Number(signed.searchParams.get('expires'));
    const token = signed.searchParams.get('token') || '';
    expect(validStreamSignature(url, expires, token)).toBe(true);
    expect(validStreamSignature('http://127.0.0.1', expires, token)).toBe(
      false
    );
    expect(validStreamSignature(url, expires + 1, token)).toBe(false);
    expect(validStreamSignature(url, 1, token)).toBe(false);
    expect(validStreamSignature(url, expires, '')).toBe(false);
  });

  it('rewrites variants, segments, keys and subtitles relative to final URL', () => {
    const expires = Math.floor(Date.now() / 1000) + 600;
    const manifest =
      '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="../key?id=1"\n#EXT-X-MEDIA:TYPE=SUBTITLES,URI="sub/list.m3u8"\nvideo/index.m3u8\nsegment.ts?token=a\n';
    const rewritten = rewriteLiveManifest(
      manifest,
      'https://cdn.example/live/master.m3u8',
      expires
    );
    for (const target of [
      'https://cdn.example/key?id=1',
      'https://cdn.example/live/sub/list.m3u8',
      'https://cdn.example/live/video/index.m3u8',
      'https://cdn.example/live/segment.ts?token=a',
    ]) {
      expect(rewritten).toContain(signedStreamUrl(target, expires));
    }
    expect(() =>
      rewriteLiveManifest(
        '#EXTM3U\nfile:///etc/passwd',
        'https://cdn.example/',
        expires
      )
    ).toThrow();
  });
});
