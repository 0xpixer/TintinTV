/* eslint-disable react-hooks/exhaustive-deps, @typescript-eslint/no-explicit-any */
'use client';

import {
  ChevronRight,
  ChevronUp,
  Clover,
  Film,
  Search,
  Tv,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  addSearchHistory,
  clearSearchHistory,
  deleteSearchHistory,
  getSearchHistory,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { normalizeSearchQuery } from '@/lib/search-query';
import { groupSearchResults, sortSearchResults } from '@/lib/search-results';
import { SearchResult } from '@/lib/types';

import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';

function SearchPageClient() {
  // 搜索历史
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  // 返回顶部按钮显示状态
  const [showBackToTop, setShowBackToTop] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const lastSubmittedQueryRef = useRef<string | null>(null);

  // 获取默认聚合设置：只读取用户本地设置，默认为 true
  const getDefaultAggregate = () => {
    if (typeof window !== 'undefined') {
      const userSetting = localStorage.getItem('defaultAggregateSearch');
      if (userSetting !== null) {
        return JSON.parse(userSetting);
      }
    }
    return true; // 默认启用聚合
  };

  const [viewMode, setViewMode] = useState<'agg' | 'all'>(() => {
    return getDefaultAggregate() ? 'agg' : 'all';
  });

  // 聚合后的结果（按标题和年份分组）
  const aggregatedResults = useMemo(() => {
    return groupSearchResults(searchResults, searchQuery);
  }, [searchResults, searchQuery]);

  useEffect(() => {
    // 无搜索参数时聚焦搜索框
    !searchParams.get('q') && document.getElementById('searchInput')?.focus();

    // 初始加载搜索历史
    getSearchHistory().then(setSearchHistory);

    // 监听搜索历史更新事件
    const unsubscribe = subscribeToDataUpdates(
      'searchHistoryUpdated',
      (newHistory: string[]) => {
        setSearchHistory(newHistory);
      }
    );

    // 获取滚动位置的函数 - 专门针对 body 滚动
    const getScrollTop = () => {
      return document.body.scrollTop || 0;
    };

    // 使用 requestAnimationFrame 持续检测滚动位置
    let isRunning = false;
    const checkScrollPosition = () => {
      if (!isRunning) return;

      const scrollTop = getScrollTop();
      const shouldShow = scrollTop > 300;
      setShowBackToTop(shouldShow);

      requestAnimationFrame(checkScrollPosition);
    };

    // 启动持续检测
    isRunning = true;
    checkScrollPosition();

    // 监听 body 元素的滚动事件
    const handleScroll = () => {
      const scrollTop = getScrollTop();
      setShowBackToTop(scrollTop > 300);
    };

    document.body.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      unsubscribe();
      isRunning = false; // 停止 requestAnimationFrame 循环

      // 移除 body 滚动事件监听器
      document.body.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const fetchSearchResults = useCallback(async (query: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query.trim())}`
      );
      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];
      setSearchResults(sortSearchResults(results, query));
      setShowResults(true);
    } catch (error) {
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const submitSearch = useCallback(
    (rawQuery: string) => {
      const trimmed = normalizeSearchQuery(rawQuery);
      if (!trimmed) return;

      setSearchQuery(trimmed);
      setIsLoading(true);
      setShowResults(true);

      if (searchParams.get('q') !== trimmed) {
        lastSubmittedQueryRef.current = trimmed;
        router.push(`/search?q=${encodeURIComponent(trimmed)}`);
      }

      fetchSearchResults(trimmed);
      addSearchHistory(trimmed);
    },
    [fetchSearchResults, router, searchParams]
  );

  useEffect(() => {
    // 当搜索参数变化时更新搜索状态
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);

      if (lastSubmittedQueryRef.current === query) {
        lastSubmittedQueryRef.current = null;
        return;
      }

      fetchSearchResults(query);

      // 保存到搜索历史 (事件监听会自动更新界面)
      addSearchHistory(query);
    } else {
      setShowResults(false);
    }
  }, [fetchSearchResults, searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    submitSearch(searchQuery);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter' || e.nativeEvent.isComposing) return;

    e.preventDefault();
    submitSearch(searchQuery);
  };

  // 返回顶部功能
  const scrollToTop = () => {
    try {
      // 根据调试结果，真正的滚动容器是 document.body
      document.body.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    } catch (error) {
      // 如果平滑滚动完全失败，使用立即滚动
      document.body.scrollTop = 0;
    }
  };

  return (
    <PageLayout activePath='/search'>
      <div className='tv-search overflow-visible mb-10'>
        {/* 搜索框 */}
        <div className='mb-8'>
          <div className='mx-auto mb-6 max-w-3xl'>
            <h1 className='text-2xl font-semibold text-slate-950 sm:text-3xl dark:text-white'>
              搜索影片
            </h1>
            <p className='mt-3 text-sm text-slate-500 dark:text-slate-400'>
              聚合多个来源，优先展示更容易播放的结果。
            </p>
          </div>
          <form onSubmit={handleSearch} className='max-w-3xl mx-auto'>
            <div className='relative'>
              <Search className='absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400 dark:text-slate-500' />
              <input
                id='searchInput'
                type='text'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder='搜索电影、电视剧...'
                className='h-14 w-full rounded-xl border border-slate-200/80 bg-white/80 py-3 pl-12 pr-14 text-base text-slate-800 shadow-soft backdrop-blur placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-400/15 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-200 dark:placeholder:text-slate-500 dark:focus:bg-white/[0.09]'
              />
              <button
                type='submit'
                aria-label='搜索'
                className='absolute right-2 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg bg-slate-950 text-white transition-colors hover:bg-brand-600 dark:bg-white dark:text-slate-950 dark:hover:bg-brand-100'
              >
                <Search className='h-4 w-4' />
              </button>
            </div>
          </form>
        </div>

        {/* 搜索结果或搜索历史 */}
        <div className='mt-12 overflow-visible'>
          {isLoading ? (
            <div className='flex justify-center items-center h-40'>
              <div className='h-8 w-8 animate-spin rounded-full border-b-2 border-brand-500'></div>
            </div>
          ) : showResults ? (
            <section className='mb-12'>
              {/* 标题 + 聚合开关 */}
              <div className='mb-8 flex items-center justify-between'>
                <h2 className='text-xl font-semibold text-slate-950 dark:text-white'>
                  搜索结果
                </h2>
                {/* 聚合开关 */}
                <label className='flex items-center gap-2 cursor-pointer select-none'>
                  <span className='text-sm text-slate-600 dark:text-slate-300'>
                    聚合
                  </span>
                  <div className='relative'>
                    <input
                      type='checkbox'
                      className='sr-only peer'
                      checked={viewMode === 'agg'}
                      onChange={() =>
                        setViewMode(viewMode === 'agg' ? 'all' : 'agg')
                      }
                    />
                    <div className='h-5 w-9 rounded-full bg-slate-300 transition-colors peer-checked:bg-brand-500 dark:bg-slate-700'></div>
                    <div className='absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform peer-checked:translate-x-4'></div>
                  </div>
                </label>
              </div>
              <div
                key={`search-results-${viewMode}`}
                className='grid grid-cols-3 justify-start gap-x-2 gap-y-14 px-0 sm:grid-cols-[repeat(auto-fill,_minmax(11rem,_1fr))] sm:gap-x-8 sm:gap-y-20 sm:px-2'
              >
                {viewMode === 'agg'
                  ? aggregatedResults.map(([mapKey, group]) => {
                      return (
                        <div key={`agg-${mapKey}`} className='w-full'>
                          <VideoCard
                            from='search'
                            items={group}
                            query={
                              searchQuery.trim() !== group[0].title
                                ? searchQuery.trim()
                                : ''
                            }
                          />
                        </div>
                      );
                    })
                  : searchResults.map((item) => (
                      <div
                        key={`all-${item.source}-${item.id}`}
                        className='w-full'
                      >
                        <VideoCard
                          id={item.id}
                          title={item.title}
                          poster={item.poster}
                          episodes={item.episodes.length}
                          source={item.source}
                          source_name={item.source_name}
                          douban_id={item.douban_id?.toString()}
                          query={
                            searchQuery.trim() !== item.title
                              ? searchQuery.trim()
                              : ''
                          }
                          year={item.year}
                          from='search'
                        />
                      </div>
                    ))}
                {searchResults.length === 0 && (
                  <div className='col-span-full rounded-2xl border border-dashed border-slate-300 bg-white/45 py-12 text-center text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400'>
                    未找到相关结果
                  </div>
                )}
              </div>
            </section>
          ) : searchHistory.length > 0 ? (
            // 搜索历史
            <section className='mb-12'>
              <h2 className='mb-4 text-left text-xl font-semibold text-slate-950 dark:text-white'>
                搜索历史
                {searchHistory.length > 0 && (
                  <button
                    onClick={() => {
                      clearSearchHistory(); // 事件监听会自动更新界面
                    }}
                    className='ml-3 rounded-lg px-2 py-1 text-sm text-slate-500 transition-colors hover:bg-red-500/10 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400'
                  >
                    清空
                  </button>
                )}
              </h2>
              <div className='flex flex-wrap gap-2'>
                {searchHistory.map((item) => (
                  <div key={item} className='relative group'>
                    <button
                      onClick={() => {
                        setSearchQuery(item);
                        router.push(
                          `/search?q=${encodeURIComponent(item.trim())}`
                        );
                      }}
                      className='rounded-lg border border-slate-200/80 bg-white/70 px-4 py-2 text-sm text-slate-700 shadow-soft transition-colors duration-200 hover:border-brand-300 hover:bg-brand-50 dark:border-white/10 dark:bg-white/[0.06] dark:text-slate-300 dark:hover:bg-white/10'
                    >
                      {item}
                    </button>
                    {/* 删除按钮 */}
                    <button
                      aria-label='删除搜索历史'
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        deleteSearchHistory(item); // 事件监听会自动更新界面
                      }}
                      className='absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-400 text-[10px] text-white opacity-0 transition-colors hover:bg-red-500 group-hover:opacity-100'
                    >
                      <X className='w-3 h-3' />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <section className='mx-auto max-w-3xl border-t border-slate-200 pt-6 dark:border-white/10'>
              <h2 className='mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300'>
                浏览热门内容
              </h2>
              <div className='grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:gap-3'>
                {[
                  { href: '/douban?type=movie', label: '电影', icon: Film },
                  { href: '/douban?type=tv', label: '剧集', icon: Tv },
                  { href: '/douban?type=show', label: '综艺', icon: Clover },
                ].map(({ href, label, icon: Icon }) => (
                  <Link
                    key={href}
                    href={href}
                    className='inline-flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 transition-colors hover:border-brand-400 hover:text-slate-950 sm:gap-2 sm:px-4 dark:border-white/15 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:border-brand-400'
                  >
                    <Icon className='h-4 w-4' />
                    {label}
                    <ChevronRight className='h-4 w-4 text-slate-400' />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {/* 返回顶部悬浮按钮 */}
      <button
        onClick={scrollToTop}
        className={`fixed bottom-20 right-6 z-[500] flex h-12 w-12 items-center justify-center rounded-full bg-slate-950/90 text-white shadow-lg backdrop-blur-sm transition-all duration-300 ease-in-out hover:bg-brand-600 md:bottom-6 dark:bg-white/90 dark:text-slate-950 dark:hover:bg-brand-100 group ${
          showBackToTop
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        aria-label='返回顶部'
      >
        <ChevronUp className='w-6 h-6 transition-transform group-hover:scale-110' />
      </button>
    </PageLayout>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchPageClient />
    </Suspense>
  );
}
