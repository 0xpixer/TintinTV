import MobileHeader from './MobileHeader';
import Sidebar from './Sidebar';
import TvFocusManager from './TvFocusManager';

interface PageLayoutProps {
  children: React.ReactNode;
  activePath?: string;
}

export default function PageLayout({
  children,
  activePath = '/',
}: PageLayoutProps) {
  return (
    <div
      className={`tv-app min-h-screen ${
        activePath === '/' ? 'tv-app-home' : ''
      }`}
    >
      <TvFocusManager />
      <Sidebar activePath={activePath} />
      <MobileHeader showBackButton={activePath === '/play'} />
      <main className='tv-main'>{children}</main>
    </div>
  );
}
