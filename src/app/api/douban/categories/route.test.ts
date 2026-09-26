/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-var-requires */

import { getCacheTime } from '@/lib/config';

const edge = require('next/dist/compiled/@edge-runtime/primitives');
Object.assign(global, {
  Request: edge.Request,
  Response: edge.Response,
  Headers: edge.Headers,
});

const { GET } = require('./route') as typeof import('./route');

jest.mock('@/lib/config', () => ({ getCacheTime: jest.fn() }));

const mockedGetCacheTime = getCacheTime as jest.MockedFunction<
  typeof getCacheTime
>;

describe('Douban category route', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
    jest.resetAllMocks();
  });

  it('falls back to the movie list and returns it when the primary movie API fails', async () => {
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new Error('primary unavailable'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subjects: [
            {
              id: '123',
              title: 'Test movie',
              cover: 'https://example.com/poster.jpg',
              rate: '8.2',
            },
          ],
        }),
      });
    global.fetch = fetchMock as typeof fetch;
    mockedGetCacheTime.mockResolvedValue(3600);

    const response = await GET(
      new Request(
        'https://example.com/api/douban/categories?kind=movie&category=%E7%83%AD%E9%97%A8&type=%E5%85%A8%E9%83%A8&limit=25&start=0'
      )
    );

    expect(response.status).toBe(200);
    expect((await response.json()).list).toEqual([
      {
        id: '123',
        title: 'Test movie',
        poster: 'https://example.com/poster.jpg',
        rate: '8.2',
        year: '',
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][0]).toContain('/j/search_subjects?');
  });

  it('serves movie data when cache configuration is unavailable', async () => {
    jest.spyOn(console, 'warn').mockImplementation();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ items: [] }),
    }) as typeof fetch;
    mockedGetCacheTime.mockRejectedValue(new Error('storage unavailable'));

    const response = await GET(
      new Request(
        'https://example.com/api/douban/categories?kind=movie&category=%E7%83%AD%E9%97%A8&type=%E5%85%A8%E9%83%A8'
      )
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toContain('s-maxage=7200');
  });
});
