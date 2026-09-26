/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps, no-console */

'use client';

import { ChevronRight, Play } from 'lucide-react';
import Link from 'next/link';
import React from 'react';
import { Suspense, useEffect, useState } from 'react';

import { getDoubanCategories } from '@/lib/douban.client';
import { DoubanItem } from '@/lib/types';
import { processImageUrlWithCache } from '@/lib/utils';

import ContinueWatching from '@/components/ContinueWatching';
import PageLayout from '@/components/PageLayout';
import ScrollableRow from '@/components/ScrollableRow';
import VideoCard from '@/components/VideoCard';

// Error boundary component
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('PWA Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className='min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900'>
          <div className='text-center'>
            <h1 className='text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4'>
              应用加载出错
            </h1>
            <p className='text-gray-600 dark:text-gray-400 mb-4'>
              请刷新页面重试
            </p>
            <button
              onClick={() => window.location.reload()}
              className='bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600 transition-colors'
            >
              刷新页面
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function HomeClient() {
  const [hotMovies, setHotMovies] = useState<DoubanItem[]>([]);
  const [hotTvShows, setHotTvShows] = useState<DoubanItem[]>([]);
  const [hotVarietyShows, setHotVarietyShows] = useState<DoubanItem[]>([]);
  const [loadingMovies, setLoadingMovies] = useState(true);
  const [loadingTvShows, setLoadingTvShows] = useState(true);
  const [loadingVarietyShows, setLoadingVarietyShows] = useState(true);
  const [heroBackdrop, setHeroBackdrop] = useState('');
  const [heroOverview, setHeroOverview] = useState('');
  const heroItem = hotMovies[0] ?? hotTvShows[0] ?? hotVarietyShows[0];
  const loading =
    !heroItem && (loadingMovies || loadingTvShows || loadingVarietyShows);
  const heroKind = hotMovies[0]
    ? '热门电影'
    : hotTvShows[0]
    ? '热门剧集'
    : '热门综艺';
  const heroPoster = heroItem
    ? processImageUrlWithCache(heroItem.poster, heroItem.id)
    : '';
  const heroImage = heroBackdrop
    ? processImageUrlWithCache(heroBackdrop)
    : heroPoster;

  useEffect(() => {
    if (!heroItem) return;

    let cancelled = false;
    setHeroBackdrop('');
    setHeroOverview('');

    const params = new URLSearchParams({
      title: heroItem.title,
      year: heroItem.year || '',
      type: hotMovies[0] ? 'movie' : 'tv',
    });

    fetch(`/api/tmdb/backdrop?${params}`)
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (
          data: {
            backdropUrl?: string | null;
            overview?: string | null;
          } | null
        ) => {
          if (!cancelled && data?.backdropUrl) {
            setHeroBackdrop(data.backdropUrl);
          }
          if (!cancelled && data?.overview) setHeroOverview(data.overview);
        }
      )
      .catch((error) => console.error('获取主视觉背景图失败:', error));

    return () => {
      cancelled = true;
    };
  }, [heroItem?.id, heroItem?.title, heroItem?.year, hotMovies]);

  // Add debugging for PWA
  useEffect(() => {
    console.log('HomeClient: Component mounted');
    console.log(
      'PWA Mode:',
      window.matchMedia('(display-mode: standalone)').matches
    );
    console.log('User Agent:', navigator.userAgent);

    // Check if running in PWA mode
    if (window.matchMedia('(display-mode: standalone)').matches) {
      console.log('PWA: Running in standalone mode');
    }

    // Add error boundary for PWA issues
    const handleError = (error: ErrorEvent) => {
      console.error('HomeClient: Error caught:', error);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('HomeClient: Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Ensure proper initialization for PWA
    const timer = setTimeout(() => {
      console.log('PWA: Initialization complete');

      // Check if content loaded properly
      if (hotMovies.length === 0 && hotTvShows.length === 0 && !loading) {
        console.warn('PWA: No content loaded, this might indicate an issue');
      }
    }, 3000);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener(
        'unhandledrejection',
        handleUnhandledRejection
      );
      clearTimeout(timer);
    };
  }, [hotMovies.length, hotTvShows.length, loading]);

  useEffect(() => {
    const fetchDoubanData = async () => {
      try {
        const requests = [
          getDoubanCategories({
            kind: 'movie',
            category: '热门',
            type: '全部',
          })
            .then((data) => {
              if (data.code === 200) setHotMovies(data.list.slice(0, 12));
            })
            .catch((error) => console.error('获取热门电影失败:', error))
            .finally(() => setLoadingMovies(false)),
          getDoubanCategories({ kind: 'tv', category: 'tv', type: 'tv' })
            .then((data) => {
              if (data.code === 200) setHotTvShows(data.list.slice(0, 12));
            })
            .catch((error) => console.error('获取热门剧集失败:', error))
            .finally(() => setLoadingTvShows(false)),
          getDoubanCategories({ kind: 'tv', category: 'show', type: 'show' })
            .then((data) => {
              if (data.code === 200) setHotVarietyShows(data.list.slice(0, 12));
            })
            .catch((error) => console.error('获取热门综艺失败:', error))
            .finally(() => setLoadingVarietyShows(false)),
        ];

        await Promise.all(requests);
      } catch (error) {
        console.error('获取豆瓣数据失败:', error);
      }
    };

    fetchDoubanData();
  }, []);

  return (
    <PageLayout>
      <div className='tv-home overflow-visible'>
        <div className='max-w-full mx-auto'>
          <section className='tv-hero relative mb-9 overflow-hidden bg-[#101114] text-white'>
            {heroItem && (
              <>
                <div
                  aria-hidden='true'
                  className='tv-hero-backdrop absolute inset-0'
                  style={{ backgroundImage: `url("${heroImage}")` }}
                />
                <div
                  aria-hidden='true'
                  className='tv-hero-art absolute inset-0'
                  style={{ backgroundImage: `url("${heroImage}")` }}
                />
              </>
            )}
            <div className='tv-hero-scrim absolute inset-0' />
            <div className='tv-hero-content relative'>
              {loading ? (
                <div
                  aria-label='正在加载推荐影片'
                  className='tv-hero-copy space-y-4'
                >
                  <div className='h-10 w-2/3 max-w-sm animate-pulse rounded bg-white/15' />
                  <div className='h-5 w-36 animate-pulse rounded bg-white/15' />
                </div>
              ) : heroItem ? (
                <>
                  <div className='tv-hero-copy'>
                    <p className='mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-white/65'>
                      {heroKind}
                    </p>
                    <h1 className='max-w-2xl break-words text-4xl font-semibold leading-tight sm:text-5xl'>
                      {heroItem.title}
                    </h1>
                    <p className='mt-3 flex items-center gap-3 text-sm font-medium text-white/75'>
                      {heroItem.year && <span>{heroItem.year}</span>}
                      {heroItem.rate && <span>豆瓣 {heroItem.rate}</span>}
                    </p>
                    {heroOverview && (
                      <p className='mt-4 line-clamp-3 max-w-xl text-sm leading-6 text-white/75'>
                        {heroOverview}
                      </p>
                    )}
                    <div className='mt-6 flex flex-wrap gap-3'>
                      <Link
                        href={`/play?title=${encodeURIComponent(
                          heroItem.title
                        )}&year=${encodeURIComponent(heroItem.year || '')}`}
                        className='inline-flex min-h-11 items-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-slate-950 transition-colors hover:bg-brand-100'
                      >
                        <Play className='h-4 w-4 fill-current' />
                        立即播放
                      </Link>
                    </div>
                  </div>
                  {heroBackdrop && (
                    <p className='mt-3 max-w-2xl text-xs leading-5 text-white/60'>
                      背景图片来自{' '}
                      <a
                        href='https://www.themoviedb.org/'
                        target='_blank'
                        rel='noreferrer'
                        className='underline underline-offset-2'
                      >
                        TMDB
                      </a>
                      。This product uses the TMDB API but is not endorsed or
                      certified by TMDB.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className='tv-hero-copy'>
                    <h1 className='text-4xl font-semibold leading-tight sm:text-5xl'>
                      找到今晚想看的
                    </h1>
                    <p className='mt-3 text-sm text-white/85'>
                      浏览电影、剧集和综艺。
                    </p>
                  </div>
                </>
              )}
            </div>
            {heroItem && (
              <Link
                href={`/play?title=${encodeURIComponent(
                  heroItem.title
                )}&year=${encodeURIComponent(heroItem.year || '')}`}
                aria-label={`播放 ${heroItem.title}`}
                className='tv-hero-play absolute left-1/2 top-1/2 z-10 flex h-[76px] w-[76px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/45 bg-black/30 text-white shadow-xl backdrop-blur-sm transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white'
              >
                <Play className='ml-1 h-7 w-7 fill-current' />
              </Link>
            )}
            <ContinueWatching placement='hero' />
          </section>

          <ContinueWatching className='tv-continue-mobile' />

          {/* 热门电影 */}
          <section className='mb-6'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-semibold text-slate-950 sm:text-2xl dark:text-white'>
                热门电影
              </h2>
              <Link
                href='/douban?type=movie'
                className='group flex items-center rounded-lg px-2 py-1 text-sm text-slate-500 transition-colors duration-300 hover:bg-slate-950/5 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
              >
                查看更多
                <ChevronRight className='w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300' />
              </Link>
            </div>
            <ScrollableRow>
              {loadingMovies
                ? // 加载状态显示现代骨架屏
                  Array.from({ length: 12 }).map((_, index) => (
                    <div
                      key={index}
                      className='min-w-[124px] w-[124px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0'
                    >
                      <div className='relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse'>
                        <div className='absolute inset-0 shimmer'></div>
                      </div>
                      <div className='mt-2 h-3 bg-slate-200 dark:bg-slate-800 rounded shimmer'></div>
                    </div>
                  ))
                : // 显示真实数据
                  hotMovies.map((movie, index) => (
                    <div
                      key={index}
                      className='min-w-[124px] w-[124px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0'
                    >
                      <VideoCard
                        from='douban'
                        title={movie.title}
                        poster={movie.poster}
                        douban_id={movie.id}
                        rate={movie.rate}
                        year={movie.year}
                      />
                    </div>
                  ))}
            </ScrollableRow>
          </section>

          {/* 热门剧集 */}
          <section className='mb-6'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-semibold text-slate-950 sm:text-2xl dark:text-white'>
                热门剧集
              </h2>
              <Link
                href='/douban?type=tv'
                className='group flex items-center rounded-lg px-2 py-1 text-sm text-slate-500 transition-colors duration-300 hover:bg-slate-950/5 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
              >
                查看更多
                <ChevronRight className='w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300' />
              </Link>
            </div>
            <ScrollableRow>
              {loadingTvShows
                ? // 加载状态显示现代骨架屏
                  Array.from({ length: 12 }).map((_, index) => (
                    <div
                      key={index}
                      className='min-w-[124px] w-[124px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0'
                    >
                      <div className='relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse'>
                        <div className='absolute inset-0 shimmer'></div>
                      </div>
                      <div className='mt-2 h-3 bg-slate-200 dark:bg-slate-800 rounded shimmer'></div>
                    </div>
                  ))
                : // 显示真实数据
                  hotTvShows.map((show, index) => (
                    <div
                      key={index}
                      className='min-w-[124px] w-[124px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0'
                    >
                      <VideoCard
                        from='douban'
                        title={show.title}
                        poster={show.poster}
                        douban_id={show.id}
                        rate={show.rate}
                        year={show.year}
                      />
                    </div>
                  ))}
            </ScrollableRow>
          </section>

          {/* 热门综艺 */}
          <section className='mb-6'>
            <div className='mb-4 flex items-center justify-between'>
              <h2 className='text-xl font-semibold text-slate-950 sm:text-2xl dark:text-white'>
                热门综艺
              </h2>
              <Link
                href='/douban?type=show'
                className='group flex items-center rounded-lg px-2 py-1 text-sm text-slate-500 transition-colors duration-300 hover:bg-slate-950/5 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
              >
                查看更多
                <ChevronRight className='w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform duration-300' />
              </Link>
            </div>
            <ScrollableRow>
              {loadingVarietyShows
                ? // 加载状态显示现代骨架屏
                  Array.from({ length: 12 }).map((_, index) => (
                    <div
                      key={index}
                      className='min-w-[124px] w-[124px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0'
                    >
                      <div className='relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse'>
                        <div className='absolute inset-0 shimmer'></div>
                      </div>
                      <div className='mt-2 h-3 bg-slate-200 dark:bg-slate-800 rounded shimmer'></div>
                    </div>
                  ))
                : // 显示真实数据
                  hotVarietyShows.map((show, index) => (
                    <div
                      key={index}
                      className='min-w-[124px] w-[124px] sm:min-w-[160px] sm:w-[160px] flex-shrink-0'
                    >
                      <VideoCard
                        from='douban'
                        title={show.title}
                        poster={show.poster}
                        douban_id={show.id}
                        rate={show.rate}
                        year={show.year}
                      />
                    </div>
                  ))}
            </ScrollableRow>
          </section>
        </div>
      </div>
    </PageLayout>
  );
}

export default function Home() {
  return (
    <Suspense>
      <ErrorBoundary>
        <HomeClient />
      </ErrorBoundary>
    </Suspense>
  );
}
