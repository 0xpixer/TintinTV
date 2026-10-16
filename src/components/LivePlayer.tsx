'use client';

import Hls from 'hls.js';
import { Play, RotateCcw, Tv } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { Channel } from '@/lib/live-server';

export default function LivePlayer({ channel }: { channel: Channel | null }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>(
    'idle'
  );
  const [retry, setRetry] = useState(0);
  const [needsPlay, setNeedsPlay] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!channel || !video) return;
    const controller = new AbortController();
    let hls: Hls | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let proxied = false;
    let proxyUrl = '';
    let disposed = false;
    setStatus('loading');
    setNeedsPlay(false);
    const fail = () => {
      if (disposed) return;
      if (!proxied && proxyUrl) {
        proxied = true;
        load(proxyUrl);
      } else {
        clearTimeout(timer);
        hls?.destroy();
        setStatus('error');
      }
    };
    const play = () => {
      void video.play().catch(() => {
        if (!disposed) setNeedsPlay(true);
      });
    };
    const load = (url: string) => {
      clearTimeout(timer);
      hls?.destroy();
      video.removeAttribute('src');
      video.load();
      setStatus('loading');
      timer = setTimeout(fail, 18000);
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        play();
      } else if (Hls.isSupported()) {
        hls = new Hls({
          maxBufferLength: 20,
          backBufferLength: 10,
          manifestLoadingMaxRetry: 1,
          levelLoadingMaxRetry: 1,
          fragLoadingMaxRetry: 1,
        });
        hls.on(Hls.Events.MANIFEST_PARSED, play);
        hls.on(Hls.Events.ERROR, (_, data) => {
          if (data.fatal) fail();
        });
        hls.loadSource(url);
        hls.attachMedia(video);
      } else {
        clearTimeout(timer);
        setStatus('error');
      }
    };
    const ready = () => {
      clearTimeout(timer);
      setStatus('ready');
    };
    const playing = () => {
      ready();
      setNeedsPlay(false);
    };
    video.addEventListener('canplay', ready);
    video.addEventListener('playing', playing);
    video.addEventListener('error', fail);
    fetch(
      `/api/live/play?${new URLSearchParams({
        source: channel.sourceKey,
        id: channel.id,
      })}`,
      { signal: controller.signal }
    )
      .then(async (res) => {
        if (!res.ok) throw new Error('播放失败');
        const data = await res.json();
        if (disposed) return;
        proxyUrl = data.proxyUrl;
        proxied = !data.url.startsWith('https:');
        load(proxied ? proxyUrl : data.url);
      })
      .catch(() => {
        if (!disposed) setStatus('error');
      });
    return () => {
      disposed = true;
      controller.abort();
      clearTimeout(timer);
      hls?.destroy();
      video.removeEventListener('canplay', ready);
      video.removeEventListener('playing', playing);
      video.removeEventListener('error', fail);
      video.pause();
      video.removeAttribute('src');
      video.load();
    };
  }, [channel, retry]);

  return (
    <div className='tv-live-player'>
      <video
        ref={videoRef}
        controls
        playsInline
        className='h-full w-full object-contain'
        aria-label={channel ? `${channel.name} 直播` : '直播播放器'}
      />
      {!channel && (
        <div className='tv-live-overlay'>
          <Tv size={40} />
          <p>选择频道开始观看</p>
        </div>
      )}
      {channel && status === 'loading' && (
        <div className='tv-live-overlay pointer-events-none' role='status'>
          <span className='h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white' />
          <p>正在连接直播…</p>
        </div>
      )}
      {channel && status === 'error' && (
        <div className='tv-live-overlay' role='alert'>
          <p>该频道暂时无法播放</p>
          <p className='text-sm text-white/60'>请重试或选择其他频道</p>
          <button
            type='button'
            className='tv-live-round-button'
            onClick={() => setRetry((n) => n + 1)}
            title='重试播放'
            aria-label='重试播放'
          >
            <RotateCcw size={24} />
          </button>
        </div>
      )}
      {channel && needsPlay && status !== 'error' && (
        <button
          type='button'
          className='tv-live-round-button absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2'
          aria-label='播放直播'
          title='播放直播'
          onClick={() =>
            void videoRef.current
              ?.play()
              .then(() => setNeedsPlay(false))
              .catch(() => setNeedsPlay(true))
          }
        >
          <Play fill='currentColor' size={28} />
        </button>
      )}
    </div>
  );
}
