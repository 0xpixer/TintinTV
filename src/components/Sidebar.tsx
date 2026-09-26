'use client';

import { Clapperboard, Film, Heart, Home, Search, Tv } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface SidebarProps {
  activePath?: string;
}

const primaryItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/douban?type=movie', label: '电影', icon: Film },
  { href: '/douban?type=tv', label: '剧集', icon: Tv },
  { href: '/douban?type=show', label: '综艺', icon: Clapperboard },
];
const quickItems = [
  { href: '/favorites', label: '收藏', icon: Heart },
  { href: '/search', label: '搜索', icon: Search },
];

export default function Sidebar({ activePath }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { siteName } = useSite();
  const queryString = searchParams.toString();
  const current =
    activePath || `${pathname}${queryString ? `?${queryString}` : ''}`;

  return (
    <header className='tv-desktop-nav hidden md:flex'>
      <Link href='/' className='tv-brand' aria-label={`${siteName} 首页`}>
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
      <nav className='tv-nav-links' aria-label='主要导航'>
        {primaryItems.map(({ href, label, icon: Icon }) => {
          const [path, query] = href.split('?');
          const active =
            path === '/douban'
              ? current.startsWith('/douban') && current.includes(query)
              : current === path;
          return (
            <Link
              key={href}
              href={href}
              className='tv-nav-link'
              aria-current={active ? 'page' : undefined}
            >
              <Icon className='h-[17px] w-[17px]' aria-hidden='true' />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className='tv-nav-actions'>
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}
