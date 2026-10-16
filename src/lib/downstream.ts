import { ApiSite, getConfig } from '@/lib/config';
import {
  cmsRequestHeaders,
  extractEpisodesFromPlayUrl,
  filterRelevantResults,
  parseDetail,
  parseDetailPageHtml,
  parseSearchList,
} from '@/lib/libretv/cms-parser';
import { fetchUpstream, getCache, setCache } from '@/lib/libretv/fetch-utils';
import { SearchResult } from '@/lib/types';
import { cleanHtmlTags } from '@/lib/utils';

const asSource = (site: ApiSite) => ({ ...site, url: site.api });

export function cmsUrl(site: ApiSite, params: Record<string, string>) {
  const url = new URL(site.api);
  Object.entries(params).forEach(([key, value]) =>
    url.searchParams.set(key, value)
  );
  return url.href;
}

export function mapSearchPage(data: unknown, site: ApiSite): SearchResult[] {
  const items = parseSearchList(data, asSource(site));
  const rows = (data as { list?: Record<string, unknown>[] }).list || [];
  return items
    .filter((item) => item.vodId && item.name)
    .map((item) => {
      const row =
        rows.find((value) => String(value.vod_id) === item.vodId) || {};
      return {
        id: item.vodId,
        title: item.name.trim().replace(/\s+/g, ' '),
        poster: item.pic || '',
        episodes: extractEpisodesFromPlayUrl(String(row.vod_play_url || '')),
        source: site.key,
        source_name: site.name,
        year: item.year?.match(/\d{4}/)?.[0] || 'unknown',
        desc: cleanHtmlTags(String(row.vod_content || '')),
        class: typeof row.vod_class === 'string' ? row.vod_class : undefined,
        type_name: item.typeName,
        douban_id: Number(row.vod_douban_id) || undefined,
      };
    });
}

// LibreTV's source deadline bounds all pages, including response bodies.
export async function searchFromApi(
  site: ApiSite,
  query: string,
  maxPages?: number
): Promise<SearchResult[]> {
  const cacheKey = JSON.stringify([
    'libretv:search',
    site.key,
    site.api,
    query,
  ]);
  const cached = getCache<SearchResult[]>(cacheKey);
  if (cached) return cached;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const configuredPages =
      maxPages ?? (await getConfig()).SiteConfig.SearchDownstreamMaxPage;
    const limit = Math.min(5, Math.max(1, Number(configuredPages) || 1));
    const fetchPage = async (page: number) => {
      const response = await fetchUpstream(
        cmsUrl(site, { ac: 'videolist', wd: query, pg: String(page) }),
        {
          headers: cmsRequestHeaders(),
          signal: controller.signal,
          timeoutMs: 8000,
        }
      );
      if (!response.ok) throw new Error('Source unavailable');
      return response.json();
    };
    const first = await fetchPage(1);
    const results = mapSearchPage(first, site);
    const pages = Math.min(limit, Math.max(1, Number(first.pagecount) || 1));
    const extra = await Promise.all(
      Array.from({ length: pages - 1 }, async (_, index) => {
        try {
          return mapSearchPage(await fetchPage(index + 2), site);
        } catch {
          return [];
        }
      })
    );
    const seen = new Set<string>();
    const merged = results.concat(...extra).filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
    const relevant = filterRelevantResults(
      merged.map((item) => ({ ...item, name: item.title })),
      query
    );
    setCache(cacheKey, relevant, 60000);
    return relevant;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function getDetailFromApi(
  site: ApiSite,
  id: string
): Promise<SearchResult> {
  const source = asSource(site);
  let result: SearchResult | undefined;
  try {
    const response = await fetchUpstream(
      cmsUrl(site, { ac: 'videolist', ids: id }),
      {
        headers: cmsRequestHeaders(),
        timeoutMs: 10000,
      }
    );
    if (!response.ok) throw new Error('Source unavailable');
    const data = await response.json();
    const detail = parseDetail(data, source);
    result = { ...mapSearchPage(data, site)[0], id, episodes: detail.episodes };
    if (result.episodes.length || !site.detail) return result;
  } catch (error) {
    if (!site.detail) throw error;
  }
  const response = await fetchUpstream(
    new URL(
      `/index.php/vod/detail/id/${encodeURIComponent(id)}.html`,
      site.detail
    ).href,
    {
      headers: cmsRequestHeaders(),
      timeoutMs: 10000,
    }
  );
  if (!response.ok) throw new Error('详情页请求失败');
  const detail = parseDetailPageHtml(await response.text(), source);
  return {
    id,
    source: site.key,
    source_name: site.name,
    title: result?.title || detail.videoInfo.title || '',
    poster: result?.poster || '',
    year: result?.year || 'unknown',
    desc: result?.desc || detail.videoInfo.desc,
    type_name: result?.type_name,
    douban_id: result?.douban_id,
    episodes: detail.episodes,
  };
}
