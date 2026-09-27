export interface DoubanFallbackQuery {
  type: 'movie' | 'tv';
  tag: string;
  sort: 'recommend' | 'time' | 'rank';
}

const TV_TAGS: Record<string, string> = {
  tv: '热门',
  tv_domestic: '国产剧',
  tv_american: '美剧',
  tv_japanese: '日剧',
  tv_korean: '韩剧',
  tv_animation: '日本动画',
  tv_documentary: '纪录片',
};

export function getDoubanFallbackQuery(
  kind: string,
  category: string,
  type: string
): DoubanFallbackQuery | null {
  if (kind === 'movie') {
    const regionalTag = type !== '全部' ? type : null;

    if (category === '最新') {
      return {
        type: 'movie',
        tag: regionalTag || '热门',
        sort: 'time',
      };
    }

    if (category === '豆瓣高分') {
      return {
        type: 'movie',
        tag: regionalTag || '豆瓣高分',
        sort: 'rank',
      };
    }

    return {
      type: 'movie',
      tag: regionalTag || (category === '冷门佳片' ? category : '热门'),
      sort: 'recommend',
    };
  }

  if (kind !== 'tv') return null;

  if (category === 'show') {
    return { type: 'tv', tag: '综艺', sort: 'recommend' };
  }

  if (category === 'tv') {
    return {
      type: 'tv',
      tag: TV_TAGS[type] || '热门',
      sort: 'recommend',
    };
  }

  return null;
}

export function buildDoubanFallbackUrl(
  query: DoubanFallbackQuery,
  pageLimit: number,
  pageStart: number
): string {
  const url = new URL('https://movie.douban.com/j/search_subjects');
  url.search = new URLSearchParams({
    type: query.type,
    tag: query.tag,
    sort: query.sort,
    page_limit: String(pageLimit),
    page_start: String(pageStart),
  }).toString();
  return url.toString();
}
