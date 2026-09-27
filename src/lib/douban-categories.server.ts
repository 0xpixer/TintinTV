import {
  buildDoubanFallbackUrl,
  getDoubanFallbackQuery,
} from './douban-fallback';
import { writeDoubanCache } from './douban-server-cache';
import { DoubanItem, DoubanResult } from './types';

export interface DoubanCategoryParams {
  kind: 'movie' | 'tv';
  category: string;
  type: string;
  pageLimit: number;
  pageStart: number;
}

interface DoubanCategoryApiResponse {
  items: Array<{
    id: string;
    title: string;
    card_subtitle: string;
    pic: {
      large: string;
      normal: string;
    };
    rating: {
      value: number;
    };
  }>;
}

interface DoubanMovieApiResponse {
  subjects: Array<{
    id: string;
    title: string;
    cover: string;
    rate: string;
  }>;
}

async function fetchDoubanData<T>(url: string): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        Referer: 'https://movie.douban.com/',
        Accept: 'application/json, text/plain, */*',
        Origin: 'https://movie.douban.com',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function getDoubanCategoryCacheKey(params: DoubanCategoryParams) {
  return [
    params.kind,
    params.category,
    params.type,
    params.pageLimit,
    params.pageStart,
  ]
    .map(encodeURIComponent)
    .join(':');
}

export async function fetchDoubanCategory(
  params: DoubanCategoryParams
): Promise<DoubanResult> {
  const target = `https://m.douban.com/rexxar/api/v2/subject/recent_hot/${params.kind}?start=${params.pageStart}&limit=${params.pageLimit}&category=${params.category}&type=${params.type}`;

  try {
    const data = await fetchDoubanData<DoubanCategoryApiResponse>(target);
    const list: DoubanItem[] = data.items.map((item) => ({
      id: item.id,
      title: item.title,
      poster: item.pic?.normal || item.pic?.large || '',
      rate: item.rating?.value ? item.rating.value.toFixed(1) : '',
      year: item.card_subtitle?.match(/(\d{4})/)?.[1] || '',
    }));

    return { code: 200, message: '获取成功', list };
  } catch (primaryError) {
    const fallbackQuery = getDoubanFallbackQuery(
      params.kind,
      params.category,
      params.type
    );
    if (!fallbackQuery) throw primaryError;

    try {
      const fallback = await fetchDoubanData<DoubanMovieApiResponse>(
        buildDoubanFallbackUrl(
          fallbackQuery,
          params.pageLimit,
          params.pageStart
        )
      );
      const list: DoubanItem[] = fallback.subjects.map((item) => ({
        id: item.id,
        title: item.title,
        poster: item.cover,
        rate: item.rate,
        year: '',
      }));
      if (list.length) {
        return { code: 200, message: '获取成功', list };
      }
    } catch {
      // Preserve the primary error so callers receive one stable failure.
    }

    throw primaryError;
  }
}

export async function refreshDoubanCategory(
  params: DoubanCategoryParams
): Promise<DoubanResult> {
  const result = await fetchDoubanCategory(params);
  await writeDoubanCache(getDoubanCategoryCacheKey(params), result);
  return result;
}
