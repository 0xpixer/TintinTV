'use client';

import Image from 'next/image';
import Link from 'next/link';

import { BackButton } from './BackButton';
import { useSite } from './SiteProvider';
import { ThemeToggle } from './ThemeToggle';
import { UserMenu } from './UserMenu';

interface MobileHeaderProps {
  showBackButton?: boolean;
}

const MobileHeader = ({ showBackButton = false }: MobileHeaderProps) => {
  const { siteName } = useSite();
  return (
    <header className='tv-mobile-header md:hidden sticky top-0 z-[550] w-full'>
      <div className='flex h-14 items-center justify-between gap-3 px-4'>
        <div className='flex min-w-0 items-center gap-2'>
          {showBackButton && <BackButton />}
          <Link
            href='/'
            className='group flex min-w-0 items-center gap-2 transition-opacity duration-300 hover:opacity-80'
          >
            <span className='relative h-8 w-8 flex-none'>
              <Image
                src='/logo.png'
                alt=''
                fill
                className='object-contain transition-transform duration-300 group-hover:scale-110'
              />
            </span>
            <span className='truncate text-lg font-semibold'>{siteName}</span>
          </Link>
        </div>

        <div className='flex flex-none items-center gap-3'>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
};

export default MobileHeader;
