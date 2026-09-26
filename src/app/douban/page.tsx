/* eslint-disable no-console,react-hooks/exhaustive-deps */

'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { getDoubanCategories } from '@/lib/douban.client';
import { DoubanItem } from '@/lib/types';

import DoubanCardSkeleton from '@/components/DoubanCardSkeleton';
import DoubanSelector from '@/components/DoubanSelector';
import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';

const CATEGORY_CACHE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function getCategoryCacheKey(params: {
  kind: string;
  category: string;
  type: string;
  pageLimit: number;
  pageStart: number;
}) {
  const identity = [
    params.kind,
    params.category,
    params.type,
    params.pageLimit,
    params.pageStart,
  ].join('|');
  return `tintintv_douban_category_${encodeURIComponent(identity)}`;
}

function readCategoryCache(key: string): DoubanItem[] | null {
  try {
    const value = localStorage.getItem(key);
    if (!value) return null;
    const cache = JSON.parse(value) as {
      savedAt: number;
      list: DoubanItem[];
    };
    if (
      !cache.savedAt ||
      Date.now() - cache.savedAt > CATEGORY_CACHE_MAX_AGE ||
      !Array.isArray(cache.list)
    ) {
      return null;
    }
    return cache.list;
  } catch {
    return null;
  }
}

function writeCategoryCache(key: string, list: DoubanItem[]) {
  try {
    localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), list }));
  } catch {
    // The page remains usable if browser storage is unavailable.
  }
}

function DoubanPageClient() {
  const searchParams = useSearchParams();
  const [doubanData, setDoubanData] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectorsReady, setSelectorsReady] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const initialRequestRef = useRef(0);

  const type = searchParams.get('type') || 'movie';

  // 选择器状态 - 完全独立，不依赖URL参数
  const [primarySelection, setPrimarySelection] = useState<string>(() => {
    return type === 'movie' ? '热门' : '';
  });
  const [secondarySelection, setSecondarySelection] = useState<string>(() => {
    if (type === 'movie') return '全部';
    if (type === 'tv') return 'tv';
    if (type === 'show') return 'show';
    return '全部';
  });

  // 初始化时标记选择器为准备好状态
  useEffect(() => {
    // 短暂延迟确保初始状态设置完成
    const timer = setTimeout(() => {
      setSelectorsReady(true);
    }, 50);

    return () => clearTimeout(timer);
  }, []); // 只在组件挂载时执行一次

  // type变化时立即重置selectorsReady（最高优先级）
  useEffect(() => {
    setSelectorsReady(false);
    setLoading(true); // 立即显示loading状态
  }, [type]);

  // 当type变化时重置选择器状态
  useEffect(() => {
    // 批量更新选择器状态
    if (type === 'movie') {
      setPrimarySelection('热门');
      setSecondarySelection('全部');
    } else if (type === 'tv') {
      setPrimarySelection('');
      setSecondarySelection('tv');
    } else if (type === 'show') {
      setPrimarySelection('');
      setSecondarySelection('show');
    } else {
      setPrimarySelection('');
      setSecondarySelection('全部');
    }

    // 使用短暂延迟确保状态更新完成后标记选择器准备好
    const timer = setTimeout(() => {
      setSelectorsReady(true);
    }, 50);

    return () => clearTimeout(timer);
  }, [type]);

  // 生成骨架屏数据
  const skeletonData = Array.from({ length: 25 }, (_, index) => index);

  // 生成API请求参数的辅助函数
  const getRequestParams = useCallback(
    (pageStart: number) => {
      // 当type为tv或show时，kind统一为'tv'，category使用type本身
      if (type === 'tv' || type === 'show') {
        return {
          kind: 'tv' as const,
          category: type,
          type: secondarySelection,
          pageLimit: 25,
          pageStart,
        };
      }

      // 电影类型保持原逻辑，但可以扩展支持新的参数
      return {
        kind: type as 'tv' | 'movie',
        category: primarySelection,
        type: secondarySelection,
        // 新增参数（如果API支持的话）
        pageLimit: 25,
        pageStart,
      };
    },
    [type, primarySelection, secondarySelection]
  );

  // 防抖的数据加载函数
  const loadInitialData = useCallback(async () => {
    const params = getRequestParams(0);
    const cacheKey = getCategoryCacheKey(params);
    const cachedItems = readCategoryCache(cacheKey);
    const requestId = ++initialRequestRef.current;
    setLoadError('');
    if (cachedItems?.length) {
      setDoubanData(cachedItems);
      setHasMore(cachedItems.length === params.pageLimit);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const data = await getDoubanCategories(params);
      if (requestId !== initialRequestRef.current) return;

      if (data.code === 200) {
        if (data.list.length || !cachedItems?.length) {
          setDoubanData(data.list);
          setHasMore(data.list.length === params.pageLimit);
        }
        if (data.list.length) writeCategoryCache(cacheKey, data.list);
      } else {
        throw new Error(data.message || '获取数据失败');
      }
    } catch (err) {
      console.error(err);
      if (requestId === initialRequestRef.current && !cachedItems?.length) {
        setLoadError('内容暂时无法加载，请检查网络后重试。');
        setDoubanData([]);
        setHasMore(false);
      }
    } finally {
      if (requestId === initialRequestRef.current) setLoading(false);
    }
  }, [getRequestParams]);

  // 只在选择器准备好后才加载数据
  useEffect(() => {
    // 只有在选择器准备好时才开始加载
    if (!selectorsReady) {
      return;
    }

    // 重置页面状态
    setDoubanData([]);
    setCurrentPage(0);
    setHasMore(true);
    setIsLoadingMore(false);

    // 清除之前的防抖定时器
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // 使用防抖机制加载数据，避免连续状态更新触发多次请求
    debounceTimeoutRef.current = setTimeout(() => {
      loadInitialData();
    }, 100); // 100ms 防抖延迟

    // 清理函数
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [
    selectorsReady,
    type,
    primarySelection,
    secondarySelection,
    loadInitialData,
  ]);

  // 单独处理 currentPage 变化（加载更多）
  useEffect(() => {
    if (currentPage > 0) {
      const fetchMoreData = async () => {
        try {
          setIsLoadingMore(true);

          const data = await getDoubanCategories(
            getRequestParams(currentPage * 25)
          );

          if (data.code === 200) {
            setDoubanData((prev) => [...prev, ...data.list]);
            setHasMore(data.list.length === 25);
          } else {
            throw new Error(data.message || '获取数据失败');
          }
        } catch (err) {
          console.error(err);
        } finally {
          setIsLoadingMore(false);
        }
      };

      fetchMoreData();
    }
  }, [
    currentPage,
    type,
    primarySelection,
    secondarySelection,
    getRequestParams,
  ]);

  // 设置滚动监听
  useEffect(() => {
    // 如果没有更多数据或正在加载，则不设置监听
    if (!hasMore || isLoadingMore || loading) {
      return;
    }

    // 确保 loadingRef 存在
    if (!loadingRef.current) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          setCurrentPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(loadingRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoadingMore, loading]);

  // 处理选择器变化
  const handlePrimaryChange = useCallback(
    (value: string) => {
      // 只有当值真正改变时才设置loading状态
      if (value !== primarySelection) {
        setLoading(true);
        setPrimarySelection(value);
      }
    },
    [primarySelection]
  );

  const handleSecondaryChange = useCallback(
    (value: string) => {
      // 只有当值真正改变时才设置loading状态
      if (value !== secondarySelection) {
        setLoading(true);
        setSecondarySelection(value);
      }
    },
    [secondarySelection]
  );

  const getPageTitle = () => {
    // 根据 type 生成标题
    return type === 'movie' ? '电影' : type === 'tv' ? '电视剧' : '综艺';
  };

  const getActivePath = () => {
    const params = new URLSearchParams();
    if (type) params.set('type', type);

    const queryString = params.toString();
    const activePath = `/douban${queryString ? `?${queryString}` : ''}`;
    return activePath;
  };

  return (
    <PageLayout activePath={getActivePath()}>
      <div className='tv-library overflow-visible'>
        {/* 页面标题和选择器 */}
        <div className='mb-6 sm:mb-8 space-y-4 sm:space-y-6'>
          {/* 页面标题 */}
          <div>
            <h1 className='mb-1 text-3xl font-semibold text-slate-950 sm:mb-2 sm:text-5xl dark:text-white'>
              {getPageTitle()}
            </h1>
            <p className='text-sm text-slate-500 sm:text-base dark:text-slate-400'>
              来自豆瓣的精选内容
            </p>
          </div>

          {/* 选择器组件 */}
          <div className='tv-filters'>
            <DoubanSelector
              type={type as 'movie' | 'tv' | 'show'}
              primarySelection={primarySelection}
              secondarySelection={secondarySelection}
              onPrimaryChange={handlePrimaryChange}
              onSecondaryChange={handleSecondaryChange}
            />
          </div>
        </div>

        {/* 内容展示区域 */}
        <div className='mt-8 overflow-visible'>
          {/* 内容网格 */}
          <div className='grid grid-cols-3 gap-x-2 gap-y-12 px-0 sm:grid-cols-[repeat(auto-fit,minmax(160px,1fr))] sm:gap-x-8 sm:gap-y-20 sm:px-2'>
            {loadError && !loading && doubanData.length === 0 ? (
              <div className='col-span-full flex flex-col items-center gap-4 py-16 text-center text-slate-300'>
                <p>{loadError}</p>
                <button
                  type='button'
                  onClick={() => void loadInitialData()}
                  className='tv-glass-icon-button !h-auto !w-auto px-5 py-2 text-sm'
                >
                  重试
                </button>
              </div>
            ) : loading || !selectorsReady ? (
              // 显示骨架屏
              skeletonData.map((index) => <DoubanCardSkeleton key={index} />)
            ) : (
              // 显示实际数据
              doubanData.map((item, index) => (
                <div key={`${item.title}-${index}`} className='w-full'>
                  <VideoCard
                    from='douban'
                    title={item.title}
                    poster={item.poster}
                    douban_id={item.id}
                    rate={item.rate}
                    year={item.year}
                  />
                </div>
              ))
            )}
          </div>

          {/* 加载更多指示器 */}
          {hasMore && !loading && (
            <div
              ref={(el) => {
                if (el && el.offsetParent !== null) {
                  (
                    loadingRef as React.MutableRefObject<HTMLDivElement | null>
                  ).current = el;
                }
              }}
              className='flex justify-center mt-12 py-8'
            >
              {isLoadingMore && (
                <div className='flex items-center gap-2'>
                  <div className='h-6 w-6 animate-spin rounded-full border-b-2 border-brand-500'></div>
                  <span className='text-slate-600 dark:text-slate-300'>
                    加载中...
                  </span>
                </div>
              )}
            </div>
          )}

          {/* 没有更多数据提示 */}
          {!hasMore && doubanData.length > 0 && (
            <div className='py-8 text-center text-slate-500 dark:text-slate-400'>
              已加载全部内容
            </div>
          )}

          {/* 空状态 */}
          {!loading && !loadError && doubanData.length === 0 && (
            <div className='rounded-2xl border border-dashed border-slate-300 bg-white/45 py-12 text-center text-slate-500 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400'>
              暂无相关内容
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}

export default function DoubanPage() {
  return (
    <Suspense>
      <DoubanPageClient />
    </Suspense>
  );
}
