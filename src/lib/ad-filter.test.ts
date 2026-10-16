import { filterVodAds } from './ad-filter';

const movie = [
  '#EXTM3U',
  '#EXT-X-TARGETDURATION:10',
  '#EXT-X-DISCONTINUITY',
  '#EXTINF:5,',
  'ads/intro.ts',
  '#EXT-X-DISCONTINUITY',
  '#EXTINF:10,',
  'movie-1.ts',
  '#EXT-X-DISCONTINUITY',
  '#EXTINF:10,',
  'movie-2.ts',
  '#EXT-X-ENDLIST',
].join('\n');

it('removes ad media but preserves real timeline boundaries and end marker', () => {
  const result = filterVodAds(movie);
  expect(result).not.toContain('ads/intro.ts');
  expect(result).toContain('movie-1.ts');
  expect(result).toContain('movie-2.ts');
  expect(result.match(/#EXT-X-DISCONTINUITY/g)).toHaveLength(1);
  expect(result).toContain('#EXT-X-ENDLIST');
});

it.each([
  movie.replace('#EXT-X-ENDLIST', ''),
  movie.replace('#EXTM3U', '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key.bin"'),
  movie.replace('#EXTM3U', '#EXTM3U\n#EXT-X-BYTERANGE:100'),
  '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=1000\nvariant.m3u8',
])(
  'leaves live, implicit encryption/byte ranges and master playlists intact',
  (input) => {
    expect(filterVodAds(input)).toBe(input);
  }
);

it('preserves end-of-stream when the last group is an ad', () => {
  const input = movie.replace('movie-2.ts', 'ads/tail.ts');
  const result = filterVodAds(input);
  expect(result).not.toContain('ads/tail.ts');
  expect(result).toContain('#EXT-X-ENDLIST');
});

it('normalizes CRLF and preserves explicit encryption and initialization', () => {
  const input = movie.replace(
    '#EXTM3U',
    '#EXTM3U\n#EXT-X-KEY:METHOD=AES-128,URI="key.bin",IV=0x1\n#EXT-X-MAP:URI="init.mp4"'
  );
  const result = filterVodAds(input.replace(/\n/g, '\r\n'));
  expect(result).not.toContain('ads/intro.ts');
  expect(result).toContain('IV=0x1');
  expect(result).toContain('init.mp4');
});
