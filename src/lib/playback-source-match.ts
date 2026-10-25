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
    if (normalizeTitle(result.title) !== normalizedTitle) return false;
    if (targetYear && releaseYear(result.year) !== targetYear) return false;
    if (!Array.isArray(result.episodes) || result.episodes.length === 0)
      return false;
    if (type === 'movie' && result.episodes.length !== 1) return false;
    if (type === 'tv' && result.episodes.length <= 1) return false;
    return true;
  });
}
