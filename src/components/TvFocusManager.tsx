'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import {
  findNextSpatialTarget,
  SpatialDirection,
} from '@/lib/tv-spatial-navigation';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  '[role="link"][tabindex]',
  'input:not([disabled])',
  'select:not([disabled])',
  '[data-tv-player]',
].join(',');

function isVisible(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number(style.opacity) !== 0 &&
    rect.width > 4 &&
    rect.height > 4
  );
}

function getFocusableElements() {
  return Array.from(
    document.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
  ).filter(
    (element) =>
      element.dataset.tvFocus !== 'ignore' &&
      element.tabIndex !== -1 &&
      isVisible(element)
  );
}

function scrollTargetIntoView(
  target: HTMLElement,
  direction: SpatialDirection
) {
  if (direction === 'up' || direction === 'down') {
    const section = target.closest<HTMLElement>(
      '[data-tv-section], section, .tv-episode-panel, .tv-play-recommendations'
    );
    (section || target).scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest',
    });
  }

  target.scrollIntoView({
    behavior: 'smooth',
    block: 'nearest',
    inline: 'center',
  });
}

function focusElement(target: HTMLElement, direction?: SpatialDirection) {
  target.focus({ preventScroll: true });
  if (direction) scrollTargetIntoView(target, direction);
}

function isContentTarget(element: HTMLElement) {
  return element.matches(
    '.tv-video-card, .tv-play-recommendation, .tv-hero-resume-item'
  );
}

function requestTvFullscreen(video: HTMLVideoElement) {
  if (!document.fullscreenElement) {
    void video.requestFullscreen?.().catch(() => undefined);
  }
  void video.play().catch(() => undefined);
}

export default function TvFocusManager() {
  const pathname = usePathname();

  useEffect(() => {
    if (!navigator.userAgent.includes('TintinTVAndroidTV/')) return;

    document.documentElement.classList.add('tv-device');
    const focusInitialTarget = () => {
      const selector = pathname.startsWith('/play')
        ? '[data-tv-player]'
        : pathname === '/'
        ? '.tv-hero-play, .tv-video-card'
        : '.tv-video-card, .tv-nav-link[aria-current="page"], .tv-nav-link';
      const target = document.querySelector<HTMLElement>(selector);
      if (target && isVisible(target)) {
        focusElement(target);
        return true;
      }
      return false;
    };

    const frame = window.requestAnimationFrame(focusInitialTarget);
    const observer = new MutationObserver(() => {
      if (document.activeElement === document.body) focusInitialTarget();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      if (!active) return;

      if (
        event.key === 'Enter' &&
        active instanceof HTMLVideoElement &&
        active.matches('[data-tv-player]')
      ) {
        event.preventDefault();
        requestTvFullscreen(active);
        return;
      }

      const direction = event.key.replace('Arrow', '').toLowerCase() as
        | SpatialDirection
        | string;
      if (!['left', 'right', 'up', 'down'].includes(direction)) return;

      const focusable = getFocusableElements();
      if (!focusable.includes(active)) {
        const fallback = focusable[0];
        if (fallback) focusElement(fallback);
        return;
      }

      let candidates = focusable.filter((element) => element !== active);
      if (
        (direction === 'up' || direction === 'down') &&
        isContentTarget(active)
      ) {
        const contentCandidates = candidates.filter(isContentTarget);
        if (contentCandidates.length > 0) candidates = contentCandidates;
      }

      const target = findNextSpatialTarget(
        active,
        candidates,
        direction as SpatialDirection
      );
      if (!target) return;

      event.preventDefault();
      event.stopPropagation();
      focusElement(target, direction as SpatialDirection);
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [pathname]);

  return null;
}
