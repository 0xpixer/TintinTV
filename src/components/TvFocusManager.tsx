'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

import { handleTvPlayerKey } from '@/lib/tv-player-controls';
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
    '.tv-video-card, .tv-play-recommendation, .tv-hero-resume-item, .tv-pagination-button'
  );
}

export function findPlayFocusBridgeTarget(
  active: HTMLElement,
  direction: SpatialDirection,
  root: ParentNode = document
) {
  if (
    direction === 'up' &&
    active.closest('[data-tv-section="playback-options"]')
  ) {
    return root.querySelector<HTMLElement>('[data-tv-player]');
  }

  if (direction === 'down' && active.matches('[data-tv-player]')) {
    return root.querySelector<HTMLElement>(
      '[data-tv-section="playback-options"] button[aria-pressed="true"], [data-tv-section="playback-options"] button:not([disabled])'
    );
  }

  return null;
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
        active instanceof HTMLVideoElement &&
        active.matches('[data-tv-player]') &&
        handleTvPlayerKey(
          active,
          event.key,
          Boolean(document.fullscreenElement)
        )
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
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

      if (pathname.startsWith('/play')) {
        const bridgeTarget = findPlayFocusBridgeTarget(
          active,
          direction as SpatialDirection
        );
        if (bridgeTarget && isVisible(bridgeTarget)) {
          event.preventDefault();
          event.stopPropagation();
          focusElement(bridgeTarget, direction as SpatialDirection);
          return;
        }
      }

      const openMenu = document.querySelector<HTMLElement>('[data-tv-menu]');
      let candidates = focusable.filter((element) => element !== active);
      if (openMenu) {
        candidates = candidates.filter(
          (element) =>
            element.closest('[data-tv-menu]') ||
            element.matches('[data-tv-menu-trigger]')
        );
      } else if (isContentTarget(active)) {
        const contentCandidates = candidates.filter(isContentTarget);
        if (contentCandidates.length > 0) candidates = contentCandidates;
      }

      const target = findNextSpatialTarget(
        active,
        candidates,
        direction as SpatialDirection
      );
      if (!target) {
        if (direction === 'down' && isContentTarget(active)) {
          event.preventDefault();
          window.dispatchEvent(new Event('tintintv:tv-load-more'));
        } else if (direction === 'up' && isContentTarget(active)) {
          const menuTrigger = document.querySelector<HTMLElement>(
            '[data-tv-menu-trigger]'
          );
          if (menuTrigger && isVisible(menuTrigger)) {
            event.preventDefault();
            focusElement(menuTrigger, 'up');
          }
        }
        return;
      }

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
