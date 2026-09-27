'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ContentKind } from '@/lib/content-kind';
import { getDoubanCategories } from '@/lib/douban.client';
import { DoubanItem, DoubanResult } from '@/lib/types';
import { processImageUrlWithCache } from '@/lib/utils';

interface PlayRecommendationsProps {
  kind: ContentKind;
  currentTitle: string;
}

const labels: Record<ContentKind, string> = {
  movie: '热门电影',
  tv: '热门剧集',
  show: '热门综艺',
  'animation-movie': '热门动画电影',
  'animation-series': '热门动漫剧集',
};

function readCachedItems(kind: ContentKind): DoubanItem[] {
  try {
    if (kind.startsWith('animation')) {
      const view = kind === 'animation-movie' ? 'movie' : 'series';
      const value = localStorage.getItem(`tintintv_animation_${view}_v1`);
      const cache = value ? JSON.parse(value) : null;
      if (
        !cache?.savedAt ||
        Date.now() - cache.savedAt > 7 * 24 * 60 * 60 * 1000
      )
        return [];
      return Array.isArray(cache?.list) ? cache.list : [];
    }
    const value = localStorage.getItem('tintintv_home_categories_v1');
    const cache = value ? JSON.parse(value) : null;
    if (!cache?.savedAt || Date.now() - cache.savedAt > 7 * 24 * 60 * 60 * 1000)
      return [];
    const key =
      kind === 'movie' ? 'movies' : kind === 'tv' ? 'tvShows' : 'varietyShows';
    return Array.isArray(cache?.[key]) ? cache[key] : [];
  } catch {
    return [];
  }
}

async function fetchItems(kind: ContentKind): Promise<DoubanItem[]> {
  if (kind === 'movie') {
    const data = await getDoubanCategories({
      kind: 'movie',
      category: '热门',
      type: '全部',
    });
    if (data.code !== 200 || !Array.isArray(data.list))
      throw new Error('加载失败');
    return data.list;
  }
  if (kind === 'tv' || kind === 'show') {
    const category = kind === 'tv' ? 'tv' : 'show';
    const data = await getDoubanCategories({
      kind: 'tv',
      category,
      type: category,
    });
    if (data.code !== 200 || !Array.isArray(data.list))
      throw new Error('加载失败');
    return data.list;
  }
  if (kind === 'animation-series') {
    try {
      const data = await getDoubanCategories({
        kind: 'tv',
        category: 'tv',
        type: 'tv_animation',
        pageLimit: 20,
      });
      if (data.code === 200 && Array.isArray(data.list) && data.list.length)
        return data.list;
    } catch {
      // Use the same fallback as the animation browse page.
    }
  }
  const params = new URLSearchParams({
    type: kind === 'animation-movie' ? 'movie' : 'tv',
    tag: kind === 'animation-movie' ? '动画' : '日本动画',
    pageSize: '20',
    pageStart: '0',
  });
  const response = await fetch(`/api/douban?${params}`);
  if (!response.ok) throw new Error('加载失败');
  const data = (await response.json()) as DoubanResult;
  if (data.code !== 200 || !Array.isArray(data.list))
    throw new Error('加载失败');
  return data.list;
}

export default function PlayRecommendations({
  kind,
  currentTitle,
}: PlayRecommendationsProps) {
  const [items, setItems] = useState<DoubanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const media = window.matchMedia('(min-width: 768px)');
    let active = true;
    const load = () => {
      if (!media.matches) return;
      const cached = readCachedItems(kind);
      setItems(cached);
      setLoading(cached.length === 0);
      setError(false);
      void fetchItems(kind)
        .then((list) => {
          if (active) setItems(list);
        })
        .catch(() => {
          if (active) setError(true);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    };
    load();
    media.addEventListener('change', load);
    return () => {
      active = false;
      media.removeEventListener('change', load);
    };
  }, [kind, retry]);

  const visibleItems = items
    .filter((item) => item.poster && item.title.trim() !== currentTitle.trim())
    .slice(0, 10);

  return (
    <aside className='tv-play-recommendations' aria-label={labels[kind]}>
      <h2>{labels[kind]}</h2>
      {loading && visibleItems.length === 0 && (
        <p className='tv-play-recommendations-status' role='status'>
          正在加载推荐...
        </p>
      )}
      {!loading && visibleItems.length === 0 && (
        <div className='tv-play-recommendations-status'>
          <p>{error ? '推荐暂时无法加载' : '暂无推荐内容'}</p>
          {error && (
            <button
              type='button'
              onClick={() => setRetry((value) => value + 1)}
            >
              重试
            </button>
          )}
        </div>
      )}
      <div className='tv-play-recommendations-list'>
        {visibleItems.map((item) => {
          const params = new URLSearchParams({
            title: item.title,
            year: item.year || '',
            kind,
          });
          return (
            <Link
              key={item.id}
              href={`/play?${params}`}
              className='tv-play-recommendation'
            >
              <Image
                src={processImageUrlWithCache(item.poster, item.id)}
                alt=''
                width={96}
                height={144}
                unoptimized
              />
              <span className='tv-play-recommendation-copy'>
                <strong>{item.title}</strong>
                <span>
                  {[item.year, item.rate ? `${item.rate} 分` : '']
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
