/** @jest-environment node */
import { getConfig } from './config';
import {
  cmsUrl,
  getDetailFromApi,
  mapSearchPage,
  searchFromApi,
} from './downstream';
import { fetchUpstream } from './libretv/fetch-utils';

jest.mock('./config', () => ({ getConfig: jest.fn() }));
jest.mock('./libretv/fetch-utils', () => ({
  fetchUpstream: jest.fn(),
  getCache: jest.fn(),
  setCache: jest.fn(),
}));

const site = {
  key: 'legacy-key',
  name: 'Original source',
  api: 'https://example.com/api?token=keep',
  detail: 'https://example.com',
};
const signed = 'https://cdn.example/episode.m3u8?token=abc$def&expires=999';
const payload = {
  pagecount: 1,
  list: [
    {
      vod_id: 123,
      vod_name: 'Test',
      vod_year: '2025',
      vod_play_url: `Share$https://example.com/share/123$$$Episode 1$${signed}`,
    },
  ],
};

describe('LibreTV compatibility adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getConfig as jest.Mock).mockResolvedValue({
      SiteConfig: { SearchDownstreamMaxPage: 2 },
    });
  });
  it('keeps original IDs and full signed episode URLs', () => {
    expect(mapSearchPage(payload, site)[0]).toMatchObject({
      id: '123',
      source: 'legacy-key',
      episodes: [signed],
      year: '2025',
    });
    const url = new URL(cmsUrl(site, { ac: 'videolist', wd: 'a & b' }));
    expect(url.searchParams.get('token')).toBe('keep');
    expect(url.searchParams.get('wd')).toBe('a & b');
  });
  it('uses playable JSON before the optional HTML fallback', async () => {
    (fetchUpstream as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => payload,
    });
    expect((await getDetailFromApi(site, '123')).episodes).toEqual([signed]);
    expect(fetchUpstream).toHaveBeenCalledTimes(1);
  });
  it('keeps the first page when an additional page fails', async () => {
    (fetchUpstream as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...payload, pagecount: 100 }),
      })
      .mockRejectedValueOnce(new Error('unavailable'));
    expect(await searchFromApi(site, 'Test')).toHaveLength(1);
    expect(fetchUpstream).toHaveBeenCalledTimes(2);
  });
});
