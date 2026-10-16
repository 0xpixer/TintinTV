/** @jest-environment node */
import { Request, Response } from 'next/dist/compiled/@edge-runtime/primitives';

import { getAvailableApiSites } from '@/lib/config';
import { getDetailFromApi } from '@/lib/downstream';
import { fetchUpstreamWithMeta } from '@/lib/libretv/fetch-utils';

import { GET } from './route';

jest.mock('@/lib/config', () => ({ getAvailableApiSites: jest.fn() }));
jest.mock('@/lib/downstream', () => ({ getDetailFromApi: jest.fn() }));
jest.mock('@/lib/live-server', () => ({
  readLimitedText: (res: Response) => res.text(),
}));
jest.mock('@/lib/libretv/fetch-utils', () => ({
  fetchUpstreamWithMeta: jest.fn(),
  getCache: jest.fn(),
  setCache: jest.fn(),
}));

beforeAll(() => {
  global.Response = Response;
});
beforeEach(() => jest.clearAllMocks());

it('rejects forged direct targets before any source lookup or upstream request', async () => {
  const response = await GET(
    new Request(
      'https://tintintv.app/api/play/manifest?url=http://127.0.0.1&expires=9999999999&token=bad'
    )
  );
  expect(response.status).toBe(403);
  expect(fetchUpstreamWithMeta).not.toHaveBeenCalled();
  expect(getAvailableApiSites).not.toHaveBeenCalled();
});

it('only resolves episodes from configured sources, then filters the returned playlist', async () => {
  (getAvailableApiSites as jest.Mock).mockResolvedValue([
    { key: 'demo', api: 'https://cms.example/api' },
  ]);
  (getDetailFromApi as jest.Mock).mockResolvedValue({
    episodes: ['https://media.example/movie.m3u8'],
  });
  (fetchUpstreamWithMeta as jest.Mock).mockResolvedValue({
    finalUrl: 'https://media.example/redirected/index.m3u8',
    res: new Response(
      '#EXTM3U\n#EXT-X-DISCONTINUITY\n#EXTINF:5,\n/ads/a.ts\n#EXT-X-DISCONTINUITY\n#EXTINF:300,\nmovie.ts\n#EXT-X-ENDLIST'
    ),
  });
  const response = await GET(
    new Request(
      'https://tintintv.app/api/play/manifest?source=demo&id=1&episode=0'
    )
  );
  expect(response.status).toBe(200);
  const text = await response.text();
  expect(text).not.toContain('/ads/a.ts');
  expect(text).toContain('https://media.example/redirected/movie.ts');
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});

it.each(['episode=-1', 'episode=0.5', 'episode=abc', 'episode='])(
  'rejects invalid episode input %s',
  async (query) => {
    const response = await GET(
      new Request(
        `https://tintintv.app/api/play/manifest?source=demo&id=1&${query}`
      )
    );
    expect(response.status).toBe(400);
    expect(fetchUpstreamWithMeta).not.toHaveBeenCalled();
  }
);

it('rejects removed sources and out-of-range episodes', async () => {
  (getAvailableApiSites as jest.Mock).mockResolvedValue([]);
  expect(
    (
      await GET(
        new Request(
          'https://tintintv.app/api/play/manifest?source=missing&id=1&episode=0'
        )
      )
    ).status
  ).toBe(404);
  (getAvailableApiSites as jest.Mock).mockResolvedValue([
    { key: 'demo', api: 'https://cms.example/api' },
  ]);
  (getDetailFromApi as jest.Mock).mockResolvedValue({ episodes: [] });
  expect(
    (
      await GET(
        new Request(
          'https://tintintv.app/api/play/manifest?source=demo&id=1&episode=0'
        )
      )
    ).status
  ).toBe(404);
  expect(fetchUpstreamWithMeta).not.toHaveBeenCalled();
});
