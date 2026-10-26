import { normalizeTitle } from './libretv/cms-parser';
import { SearchResult } from './types';

function releaseYear(value: string): string | null {
  return value.match(/(?:19|20)\d{2}/)?.[0] || null;
}

export function matchingPlaybackSources(
  results: SearchResult[],
  title: string,
  year: string,
  type: string
): SearchResult[] {
  const normalizedTitle = normalizeTitle(title);
  if (!normalizedTitle) return [];

  const targetYear = releaseYear(year);
  return results.filter((result) => {
    const resultTitle = normalizeTitle(result.title);
    const exactTitle = resultTitle === normalizedTitle;
    const yearSuffix =
      !!targetYear && resultTitle === `${normalizedTitle}${targetYear}`;
    if (!exactTitle && !yearSuffix) return false;
    const sourceYear = releaseYear(result.year);
    if (targetYear && sourceYear !== targetYear && !(yearSuffix && !sourceYear))
      return false;
    if (!Array.isArray(result.episodes) || result.episodes.length === 0)
      return false;
    if (type === 'movie' && result.episodes.length !== 1) return false;
    if (type === 'tv' && result.episodes.length <= 1) return false;
    return true;
  });
}

export function nextUntriedPlaybackSource(
  sources: SearchResult[],
  tried: ReadonlySet<string>
): SearchResult | undefined {
  return sources.find((source) => !tried.has(`${source.source}:${source.id}`));
}

export function playbackProbePath(source: SearchResult): string {
  return `/api/play/manifest?${new URLSearchParams({
    source: source.source,
    id: source.id,
    episode: '0',
    filter: '0',
  }).toString()}`;
}
