'use client';

import { Radio, RotateCcw, Search, Tv } from 'lucide-react';
import Image from 'next/image';
import { Suspense, useEffect, useState } from 'react';

import type { Channel, LivePlaylist } from '@/lib/live-server';

import LivePlayer from '@/components/LivePlayer';
import PageLayout from '@/components/PageLayout';

interface Source {
  key: string;
  name: string;
}

function LivePageClient() {
  const [sources, setSources] = useState<Source[]>([]);
  const [source, setSource] = useState('');
  const [playlist, setPlaylist] = useState<LivePlaylist | null>(null);
  const [channel, setChannel] = useState<Channel | null>(null);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch('/api/live/sources', { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error('直播源暂时无法加载');
        const data = await res.json();
        setSources(data.sources);
        setSource((previous) =>
          data.sources.some((s: Source) => s.key === previous)
            ? previous
            : data.sources[0]?.key || ''
        );
        if (!data.sources.length) setLoading(false);
      })
      .catch((err) => {
        if (!controller.signal.aborted) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [retry]);

  useEffect(() => {
    if (!source) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setPlaylist(null);
    setGroup('');
    setQuery('');
    fetch(`/api/live/playlist?source=${encodeURIComponent(source)}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '频道加载失败');
        setPlaylist(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [source, retry]);

  const channels = (playlist?.channels || []).filter(
    (c) =>
      (!group || (c.group || '其他') === group) &&
      c.name.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <PageLayout activePath='/live'>
      <div className='tv-live-page'>
        <header className='tv-live-heading'>
          <div>
            <p className='tv-live-eyebrow'>
              <Radio size={14} /> LIVE TV
            </p>
            <h1>直播</h1>
          </div>
          <span className='text-sm text-[color:var(--tv-muted)]'>
            {playlist ? `${playlist.channels.length} 个频道` : ''}
          </span>
        </header>
        <div className='tv-live-layout'>
          <section className='min-w-0'>
            <LivePlayer channel={channel} />
            <div className='tv-live-now'>
              <span className='tv-live-dot' />
              <div>
                <h2>{channel?.name || '正在直播'}</h2>
                <p>
                  {channel?.group ||
                    sources.find((s) => s.key === source)?.name ||
                    ''}
                </p>
              </div>
            </div>
          </section>
          <section className='tv-live-guide' aria-label='频道列表'>
            <div className='tv-live-filters'>
              <label>
                <span className='sr-only'>直播源</span>
                <select
                  aria-label='直播源'
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  {sources.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className='tv-live-search'>
                <Search size={17} aria-hidden='true' />
                <input
                  type='search'
                  placeholder='搜索频道'
                  aria-label='搜索频道'
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              {Boolean(playlist?.groups.length) && (
                <label>
                  <span className='sr-only'>频道分类</span>
                  <select
                    aria-label='频道分类'
                    value={group}
                    onChange={(e) => setGroup(e.target.value)}
                  >
                    <option value=''>全部分类</option>
                    {playlist?.groups.map((g) => (
                      <option key={g}>{g}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            {playlist?.stale && (
              <p className='px-4 py-2 text-xs text-[color:var(--tv-muted)]'>
                暂时显示上次更新的频道
              </p>
            )}
            {loading ? (
              <div role='status' className='tv-live-message'>
                正在加载频道…
              </div>
            ) : error ? (
              <div role='alert' className='tv-live-message'>
                <p>{error}</p>
                <button
                  type='button'
                  onClick={() => setRetry((n) => n + 1)}
                  className='inline-flex items-center gap-2'
                >
                  <RotateCcw size={16} />
                  重试
                </button>
              </div>
            ) : !channels.length ? (
              <p className='tv-live-message'>
                {sources.length ? '没有匹配的频道' : '暂无可用直播源'}
              </p>
            ) : (
              <ul className='tv-live-channels'>
                {channels.map((c) => (
                  <li key={c.id}>
                    <button
                      type='button'
                      className='tv-live-channel'
                      aria-pressed={channel?.id === c.id}
                      onClick={() => setChannel(c)}
                    >
                      <span className='tv-live-channel-logo'>
                        <Tv size={23} />
                        {c.logo?.startsWith('https://') && (
                          <Image
                            src={c.logo}
                            alt=''
                            fill
                            unoptimized
                            sizes='56px'
                            loading='lazy'
                            referrerPolicy='no-referrer'
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        )}
                      </span>
                      <span className='min-w-0 flex-1'>
                        <span className='block break-words text-sm font-medium'>
                          {c.name}
                        </span>
                        <span className='mt-1 block text-xs text-[color:var(--tv-muted)]'>
                          {c.group || '直播'}
                        </span>
                      </span>
                      {channel?.id === c.id && (
                        <Radio size={16} className='shrink-0 text-red-500' />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
        <footer className='mt-8 text-xs text-[color:var(--tv-muted)]'>
          Powered by{' '}
          <a
            href='https://github.com/LibreSpark/LibreTV'
            target='_blank'
            rel='noreferrer'
            className='underline'
          >
            LibreTV
          </a>{' '}
          ·{' '}
          <a
            href='https://github.com/0xpixer/TintinTV'
            target='_blank'
            rel='noreferrer'
            className='underline'
          >
            源代码
          </a>
        </footer>
      </div>
    </PageLayout>
  );
}

export default function LivePage() {
  return (
    <Suspense>
      <LivePageClient />
    </Suspense>
  );
}
