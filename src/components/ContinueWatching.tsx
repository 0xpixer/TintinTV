/* eslint-disable no-console */
'use client';

import { ChevronLeft, ChevronRight, ImageOff } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type PlayRecord,
  clearAllPlayRecords,
  getAllPlayRecords,
  subscribeToDataUpdates,
} from '@/lib/db.client';
import { processImageUrlWithCache } from '@/lib/utils';

import ScrollableRow from '@/components/ScrollableRow';
import VideoCard from '@/components/VideoCard';

interface ContinueWatchingProps {
  className?: string;
  placement?: 'section' | 'hero';
}

function ResumeThumbnail({ src, title }: { src: string; title: string }) {
  const [useOriginal, setUseOriginal] = useState(false);
  const [unavailable, setUnavailable] = useState(!src);

  useEffect(() => {
    setUseOriginal(false);
    setUnavailable(!src);
  }, [src]);

  const handleLoad = (event: React.SyntheticEvent<HTMLImageElement>) => {
    if (event.currentTarget.naturalWidth > 1) return;
    if (useOriginal) setUnavailable(true);
    else setUseOriginal(true);
  };

  const handleError = () => {
    if (useOriginal) setUnavailable(true);
    else setUseOriginal(true);
  };

  return (
    <div className='tv-hero-resume-poster relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-white/10'>
      {unavailable ? (
        <div className='flex h-full items-center justify-center text-white/55'>
          <ImageOff className='h-6 w-6' aria-hidden='true' />
          <span className='sr-only'>{title} 图片暂不可用</span>
        </div>
      ) : (
        <Image
          src={useOriginal ? src : processImageUrlWithCache(src)}
          alt=''
          fill
          unoptimized
          sizes='(max-width: 1200px) 150px, 180px'
          className='object-cover'
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
}

export default function ContinueWatching({
  className,
  placement = 'section',
}: ContinueWatchingProps) {
  const [playRecords, setPlayRecords] = useState<
    (PlayRecord & { key: string })[]
  >([]);
  const [loading, setLoading] = useState(true);
  const resumeTrackRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // 处理播放记录数据更新的函数
  const updatePlayRecords = (allRecords: Record<string, PlayRecord>) => {
    // 将记录转换为数组并根据 save_time 由近到远排序
    const recordsArray = Object.entries(allRecords).map(([key, record]) => ({
      ...record,
      key,
    }));

    // 按 save_time 降序排序（最新的在前面）
    const sortedRecords = recordsArray.sort(
      (a, b) => b.save_time - a.save_time
    );

    setPlayRecords(sortedRecords);
  };

  const getProgress = (record: PlayRecord) => {
    if (record.total_time === 0) return 0;
    return (record.play_time / record.total_time) * 100;
  };

  const parseKey = (key: string) => {
    const [source, id] = key.split('+');
    return { source, id };
  };

  const updateResumeScroll = useCallback(() => {
    const track = resumeTrackRef.current;
    if (!track) return;
    setCanScrollLeft(track.scrollLeft > 2);
    setCanScrollRight(
      track.scrollLeft + track.clientWidth < track.scrollWidth - 2
    );
  }, []);

  useEffect(() => {
    const fetchPlayRecords = async () => {
      try {
        setLoading(true);

        // 从缓存或API获取所有播放记录
        const allRecords = await getAllPlayRecords();
        updatePlayRecords(allRecords);
      } catch (error) {
        console.error('获取播放记录失败:', error);
        setPlayRecords([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayRecords();

    // 监听播放记录更新事件
    const unsubscribe = subscribeToDataUpdates(
      'playRecordsUpdated',
      (newRecords: Record<string, PlayRecord>) => {
        updatePlayRecords(newRecords);
      }
    );

    return unsubscribe;
  }, []);

  useEffect(() => {
    const track = resumeTrackRef.current;
    if (!track) return;
    updateResumeScroll();
    track.addEventListener('scroll', updateResumeScroll, { passive: true });
    const observer = new ResizeObserver(updateResumeScroll);
    observer.observe(track);
    return () => {
      track.removeEventListener('scroll', updateResumeScroll);
      observer.disconnect();
    };
  }, [loading, playRecords.length, updateResumeScroll]);

  // 如果没有播放记录，则不渲染组件
  if (!loading && playRecords.length === 0) {
    return null;
  }

  if (placement === 'hero') {
    return (
      <aside
        className={`tv-hero-resume ${className || ''}`}
        aria-label='继续观看'
      >
        <div className='mb-4 flex items-center justify-between'>
          <h2 className='text-sm font-semibold tracking-wide text-white/90'>
            继续观看
          </h2>
          <div className='flex items-center gap-2'>
            <span className='mr-1 text-xs text-white/55'>最近播放</span>
            {(canScrollLeft || canScrollRight) && (
              <>
                <button
                  type='button'
                  aria-label='向左滚动继续观看'
                  disabled={!canScrollLeft}
                  onClick={() =>
                    resumeTrackRef.current?.scrollBy({
                      left: -220,
                      behavior: 'smooth',
                    })
                  }
                  className='tv-glass-icon-button'
                >
                  <ChevronLeft className='h-4 w-4' aria-hidden='true' />
                </button>
                <button
                  type='button'
                  aria-label='向右滚动继续观看'
                  disabled={!canScrollRight}
                  onClick={() =>
                    resumeTrackRef.current?.scrollBy({
                      left: 220,
                      behavior: 'smooth',
                    })
                  }
                  className='tv-glass-icon-button'
                >
                  <ChevronRight className='h-4 w-4' aria-hidden='true' />
                </button>
              </>
            )}
          </div>
        </div>
        <div ref={resumeTrackRef} className='tv-hero-resume-track'>
          {loading
            ? Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className='w-[148px] shrink-0 animate-pulse'>
                  <div className='aspect-[16/10] rounded-xl bg-white/15' />
                  <div className='mt-2 h-3 w-4/5 rounded bg-white/15' />
                  <div className='mt-2 h-2 w-2/5 rounded bg-white/10'></div>
                </div>
              ))
            : playRecords.map((record) => {
                const { source, id } = parseKey(record.key);
                const progress = Math.min(
                  100,
                  Math.max(0, getProgress(record))
                );
                const href = `/play?source=${encodeURIComponent(
                  source
                )}&id=${encodeURIComponent(id)}&title=${encodeURIComponent(
                  record.title
                )}`;

                return (
                  <Link
                    key={record.key}
                    href={href}
                    className='tv-hero-resume-item group w-[148px] shrink-0 rounded-xl p-1 transition-colors'
                  >
                    <div className='relative'>
                      <ResumeThumbnail
                        src={record.cover}
                        title={record.title}
                      />
                      <div className='absolute inset-x-0 bottom-0 h-1 overflow-hidden rounded-b-xl bg-white/35'>
                        <div
                          className='h-full bg-white'
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <div className='mt-2 min-w-0'>
                      <span className='block truncate text-sm font-medium text-white/90 group-hover:text-white'>
                        {record.title}
                      </span>
                      <span className='mt-1 block truncate text-xs text-white/55'>
                        {record.source_name}
                        {record.total_episodes > 1 &&
                          ` · 第 ${record.index} 集`}
                      </span>
                    </div>
                  </Link>
                );
              })}
        </div>
      </aside>
    );
  }

  return (
    <section className={`mb-8 ${className || ''}`}>
      <div className='mb-4 flex items-center justify-between'>
        <h2 className='text-xl font-semibold text-slate-950 dark:text-white'>
          继续观看
        </h2>
        {!loading && playRecords.length > 0 && (
          <button
            className='rounded-lg px-3 py-1 text-sm text-slate-500 transition-colors hover:bg-slate-950/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white'
            onClick={async () => {
              await clearAllPlayRecords();
              setPlayRecords([]);
            }}
          >
            清空
          </button>
        )}
      </div>
      <ScrollableRow>
        {loading
          ? // 加载状态显示灰色占位数据
            Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className='min-w-[104px] w-[104px] sm:min-w-[170px] sm:w-[170px]'
              >
                <div className='relative aspect-[2/3] w-full overflow-hidden rounded-2xl bg-slate-200 animate-pulse dark:bg-slate-800'>
                  <div className='absolute inset-0 shimmer'></div>
                </div>
                <div className='mt-2 h-4 rounded bg-slate-200 animate-pulse dark:bg-slate-800'></div>
                <div className='mt-1 h-3 rounded bg-slate-200 animate-pulse dark:bg-slate-800'></div>
              </div>
            ))
          : // 显示真实数据
            playRecords.map((record) => {
              const { source, id } = parseKey(record.key);
              return (
                <div
                  key={record.key}
                  className='min-w-[104px] w-[104px] sm:min-w-[170px] sm:w-[170px]'
                >
                  <VideoCard
                    id={id}
                    title={record.title}
                    poster={record.cover}
                    year={record.year}
                    source={source}
                    source_name={record.source_name}
                    progress={getProgress(record)}
                    episodes={record.total_episodes}
                    currentEpisode={record.index}
                    query={record.search_title}
                    from='playrecord'
                    onDelete={() =>
                      setPlayRecords((prev) =>
                        prev.filter((r) => r.key !== record.key)
                      )
                    }
                  />
                </div>
              );
            })}
      </ScrollableRow>
    </section>
  );
}
