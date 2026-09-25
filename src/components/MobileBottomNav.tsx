'use client';

import { Clover, Film, Heart, Home, Search, Tv } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface MobileBottomNavProps {
  /**
   * 主动指定当前激活的路径。当未提供时，自动使用 usePathname() 获取的路径。
   */
  activePath?: string;
}

const MobileBottomNav = ({ activePath }: MobileBottomNavProps) => {
  const pathname = usePathname();

  // 当前激活路径：优先使用传入的 activePath，否则回退到浏览器地址
  const currentActive = activePath ?? pathname;

  const navItems = [
    { icon: Home, label: '首页', href: '/' },
    {
      icon: Film,
      label: '电影',
      href: '/douban?type=movie',
    },
    {
      icon: Tv,
      label: '剧集',
      href: '/douban?type=tv',
    },
    {
      icon: Clover,
      label: '综艺',
      href: '/douban?type=show',
    },
    { icon: Heart, label: '收藏', href: '/favorites' },
    { icon: Search, label: '搜索', href: '/search' },
  ];

  const isActive = (href: string) => {
    const typeMatch = href.match(/type=([^&]+)/)?.[1];

    // 解码URL以进行正确的比较
    const decodedActive = decodeURIComponent(currentActive);
    const decodedItemHref = decodeURIComponent(href);

    return (
      decodedActive === decodedItemHref ||
      (decodedActive.startsWith('/douban') &&
        decodedActive.includes(`type=${typeMatch}`))
    );
  };

  return (
    <nav
      className='tv-mobile-nav md:hidden fixed left-0 right-0 z-[600] overflow-hidden'
      style={{
        /* 紧贴视口底部，同时在内部留出安全区高度 */
        bottom: 0,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <ul className='flex items-center'>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href} className='flex-shrink-0 w-1/6'>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className='flex h-16 w-full flex-col items-center justify-center gap-1 text-xs transition-all duration-300 ease-out group'
              >
                <div
                  className={`relative rounded-md p-2 transition-all duration-300 ease-out ${
                    active
                      ? 'bg-white text-[#101114] dark:bg-white dark:text-[#101114]'
                      : 'text-slate-500 hover:bg-white/10 dark:text-slate-400 dark:hover:bg-white/10'
                  }`}
                >
                  <item.icon className='h-5 w-5 transition-all duration-300 ease-out' />
                </div>
                <span
                  className={`font-medium transition-all duration-300 ease-out ${
                    active
                      ? 'text-slate-950 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
