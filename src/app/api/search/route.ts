import { NextResponse } from 'next/server';

import { getAvailableApiSites, getCacheTime, getConfig } from '@/lib/config';
import { searchFromApi } from '@/lib/downstream';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');

  if (!query) {
    const cacheTime = await getCacheTime();
    return NextResponse.json(
      { results: [] },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}`,
        },
      }
    );
  }

  if (query.length > 100)
    return NextResponse.json({ error: '搜索关键词过长' }, { status: 400 });

  try {
    const [apiSites, config] = await Promise.all([
      getAvailableApiSites(),
      getConfig(),
    ]);
    const searchPromises = apiSites.map((site) =>
      searchFromApi(site, query, config.SiteConfig.SearchDownstreamMaxPage)
    );
    const results = await Promise.all(searchPromises);
    const flattenedResults = results.flat();
    const cacheTime = await getCacheTime();

    return NextResponse.json(
      { results: flattenedResults },
      {
        headers: {
          'Cache-Control': `public, max-age=${cacheTime}`,
        },
      }
    );
  } catch (error) {
    return NextResponse.json({ error: '搜索失败' }, { status: 500 });
  }
}
