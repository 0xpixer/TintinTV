import { NextResponse } from 'next/server';

import { getCacheTime } from '@/lib/config';
import {
  getDoubanCategoryCacheKey,
  refreshDoubanCategory,
} from '@/lib/douban-categories.server';
import { readDoubanCache } from '@/lib/douban-server-cache';
import { DoubanResult } from '@/lib/types';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  // 获取参数
  const kind = searchParams.get('kind') || 'movie';
  const category = searchParams.get('category');
  const type = searchParams.get('type');
  const pageLimit = parseInt(searchParams.get('limit') || '20');
  const pageStart = parseInt(searchParams.get('start') || '0');

  // 验证参数
  if (!kind || !category || !type) {
    return NextResponse.json(
      { error: '缺少必要参数: kind 或 category 或 type' },
      { status: 400 }
    );
  }

  if (!['tv', 'movie'].includes(kind)) {
    return NextResponse.json(
      { error: 'kind 参数必须是 tv 或 movie' },
      { status: 400 }
    );
  }

  if (pageLimit < 1 || pageLimit > 100) {
    return NextResponse.json(
      { error: 'pageSize 必须在 1-100 之间' },
      { status: 400 }
    );
  }

  if (pageStart < 0) {
    return NextResponse.json(
      { error: 'pageStart 不能小于 0' },
      { status: 400 }
    );
  }

  const params = {
    kind: kind as 'movie' | 'tv',
    category,
    type,
    pageLimit,
    pageStart,
  };
  const cacheKey = getDoubanCategoryCacheKey(params);
  const cached = await readDoubanCache(cacheKey);
  if (cached?.fresh) return categoryResponse(cached.result);

  try {
    const response = await refreshDoubanCategory(params);
    return categoryResponse(response);
  } catch (error) {
    if (cached) return categoryResponse(cached.result);
    return NextResponse.json(
      { error: '获取豆瓣数据失败', details: (error as Error).message },
      { status: 500 }
    );
  }
}

async function categoryResponse(response: DoubanResult) {
  let cacheTime = 7200;
  try {
    cacheTime = await getCacheTime();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('读取豆瓣分类缓存时长失败，使用默认值:', error);
  }
  return NextResponse.json(response, {
    headers: {
      'Cache-Control': `public, max-age=300, s-maxage=${cacheTime}, stale-while-revalidate=86400`,
      'CDN-Cache-Control': `public, s-maxage=${cacheTime}, stale-while-revalidate=86400`,
      'Vercel-CDN-Cache-Control': `public, s-maxage=${cacheTime}, stale-while-revalidate=86400`,
    },
  });
}
