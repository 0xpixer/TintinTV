/* eslint-disable no-console */
'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

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

export default function ContinueWatching({
  className,
  placement = 'section',
}: ContinueWatchingProps) {
  const [playRecords, setPlayRecords] = useState<
    (PlayRecord & { key: string })[]
  >([]);
  const [loading, setLoading] = useState(true);

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
          <span className='text-xs text-white/55'>最近播放</span>
        </div>
        <div className='space-y-3'>
          {loading
            ? Array.from({ length: 2 }).map((_, index) => (
                <div key={index} className='flex animate-pulse gap-3'>
                  <div className='h-[62px] w-[110px] shrink-0 rounded-lg bg-white/15' />
                  <div className='flex-1 space-y-2 py-2'>
                    <div className='h-3 w-4/5 rounded bg-white/15' />
                    <div className='h-2 w-2/5 rounded bg-white/10' />
                  </div>
                </div>
              ))
            : playRecords.slice(0, 3).map((record) => {
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
                    className='tv-hero-resume-item group flex min-w-0 gap-3 rounded-lg p-2 transition-colors hover:bg-white/10'
                  >
                    <div className='relative h-[62px] w-[110px] shrink-0 overflow-hidden rounded-md bg-white/10'>
                      <Image
                        src={processImageUrlWithCache(record.cover, record.key)}
                        alt=''
                        fill
                        sizes='110px'
                        className='object-cover'
                      />
                      <div className='absolute inset-x-0 bottom-0 h-1 bg-white/30'>
                        <div
                          className='h-full bg-brand-400'
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                    <div className='flex min-w-0 flex-1 flex-col justify-center'>
                      <span className='truncate text-sm font-medium text-white/90 group-hover:text-white'>
                        {record.title}
                      </span>
                      <span className='mt-1 truncate text-xs text-white/55'>
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
