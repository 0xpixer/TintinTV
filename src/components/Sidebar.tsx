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

const items = [
  { href: '/', label: '首页', icon: Home },
  { href: '/douban?type=movie', label: '电影', icon: Film },
  { href: '/douban?type=tv', label: '剧集', icon: Tv },
  { href: '/douban?type=show', label: '综艺', icon: Clapperboard },
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
        <span className='tv-brand-mark'>
          <Image
            src='/logo.png'
            alt=''
            fill
            className='object-contain'
            sizes='36px'
          />
        </span>
        <span>{siteName}</span>
      </Link>
      <nav className='tv-nav-links' aria-label='主要导航'>
        {items.map(({ href, label, icon: Icon }) => {
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
