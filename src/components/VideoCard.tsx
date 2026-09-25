/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  Calendar,
  CheckCircle,
  Heart,
  PlayCircleIcon,
  Star,
  Trash2,
  Tv2,
} from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

import {
  deleteFavorite,
  deletePlayRecord,
  isFavorited,
  saveFavorite,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { savePlayItemsHandoff } from '@/lib/play-handoff';
import { SearchResult } from '@/lib/types';
import { processImageUrlWithCache } from '@/lib/utils';

interface VideoCardProps {
  id?: string;
  source?: string;
  title?: string;
  query?: string;
  poster?: string;
  episodes?: number;
  source_name?: string;
  progress?: number;
  year?: string;
  from: 'playrecord' | 'favorite' | 'search' | 'douban';
  currentEpisode?: number;
  douban_id?: string;
  onDelete?: () => void;
  rate?: string;
  items?: SearchResult[];
}

export default function VideoCard({
  id,
  title = '',
  query = '',
  poster = '',
  episodes,
  source,
  source_name,
  progress = 0,
  year,
  from,
  currentEpisode,
  douban_id,
  onDelete,
  rate,
  items,
}: VideoCardProps) {
  const router = useRouter();
  const [favorited, setFavorited] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const isAggregate = from === 'search' && !!items?.length;

  const aggregateData = useMemo(() => {
    if (!isAggregate || !items) return null;
    const countMap = new Map<string | number, number>();
    const episodeCountMap = new Map<number, number>();
    items.forEach((item) => {
      if (item.douban_id && item.douban_id !== 0) {
        countMap.set(item.douban_id, (countMap.get(item.douban_id) || 0) + 1);
      }
      const len = item.episodes?.length || 0;
      if (len > 0) {
        episodeCountMap.set(len, (episodeCountMap.get(len) || 0) + 1);
      }
    });

    const getMostFrequent = <T extends string | number>(
      map: Map<T, number>
    ) => {
      let maxCount = 0;
      let result: T | undefined;
      map.forEach((cnt, key) => {
        if (cnt > maxCount) {
          maxCount = cnt;
          result = key;
        }
      });
      return result;
    };

    return {
      first: items[0],
      mostFrequentDoubanId: getMostFrequent(countMap),
      mostFrequentEpisodes: getMostFrequent(episodeCountMap) || 0,
    };
  }, [isAggregate, items]);

  const actualTitle = aggregateData?.first.title ?? title;
  const actualPoster = aggregateData?.first.poster ?? poster;

  // 重试加载图片
  const handleImageRetry = () => {
    if (retryCount < 2) {
      setRetryCount((prev) => prev + 1);
      setImageError(false);
    }
  };

  // 当海报URL改变时重置错误状态
  useEffect(() => {
    setImageError(false);
    setRetryCount(0);
  }, [actualPoster]);

  // 生成存储键
  const storageKey = useMemo(() => {
    if (from === 'douban' && douban_id) {
      return `douban+${douban_id}`;
    }
    if (source && id) {
      return `${source}+${id}`;
    }
    return null;
  }, [from, douban_id, source, id]);

  // 解析存储键获取 source 和 id
  const { parsedSource, parsedId } = useMemo(() => {
    if (!storageKey) return { parsedSource: null, parsedId: null };
    const [source, id] = storageKey.split('+');
    return { parsedSource: source, parsedId: id };
  }, [storageKey]);

  // 获取收藏状态
  const fetchFavoriteStatus = useCallback(async () => {
    if (!parsedSource || !parsedId) return;
    try {
      const status = await isFavorited(parsedSource, parsedId);
      setFavorited(status);
    } catch {
      setFavorited(false);
    }
  }, [parsedSource, parsedId]);

  // 订阅收藏状态更新
  useEffect(() => {
    if (!parsedSource || !parsedId) return;
    fetchFavoriteStatus();
    const unsubscribe = subscribeToDataUpdates('favoritesUpdated', () => {
      fetchFavoriteStatus();
    });
    return unsubscribe;
  }, [parsedSource, parsedId, fetchFavoriteStatus]);

  // 处理收藏/取消收藏
  const handleFavoriteToggle = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!parsedSource || !parsedId || isLoading) return;
      setIsLoading(true);
      try {
        if (favorited) {
          await deleteFavorite(parsedSource, parsedId);
          setFavorited(false);
        } else {
          await saveFavorite(parsedSource, parsedId, {
            title: actualTitle,
            cover: actualPoster,
            total_episodes: episodes || 0,
            source_name: source_name || '',
            year: year || '',
            save_time: Date.now(),
            search_title: query,
          });
          setFavorited(true);
        }
      } catch {
        return;
      } finally {
        setIsLoading(false);
      }
    },
    [
      parsedSource,
      parsedId,
      favorited,
      isLoading,
      actualTitle,
      actualPoster,
      episodes,
      source_name,
      query,
      year,
    ]
  );

  // 处理播放记录删除
  const handleDeletePlayRecord = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!parsedSource || !parsedId || isLoading) return;
      setIsLoading(true);
      try {
        await deletePlayRecord(parsedSource, parsedId);
        onDelete?.();
      } catch {
        return;
      } finally {
        setIsLoading(false);
      }
    },
    [parsedSource, parsedId, isLoading, onDelete]
  );

  // 处理点击事件
  const handleClick = useCallback(() => {
    if (from === 'douban' && douban_id) {
      // Douban cards go directly to play page, which will search for sources
      router.push(
        `/play?title=${encodeURIComponent(
          actualTitle
        )}&year=${encodeURIComponent(year || '')}`
      );
    } else if (from === 'search' && isAggregate && items) {
      const params = new URLSearchParams();
      if (query) params.set('q', query);

      const itemsKey = savePlayItemsHandoff(items);
      if (itemsKey) {
        params.set('itemsKey', itemsKey);
      } else {
        params.set('items', JSON.stringify(items));
      }

      router.push(`/play?${params.toString()}`);
    } else if (source && id) {
      router.push(
        `/play?source=${source}&id=${id}&title=${encodeURIComponent(
          actualTitle
        )}`
      );
    }
  }, [
    from,
    douban_id,
    actualTitle,
    year,
    isAggregate,
    items,
    query,
    source,
    id,
    router,
  ]);

  return (
    <div
      role='link'
      tabIndex={0}
      aria-label={`查看${actualTitle}的片源`}
      className='tv-video-card group relative w-full max-w-full min-w-0 cursor-pointer overflow-hidden rounded-2xl transition-all duration-200 ease-out hover:z-10 focus-visible:z-10'
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && event.key === 'Enter') {
          event.preventDefault();
          handleClick();
        }
      }}
      style={{
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* 海报容器 */}
      <div className='tv-video-poster relative aspect-[2/3] w-full flex-shrink-0 overflow-hidden rounded-2xl bg-slate-200 transition-all duration-300 dark:bg-slate-900'>
        {/* 海报图片 - 使用新的图片缓存系统 */}
        <Image
          key={`${actualPoster}-${retryCount}`}
          src={processImageUrlWithCache(actualPoster, douban_id)}
          alt={actualTitle}
          fill
          className='object-cover transition-transform duration-500 group-hover:scale-[1.03]'
          sizes='(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw'
          priority={false}
          onError={() => {
            setImageError(true);
          }}
          onLoad={() => {
            setImageError(false);
          }}
        />

        {/* 图片加载失败时的占位符 */}
        {imageError && (
          <div className='absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-200 dark:bg-slate-800'>
            <div className='text-center'>
              <div className='mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-slate-500 dark:bg-white/10 dark:text-slate-300'>
                <PlayCircleIcon className='h-5 w-5' />
              </div>
              <div className='mb-2 px-2 text-xs text-slate-500 dark:text-slate-400'>
                {actualTitle}
              </div>
              {retryCount < 2 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageRetry();
                  }}
                  className='rounded bg-white/80 px-2 py-1 text-xs text-slate-700 transition-colors hover:bg-white dark:bg-white/10 dark:text-slate-300 dark:hover:bg-white/15'
                >
                  重试
                </button>
              )}
            </div>
          </div>
        )}

        {/* 悬停遮罩 - Netflix style - 移动端不显示 */}
        <div className='absolute inset-0 hidden bg-gradient-to-t from-black/88 via-black/26 to-transparent opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-within:opacity-100 md:block' />

        {/* 悬停或键盘聚焦时显示播放提示 */}
        <div className='absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-within:opacity-100'>
          <div className='scale-90 rounded-full bg-white/80 p-4 shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-100 md:bg-white/95 md:p-3'>
            <PlayCircleIcon className='h-12 w-12 text-slate-950 md:h-8 md:w-8' />
          </div>
        </div>

        {/* 操作按钮 - 桌面端显示，移动端隐藏 */}
        <div className='absolute top-2 right-2 hidden flex-col gap-2 opacity-0 transition-opacity duration-200 ease-out group-hover:opacity-100 group-focus-within:opacity-100 md:flex'>
          {/* 收藏按钮 */}
          <button
            onClick={handleFavoriteToggle}
            disabled={isLoading}
            aria-label={
              favorited ? `取消收藏${actualTitle}` : `收藏${actualTitle}`
            }
            className='flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full bg-black/70 p-2 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-black/90'
          >
            {isLoading ? (
              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
            ) : favorited ? (
              <Heart className='w-4 h-4 fill-red-500 text-red-500' />
            ) : (
              <Heart className='w-4 h-4' />
            )}
          </button>

          {/* 删除播放记录按钮 */}
          {from === 'playrecord' && (
            <button
              onClick={handleDeletePlayRecord}
              disabled={isLoading}
              aria-label={`删除${actualTitle}的播放记录`}
              className='flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full bg-black/70 p-2 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-black/90'
            >
              {isLoading ? (
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
              ) : (
                <Trash2 className='w-4 h-4' />
              )}
            </button>
          )}

          {/* 删除收藏按钮 */}
          {from === 'favorite' && (
            <button
              onClick={handleFavoriteToggle}
              disabled={isLoading}
              aria-label={`取消收藏${actualTitle}`}
              className='flex min-h-[40px] min-w-[40px] items-center justify-center rounded-full bg-black/70 p-2 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:bg-black/90'
            >
              {isLoading ? (
                <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
              ) : (
                <CheckCircle className='w-4 h-4' />
              )}
            </button>
          )}
        </div>

        {/* 评分/集数/年份徽章 */}
        <div className='absolute bottom-2 left-2 flex flex-col gap-1'>
          {/* 评分 */}
          {rate && (
            <div className='inline-flex items-center gap-1 rounded-md bg-black/68 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm'>
              <Star className='h-3 w-3 fill-accent-400 text-accent-400' />
              {rate}
            </div>
          )}

          {/* 集数 */}
          {episodes && episodes > 1 && (
            <div className='inline-flex items-center gap-1 rounded-md bg-black/68 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm'>
              <Tv2 className='h-3 w-3' />
              {episodes}集
            </div>
          )}

          {/* 当前观看集数 */}
          {currentEpisode && currentEpisode > 0 && (
            <div className='rounded-md bg-brand-500/95 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm'>
              看到第 {currentEpisode} 集
            </div>
          )}

          {/* 年份 */}
          {year && (
            <div className='inline-flex items-center gap-1 rounded-md bg-black/68 px-2 py-1 text-xs font-medium text-white backdrop-blur-sm'>
              <Calendar className='h-3 w-3' />
              {year}
            </div>
          )}
        </div>

        {/* 播放进度条 */}
        {progress > 0 && (
          <div className='absolute bottom-0 left-0 right-0 h-1 bg-black/30'>
            <div
              className='h-full bg-brand-400 transition-all duration-500 ease-out'
              style={{ width: `${(progress / 100) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* 标题 */}
      <div className='mt-2 px-1'>
        <h3 className='line-clamp-2 text-sm font-medium leading-snug text-slate-900 transition-colors duration-300 dark:text-slate-100'>
          {actualTitle}
        </h3>
      </div>
    </div>
  );
}
