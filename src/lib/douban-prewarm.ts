import {
  DoubanCategoryParams,
  refreshDoubanCategory,
} from './douban-categories.server';

const PAGE_LIMIT = 25;
const MAX_CONCURRENCY = 2;

const movieQueries: DoubanCategoryParams[] = [
  '热门',
  '最新',
  '豆瓣高分',
  '冷门佳片',
].map((category) => ({
  kind: 'movie',
  category,
  type: '全部',
  pageLimit: PAGE_LIMIT,
  pageStart: 0,
}));

const movieRegionQueries: DoubanCategoryParams[] = [
  '华语',
  '欧美',
  '韩国',
  '日本',
].map((type) => ({
  kind: 'movie',
  category: '热门',
  type,
  pageLimit: PAGE_LIMIT,
  pageStart: 0,
}));

const tvQueries: DoubanCategoryParams[] = [
  'tv',
  'tv_domestic',
  'tv_american',
  'tv_japanese',
  'tv_korean',
  'tv_animation',
  'tv_documentary',
].map((type) => ({
  kind: 'tv',
  category: 'tv',
  type,
  pageLimit: PAGE_LIMIT,
  pageStart: 0,
}));

const showQueries: DoubanCategoryParams[] = [
  'show',
  'show_domestic',
  'show_foreign',
].map((type) => ({
  kind: 'tv',
  category: 'show',
  type,
  pageLimit: PAGE_LIMIT,
  pageStart: 0,
}));

export const DOUBAN_PREWARM_QUERIES = [
  ...movieQueries,
  ...movieRegionQueries,
  ...tvQueries,
  ...showQueries,
];

export interface DoubanPrewarmSummary {
  total: number;
  succeeded: number;
  failed: number;
  storedItems: number;
}

export async function prewarmDoubanCategories(
  refresh: (
    params: DoubanCategoryParams
  ) => ReturnType<typeof refreshDoubanCategory> = refreshDoubanCategory
): Promise<DoubanPrewarmSummary> {
  let nextIndex = 0;
  let succeeded = 0;
  let failed = 0;
  let storedItems = 0;

  const worker = async () => {
    while (nextIndex < DOUBAN_PREWARM_QUERIES.length) {
      const query = DOUBAN_PREWARM_QUERIES[nextIndex++];
      try {
        const result = await refresh(query);
        succeeded += 1;
        storedItems += result.list.length;
      } catch {
        failed += 1;
      }
    }
  };

  await Promise.all(
    Array.from(
      { length: Math.min(MAX_CONCURRENCY, DOUBAN_PREWARM_QUERIES.length) },
      () => worker()
    )
  );

  return {
    total: DOUBAN_PREWARM_QUERIES.length,
    succeeded,
    failed,
    storedItems,
  };
}
