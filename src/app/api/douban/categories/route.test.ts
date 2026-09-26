/** @jest-environment node */
/* eslint-disable @typescript-eslint/no-var-requires */

import { getCacheTime } from '@/lib/config';
import { readDoubanCache, writeDoubanCache } from '@/lib/douban-server-cache';

const edge = require('next/dist/compiled/@edge-runtime/primitives');
Object.assign(global, {
  Request: edge.Request,
  Response: edge.Response,
  Headers: edge.Headers,
});

const { GET } = require('./route') as typeof import('./route');

jest.mock('@/lib/config', () => ({ getCacheTime: jest.fn() }));
jest.mock('@/lib/douban-server-cache', () => ({
  readDoubanCache: jest.fn(),
  writeDoubanCache: jest.fn(),
}));

const mockedGetCacheTime = getCacheTime as jest.MockedFunction<
  typeof getCacheTime
>;
const mockedReadCache = readDoubanCache as jest.MockedFunction<
  typeof readDoubanCache
>;

describe('Douban category route', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    mockedReadCache.mockResolvedValue(null);
  });

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

  it('serves shared cached data without calling Douban', async () => {
    mockedReadCache.mockResolvedValue({
      fresh: true,
      result: {
        code: 200,
        message: '获取成功',
        list: [{ id: '1', title: 'Cached', poster: '', rate: '', year: '' }],
      },
    });
    global.fetch = jest.fn() as typeof fetch;
    mockedGetCacheTime.mockResolvedValue(3600);

    const response = await GET(
      new Request(
        'https://example.com/api/douban/categories?kind=tv&category=tv&type=tv'
      )
    );

    expect(response.status).toBe(200);
    expect((await response.json()).list[0].title).toBe('Cached');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('falls back to the TV tag when the primary TV API times out', async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new Error('timeout'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          subjects: [
            { id: '2', title: 'Series', cover: 'poster.jpg', rate: '8.0' },
          ],
        }),
      }) as typeof fetch;
    mockedGetCacheTime.mockResolvedValue(3600);

    const response = await GET(
      new Request(
        'https://example.com/api/douban/categories?kind=tv&category=tv&type=tv'
      )
    );

    expect(response.status).toBe(200);
    expect((await response.json()).list[0].title).toBe('Series');
    expect((global.fetch as jest.Mock).mock.calls[1][0]).toContain(
      'tag=%E7%83%AD%E9%97%A8'
    );
    expect(writeDoubanCache).toHaveBeenCalled();
  });

  it('serves stale shared data when both Douban sources fail', async () => {
    jest.spyOn(console, 'error').mockImplementation();
    mockedReadCache.mockResolvedValue({
      fresh: false,
      result: {
        code: 200,
        message: '获取成功',
        list: [{ id: '3', title: 'Stale', poster: '', rate: '', year: '' }],
      },
    });
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error('timeout')) as typeof fetch;
    mockedGetCacheTime.mockResolvedValue(3600);

    const response = await GET(
      new Request(
        'https://example.com/api/douban/categories?kind=tv&category=tv&type=tv'
      )
    );

    expect(response.status).toBe(200);
    expect((await response.json()).list[0].title).toBe('Stale');
  });
});
