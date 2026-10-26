export interface TvPlayerFeedback {
  message: string;
  currentTime: number;
  duration: number;
}

export function requestTvPlayerFullscreen(video: HTMLVideoElement) {
  const shell = video.closest?.<HTMLElement>('[data-tv-player-shell]');
  const target = shell || video;
  if (!document.fullscreenElement) {
    void target.requestFullscreen?.().catch(() => undefined);
  }
}

export function handleTvPlayerKey(
  video: HTMLVideoElement,
  key: string,
  fullscreenActive: boolean
): boolean {
  if (key === 'ArrowLeft' || key === 'ArrowRight') {
    const offset = key === 'ArrowLeft' ? -10 : 10;
    const duration = Number.isFinite(video.duration)
      ? video.duration
      : video.currentTime + Math.max(0, offset);
    video.currentTime = Math.max(
      0,
      Math.min(duration, video.currentTime + offset)
    );
    return true;
  }

  if (key === 'ArrowUp') return true;
  if (key === 'ArrowDown') return fullscreenActive || !video.paused;

  if (key !== 'Enter' && key !== ' ') return false;

  if (!fullscreenActive) {
    requestTvPlayerFullscreen(video);
  }
  if (video.paused) {
    void video.play().catch(() => undefined);
  } else if (fullscreenActive) {
    video.pause();
  }
  return true;
}

export function getTvPlayerFeedback(
  video: HTMLVideoElement,
  key: string,
  wasPaused: boolean
): TvPlayerFeedback | null {
  let message = '';
  if (key === 'ArrowLeft') message = '快退 10 秒';
  if (key === 'ArrowRight') message = '快进 10 秒';
  if (key === 'Enter' || key === ' ') message = wasPaused ? '播放' : '暂停';
  if (!message) return null;

  return {
    message,
    currentTime: video.currentTime,
    duration: Number.isFinite(video.duration) ? video.duration : 0,
  };
}

export function emitTvPlayerFeedback(feedback: TvPlayerFeedback) {
  window.dispatchEvent(
    new CustomEvent<TvPlayerFeedback>('tintintv:tv-player-feedback', {
      detail: feedback,
    })
  );
}
