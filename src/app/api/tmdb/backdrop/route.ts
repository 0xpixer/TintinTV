import { NextResponse } from 'next/server';

export const runtime = 'edge';

type MediaType = 'movie' | 'tv';

interface TmdbSearchResult {
  backdrop_path?: string | null;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
}

function normalizeTitle(value: string): string {
  return value.toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
}

function chooseBackdrop(
  results: TmdbSearchResult[],
  title: string,
  year: string
): string | null {
  const normalizedTitle = normalizeTitle(title);
  let bestMatch: { score: number; path: string } | null = null;

  for (const result of results) {
    const path = result.backdrop_path;
    if (!path || !/^\/[\w./-]+\.(?:jpe?g|png|webp)$/i.test(path)) continue;

    const candidateTitles = [
      result.title,
      result.name,
      result.original_title,
      result.original_name,
    ]
      .filter((value): value is string => Boolean(value))
      .map(normalizeTitle);

    const exactTitle = candidateTitles.includes(normalizedTitle);
    const partialTitle = candidateTitles.some(
      (candidate) =>
        candidate.length > 2 &&
        (candidate.includes(normalizedTitle) ||
          normalizedTitle.includes(candidate))
    );
    if (!exactTitle && !partialTitle) continue;

    const date = result.release_date || result.first_air_date || '';
    const candidateYear = date.slice(0, 4);
    const score =
      (exactTitle ? 100 : 55) +
      (year && candidateYear === year ? 20 : year && candidateYear ? -30 : 0);

    if (!bestMatch || score > bestMatch.score) bestMatch = { score, path };
  }

  if (!bestMatch || bestMatch.score < 70) return null;
  return `https://image.tmdb.org/t/p/w1280${bestMatch.path}`;
}

function jsonResponse(
  data: { backdropUrl: string | null },
  cacheSeconds: number
) {
  const cacheControl = `public, max-age=300, s-maxage=${cacheSeconds}, stale-while-revalidate=86400`;
  const cdnCacheControl = `public, s-maxage=${cacheSeconds}, stale-while-revalidate=86400`;

  return NextResponse.json(data, {
    headers: {
      'Cache-Control': cacheControl,
      'CDN-Cache-Control': cdnCacheControl,
      'Vercel-CDN-Cache-Control': cdnCacheControl,
    },
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title')?.trim();
  const year = searchParams.get('year')?.trim() || '';
  const mediaType = searchParams.get('type');

  if (
    !title ||
    title.length > 200 ||
    !['movie', 'tv'].includes(mediaType || '')
  ) {
    return NextResponse.json(
      { error: 'Invalid title or media type' },
      { status: 400 }
    );
  }

  if (year && !/^\d{4}$/.test(year)) {
    return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
  }

  const accessToken = process.env.TMDB_API_READ_ACCESS_TOKEN;
  const apiKey = process.env.TMDB_API_KEY;
  if (!accessToken && !apiKey) return jsonResponse({ backdropUrl: null }, 300);

  const type = mediaType as MediaType;
  const url = new URL(`https://api.themoviedb.org/3/search/${type}`);
  url.searchParams.set('query', title);
  url.searchParams.set('language', 'zh-CN');
  url.searchParams.set('include_adult', 'false');
  if (year) {
    url.searchParams.set(
      type === 'movie' ? 'year' : 'first_air_date_year',
      year
    );
  }
  if (apiKey) url.searchParams.set('api_key', apiKey);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) return jsonResponse({ backdropUrl: null }, 300);

    const data = (await response.json()) as { results?: TmdbSearchResult[] };
    const backdropUrl = chooseBackdrop(data.results || [], title, year);
    return jsonResponse({ backdropUrl }, backdropUrl ? 86400 : 3600);
  } catch {
    return jsonResponse({ backdropUrl: null }, 300);
  }
}
