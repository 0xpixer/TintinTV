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
    void video.requestFullscreen?.().catch(() => undefined);
  }
  if (video.paused) {
    void video.play().catch(() => undefined);
  } else if (fullscreenActive) {
    video.pause();
  }
  return true;
}
