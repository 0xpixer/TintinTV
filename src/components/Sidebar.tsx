'use client';

import {
  Clapperboard,
  Film,
  Heart,
  Home,
  Menu,
  Radio,
  Search,
  Sparkles,
  Tv,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface SidebarProps {
  activePath?: string;
}

export const primaryItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/douban?type=movie', label: '电影', icon: Film },
  { href: '/douban?type=tv', label: '剧集', icon: Tv },
  { href: '/animation', label: '动画', icon: Sparkles },
  { href: '/douban?type=show', label: '综艺', icon: Clapperboard },
  { href: '/live', label: '直播', icon: Radio },
];
export const quickItems = [
  { href: '/favorites', label: '收藏', icon: Heart },
  { href: '/search', label: '搜索', icon: Search },
];

export default function Sidebar({ activePath }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { siteName } = useSite();
  const [tvMenuOpen, setTvMenuOpen] = useState(false);
  const tvMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const queryString = searchParams.toString();
  const current =
    activePath || `${pathname}${queryString ? `?${queryString}` : ''}`;

  const isItemActive = (href: string) => {
    const [path, query] = href.split('?');
    return path === '/douban'
      ? current.startsWith('/douban') && current.includes(query)
      : current === path;
  };

  useEffect(() => {
    setTvMenuOpen(false);
  }, [pathname, queryString]);

  useEffect(() => {
    if (!tvMenuOpen) return;
    const frame = window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>(
          '#tv-tv-menu [aria-current="page"], #tv-tv-menu a'
        )
        ?.focus();
    });
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' && event.key !== 'BrowserBack') return;
      event.preventDefault();
      setTvMenuOpen(false);
      window.requestAnimationFrame(() => tvMenuTriggerRef.current?.focus());
    };
    document.addEventListener('keydown', closeOnEscape, true);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', closeOnEscape, true);
    };
  }, [tvMenuOpen]);

  return (
    <header className='tv-desktop-nav'>
      <button
        ref={tvMenuTriggerRef}
        type='button'
        className='tv-tv-menu-trigger'
        data-tv-menu-trigger
        aria-label={tvMenuOpen ? '关闭导航菜单' : '打开导航菜单'}
        aria-expanded={tvMenuOpen}
        aria-controls='tv-tv-menu'
        onClick={() => setTvMenuOpen((open) => !open)}
      >
        <Menu aria-hidden='true' />
      </button>
      <Link
        href='/'
        className='tv-brand'
        aria-label={`${siteName} 首页`}
        data-tv-focus='ignore'
      >
        <span className='tv-brand-wordmark'>
          <Image
            src='/TINTINTV%20LOGO%20WHITE.png'
            alt={siteName}
            width={150}
            height={41}
            priority
            className='h-auto w-full object-contain'
            sizes='150px'
          />
        </span>
      </Link>
      <nav className='tv-nav-links' aria-label='主要导航'>
        {primaryItems.map(({ href, label, icon: Icon }) => {
          const active = isItemActive(href);
          return (
            <Link
              key={href}
              href={href}
              className='tv-nav-link'
              title={label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className='h-[17px] w-[17px]' aria-hidden='true' />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className='tv-nav-actions'>
        <nav className='tv-nav-quick-links' aria-label='快捷导航'>
          {quickItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className='tv-nav-quick-link'
              aria-label={label}
              title={label}
              aria-current={current === href ? 'page' : undefined}
            >
              <Icon className='h-[18px] w-[18px]' aria-hidden='true' />
            </Link>
          ))}
        </nav>
        <ThemeToggle />
        <UserMenu />
      </div>
      {tvMenuOpen && (
        <nav
          id='tv-tv-menu'
          className='tv-tv-menu'
          data-tv-menu
          aria-label='电视导航'
        >
          {[...primaryItems, ...quickItems].map(
            ({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className='tv-tv-menu-link'
                aria-current={isItemActive(href) ? 'page' : undefined}
                onClick={() => setTvMenuOpen(false)}
              >
                <Icon aria-hidden='true' />
                <span>{label}</span>
              </Link>
            )
          )}
        </nav>
      )}
    </header>
  );
}
