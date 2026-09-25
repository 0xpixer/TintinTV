'use client';

import Link from 'next/link';
import { Suspense, useCallback, useEffect, useState } from 'react';

import type { Favorite } from '@/lib/db.client';
import {
  clearAllFavorites,
  getAllFavorites,
  getAllPlayRecords,
  subscribeToDataUpdates,
} from '@/lib/db.client';

import PageLayout from '@/components/PageLayout';
import VideoCard from '@/components/VideoCard';

type FavoriteItem = Favorite & {
  id: string;
  source: string;
  currentEpisode?: number;
};

function FavoritesClient() {
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const updateItems = useCallback(
    async (favorites: Record<string, Favorite>) => {
      const records = await getAllPlayRecords();
      const sorted = Object.entries(favorites)
        .filter(([key]) => key.includes('+'))
        .sort(([, a], [, b]) => b.save_time - a.save_time)
        .map(([key, favorite]) => {
          const separator = key.indexOf('+');
          return {
            ...favorite,
            source: key.slice(0, separator),
            id: key.slice(separator + 1),
            currentEpisode: records[key]?.index,
          };
        });
      setItems(sorted);
      setError(false);
      setLoading(false);
    },
    []
  );

  const loadItems = useCallback(async () => {
    try {
      await updateItems(await getAllFavorites());
    } catch {
      setError(true);
      setLoading(false);
    }
  }, [updateItems]);

  useEffect(() => {
    void loadItems();
    return subscribeToDataUpdates<Record<string, Favorite>>(
      'favoritesUpdated',
      (favorites) => {
        void updateItems(favorites).catch(() => {
          setError(true);
          setLoading(false);
        });
      }
    );
  }, [loadItems, updateItems]);

  return (
    <PageLayout activePath='/favorites'>
      <div className='tv-library tv-favorites'>
        <div className='mb-8 flex items-center justify-between gap-4'>
          <h1 className='font-semibold'>我的收藏</h1>
          {items.length > 0 && (
            <button
              type='button'
              className='rounded-md px-3 py-2 text-sm text-[color:var(--tv-muted)] hover:bg-[color:var(--tv-surface-raised)] hover:text-[color:var(--tv-text)]'
              onClick={async () => {
                try {
                  await clearAllFavorites();
                  setItems([]);
                } catch {
                  setError(true);
                }
              }}
            >
              清空
            </button>
          )}
        </div>

        {loading ? (
          <div
            role='status'
            className='py-16 text-center text-sm text-[color:var(--tv-muted)]'
          >
            正在加载收藏...
          </div>
        ) : error ? (
          <div
            role='alert'
            className='border-t border-[color:var(--tv-line)] py-14 text-center'
          >
            <p className='text-lg font-medium'>收藏暂时无法读取</p>
            <button
              type='button'
              onClick={() => {
                setLoading(true);
                void loadItems();
              }}
              className='mt-5 rounded-md bg-white px-5 py-2.5 text-sm font-semibold text-[#101114]'
            >
              重新尝试
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className='border-t border-[color:var(--tv-line)] py-14 text-center'>
            <p className='text-lg font-medium'>暂无收藏内容</p>
            <p className='mt-2 text-sm text-[color:var(--tv-muted)]'>
              喜欢的影片会保存在这里。
            </p>
            <Link
              href='/douban?type=movie'
              className='mt-5 inline-flex min-h-11 items-center rounded-md bg-white px-5 text-sm font-semibold text-[#101114]'
            >
              浏览电影
            </Link>
          </div>
        ) : (
          <div className='grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'>
            {items.map((item) => (
              <VideoCard
                key={`${item.source}+${item.id}`}
                from='favorite'
                id={item.id}
                source={item.source}
                title={item.title}
                poster={item.cover}
                episodes={item.total_episodes}
                source_name={item.source_name}
                currentEpisode={item.currentEpisode}
                year={item.year}
                query={item.search_title}
              />
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}

export default function FavoritesPage() {
  return (
    <Suspense>
      <FavoritesClient />
    </Suspense>
  );
}
