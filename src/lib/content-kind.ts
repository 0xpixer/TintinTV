import { SearchResult } from '@/lib/types';

export type ContentKind =
  | 'movie'
  | 'tv'
  | 'show'
  | 'animation-movie'
  | 'animation-series';

const CONTENT_KINDS: ContentKind[] = [
  'movie',
  'tv',
  'show',
  'animation-movie',
  'animation-series',
];

export function resolveContentKind(
  routeKind: string | null,
  searchType: string,
  detail: SearchResult | null
): ContentKind {
  if (CONTENT_KINDS.includes(routeKind as ContentKind)) {
    return routeKind as ContentKind;
  }

  const category = `${detail?.type_name || ''} ${detail?.class || ''}`;
  if (/动画|动漫/.test(category)) {
    return (detail?.episodes?.length || 0) > 1
      ? 'animation-series'
      : 'animation-movie';
  }
  if (/综艺|真人秀/.test(category)) return 'show';
  if (searchType === 'movie') return 'movie';
  if (searchType === 'tv') return 'tv';
  return (detail?.episodes?.length || 0) > 1 ? 'tv' : 'movie';
}
