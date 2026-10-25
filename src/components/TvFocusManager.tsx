'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function TvFocusManager() {
  const pathname = usePathname();

  useEffect(() => {
    if (!navigator.userAgent.includes('TintinTVAndroidTV/')) return;

    document.documentElement.classList.add('tv-device');
    const frame = window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(
        '.tv-hero-play, .tv-nav-link[aria-current="page"], .tv-nav-link'
      );
      target?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  return null;
}
