'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useRef, useState } from 'react';

import { getDoubanCategories } from '@/lib/douban.client';
import { DoubanItem, DoubanResult } from '@/lib/types';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';
import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';

type AnimationView = 'movie' | 'series';

const PAGE_SIZE = 24;
const CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function readCache(view: AnimationView): DoubanItem[] | null {
  try {
    const value = localStorage.getItem(`tintintv_animation_${view}_v1`);
    if (!value) return null;
    const cache = JSON.parse(value) as { savedAt: number; list: DoubanItem[] };
    if (
      !cache.savedAt ||
      Date.now() - cache.savedAt > CACHE_MAX_AGE ||
      !Array.isArray(cache.list)
    ) {
      return null;
    }
    return cache.list;
  } catch {
    return null;
  }
}

function writeCache(view: AnimationView, list: DoubanItem[]) {
  try {
    localStorage.setItem(
      `tintintv_animation_${view}_v1`,
      JSON.stringify({ savedAt: Date.now(), list })
    );
  } catch {
    // Storage is optional; the network result is still displayed.
  }
}

async function fetchAnimationPage(view: AnimationView, start: number) {
  let data: DoubanResult;
  if (view === 'series') {
    data = await getDoubanCategories({
      kind: 'tv',
      category: 'tv',
      type: 'tv_animation',
      pageLimit: PAGE_SIZE,
      pageStart: start,
    });
  } else {
    const params = new URLSearchParams({
      type: 'movie',
      tag: '动画',
      pageSize: String(PAGE_SIZE),
      pageStart: String(start),
    });
    const response = await fetch(`/api/douban?${params}`);
    if (!response.ok) throw new Error('动画电影加载失败');
    data = (await response.json()) as DoubanResult;
  }

  if (data.code !== 200 || !Array.isArray(data.list)) {
    throw new Error(data.message || '动画内容加载失败');
  }
  return data.list;
}

function AnimationPageClient() {
  const searchParams = useSearchParams();
  const view: AnimationView =
    searchParams.get('view') === 'series' ? 'series' : 'movie';
  const [displayView, setDisplayView] = useState<AnimationView | null>(null);
  const [items, setItems] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextStart, setNextStart] = useState(0);
  const [error, setError] = useState('');
  const [moreError, setMoreError] = useState('');
  const requestIdRef = useRef(0);

  const loadFirstPage = useCallback(async (selectedView: AnimationView) => {
    const requestId = ++requestIdRef.current;
    const cached = readCache(selectedView);
    setDisplayView(selectedView);
    setItems(cached || []);
    setHasMore(cached?.length === PAGE_SIZE);
    setNextStart(cached?.length || 0);
    setLoading(!cached?.length);
    setLoadingMore(false);
    setError('');
    setMoreError('');

    try {
      const list = await fetchAnimationPage(selectedView, 0);
      if (requestId !== requestIdRef.current) return;
      if (list.length || !cached?.length) {
        setItems(list);
        setHasMore(list.length === PAGE_SIZE);
        setNextStart(list.length);
      }
      if (list.length) writeCache(selectedView, list);
    } catch {
      if (requestId === requestIdRef.current && !cached?.length) {
        setError('内容暂时无法加载，请稍后重试。');
        setHasMore(false);
      }
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadFirstPage(view);
    return () => {
      requestIdRef.current += 1;
    };
  }, [view, loadFirstPage]);

  const loadMore = async () => {
    if (loading || loadingMore || !hasMore || displayView !== view) return;
    const requestId = requestIdRef.current;
    const start = nextStart;
    setLoadingMore(true);
    setMoreError('');
    try {
      const list = await fetchAnimationPage(view, start);
      if (requestId !== requestIdRef.current) return;
      setItems((current) => {
        const existing = new Set(current.map((item) => item.id));
        return [...current, ...list.filter((item) => !existing.has(item.id))];
      });
      setNextStart(start + list.length);
      setHasMore(list.length === PAGE_SIZE);
    } catch {
      if (requestId === requestIdRef.current) {
        setMoreError('加载失败，请重试。');
      }
    } finally {
      if (requestId === requestIdRef.current) setLoadingMore(false);
    }
  };

  const visibleItems = displayView === view ? items : [];
  const showSkeletons = displayView !== view || loading;

  return (
    <PageLayout activePath='/animation'>
      <div className='tv-library overflow-visible'>
        <h1 className='mb-6 text-3xl font-semibold sm:mb-8 sm:text-5xl'>
          动画
        </h1>
        <nav className='tv-filters' aria-label='动画分类'>
          <div className='inline-flex rounded-lg bg-white/10 p-1'>
            {(
              [
                {
                  href: '/animation?view=movie',
                  label: '动画电影',
                  value: 'movie',
                },
                {
                  href: '/animation?view=series',
                  label: '动漫剧集',
                  value: 'series',
                },
              ] as const
            ).map((option) => (
              <Link
                key={option.value}
                href={option.href}
                aria-current={view === option.value ? 'page' : undefined}
                className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                  view === option.value
                    ? 'bg-white text-[#101114]'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {option.label}
              </Link>
            ))}
          </div>
        </nav>

        <div className='mt-8 grid grid-cols-3 gap-x-2 gap-y-12 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] sm:gap-x-8 sm:gap-y-20 sm:px-2'>
          {showSkeletons
            ? Array.from({ length: PAGE_SIZE }, (_, index) => (
                <DoubanCardSkeleton key={index} />
              ))
            : visibleItems.map((item) => (
                <div key={item.id} className='w-full'>
                  <VideoCard
                    from='douban'
                    title={item.title}
                    poster={item.poster}
                    douban_id={item.id}
                    rate={item.rate}
                    year={item.year}
                  />
                </div>
              ))}
        </div>

        {!showSkeletons && error && visibleItems.length === 0 && (
          <div className='py-16 text-center text-slate-300'>
            <p>{error}</p>
            <button
              type='button'
              onClick={() => void loadFirstPage(view)}
              className='mt-4 text-white underline underline-offset-4'
            >
              重试
            </button>
          </div>
        )}
        {!showSkeletons && !error && visibleItems.length === 0 && (
          <p className='py-16 text-center text-slate-400'>暂无相关内容</p>
        )}
        {!showSkeletons &&
          visibleItems.length > 0 &&
          (hasMore || moreError) && (
            <div className='mt-10 text-center'>
              {moreError && (
                <p className='mb-3 text-sm text-slate-400'>{moreError}</p>
              )}
              <button
                type='button'
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className='rounded-full border border-white/20 px-5 py-2 text-sm text-white transition-colors hover:bg-white/10 disabled:opacity-50'
              >
                {loadingMore ? '加载中...' : '加载更多'}
              </button>
            </div>
          )}
      </div>
    </PageLayout>
  );
}

export default function AnimationPage() {
  return (
    <Suspense>
      <AnimationPageClient />
    </Suspense>
  );
}
