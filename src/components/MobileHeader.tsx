'use client';

import { Menu, X } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { BackButton } from './BackButton';
import { primaryItems, quickItems } from './Sidebar';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

export default function MobileHeader({
  showBackButton = false,
}: MobileHeaderProps) {
  const { siteName } = useSite();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const current = `${pathname}${query ? `?${query}` : ''}`;
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  useEffect(() => setMenuOpen(false), [pathname, query]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [menuOpen]);

  const isActive = (href: string) => {
    if (href.startsWith('/douban?')) return current === href;
    return pathname === href;
  };

  return (
    <header className='tv-mobile-header md:hidden sticky top-0 z-[550] w-full'>
      <div className='tv-mobile-header-bar'>
        <div className='flex items-center'>
          {showBackButton && <BackButton />}
          <button
            ref={menuButton}
            type='button'
            className='tv-mobile-header-action'
            aria-label={menuOpen ? '关闭导航菜单' : '打开导航菜单'}
            aria-expanded={menuOpen}
            aria-controls='tv-mobile-menu'
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <Link
          href='/'
          className='tv-mobile-wordmark'
          aria-label={`${siteName} 首页`}
        >
          <Image
            src='/TINTINTV%20LOGO%20WHITE.png'
            alt={siteName}
            width={150}
            height={41}
            priority
            sizes='136px'
          />
        </Link>

        <div className='tv-mobile-header-actions'>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>

      {menuOpen && (
        <>
          <button
            type='button'
            className='tv-mobile-menu-backdrop'
            aria-label='关闭导航菜单'
            onClick={() => setMenuOpen(false)}
          />
          <nav
            id='tv-mobile-menu'
            className='tv-mobile-menu'
            aria-label='手机导航'
          >
            {[...primaryItems, ...quickItems].map(
              ({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className='tv-mobile-menu-link'
                  aria-current={isActive(href) ? 'page' : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  <Icon size={20} aria-hidden='true' />
                  <span>{label}</span>
                </Link>
              )
            )}
          </nav>
        </>
      )}
    </header>
  );
}
