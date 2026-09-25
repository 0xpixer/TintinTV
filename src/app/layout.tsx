import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';

import './globals.css';
import 'sweetalert2/dist/sweetalert2.min.css';

import { getConfig } from '@/lib/config';

import { SiteProvider } from '../components/SiteProvider';
import { ThemeProvider } from '../components/ThemeProvider';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

// 动态生成 metadata，支持配置更新后的标题变化
export async function generateMetadata(): Promise<Metadata> {
  let siteName = process.env.SITE_NAME || 'TintinTV';
  if (
    process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'd1' &&
    process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'upstash'
  ) {
    const config = await getConfig();
    siteName = config.SiteConfig.SiteName;
  }

  return {
    title: siteName,
    description: 'Modern streaming platform for movies and TV shows',
    manifest: '/manifest.json',
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      title: siteName,
    },
    formatDetection: {
      telephone: false,
    },
    openGraph: {
      type: 'website',
      locale: 'zh_CN',
      url: 'https://tintintv.club',
      title: siteName,
      description: 'Modern streaming platform for movies and TV shows',
      siteName: siteName,
    },
    twitter: {
      card: 'summary_large_image',
      title: siteName,
      description: 'Modern streaming platform for movies and TV shows',
    },
  };
}

export const viewport: Viewport = {
  themeColor: '#101114',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let siteName = process.env.SITE_NAME || 'TintinTV';
  let announcement =
    process.env.ANNOUNCEMENT ||
    '本网站仅提供影视信息搜索服务，所有内容均来自第三方网站。本站不存储任何视频资源，不对任何内容的准确性、合法性、完整性负责。';
  let enableRegister = process.env.NEXT_PUBLIC_ENABLE_REGISTER === 'true';
  let imageProxy = process.env.NEXT_PUBLIC_IMAGE_PROXY || '';
  let doubanProxy = process.env.NEXT_PUBLIC_DOUBAN_PROXY || '';
  if (
    process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'd1' &&
    process.env.NEXT_PUBLIC_STORAGE_TYPE !== 'upstash'
  ) {
    const config = await getConfig();
    siteName = config.SiteConfig.SiteName;
    announcement = config.SiteConfig.Announcement;
    enableRegister = config.UserConfig.AllowRegister;
    imageProxy = config.SiteConfig.ImageProxy;
    doubanProxy = config.SiteConfig.DoubanProxy;
  }

  // 将运行时配置注入到全局 window 对象，供客户端在运行时读取
  const runtimeConfig = {
    STORAGE_TYPE: process.env.NEXT_PUBLIC_STORAGE_TYPE || 'localstorage',
    ENABLE_REGISTER: enableRegister,
    IMAGE_PROXY: imageProxy,
    DOUBAN_PROXY: doubanProxy,
  };

  return (
    <html lang='zh-CN' suppressHydrationWarning className={inter.variable}>
      <head>
        {/* Favicon - using high resolution icon */}
        <link
          rel='icon'
          href='/icons/icon-192x192.png'
          sizes='192x192'
          type='image/png'
        />
        <link
          rel='icon'
          href='/icons/icon-512x512.png'
          sizes='512x512'
          type='image/png'
        />
        <link rel='shortcut icon' href='/icons/icon-192x192.png' />

        {/* PWA Meta Tags */}
        <meta name='application-name' content={siteName} />
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta
          name='apple-mobile-web-app-status-bar-style'
          content='black-translucent'
        />
        <meta name='apple-mobile-web-app-title' content={siteName} />
        <meta name='format-detection' content='telephone=no' />
        <meta name='mobile-web-app-capable' content='yes' />
        <meta name='msapplication-config' content='/browserconfig.xml' />
        <meta name='msapplication-TileColor' content='#06b6d4' />
        <meta name='msapplication-tap-highlight' content='no' />

        {/* iOS Specific */}
        <meta name='apple-touch-fullscreen' content='yes' />
        <meta name='apple-mobile-web-app-capable' content='yes' />
        <meta
          name='apple-mobile-web-app-status-bar-style'
          content='black-translucent'
        />

        {/* Lock Screen Cover Support */}
        <meta name='apple-mobile-web-app-title' content={siteName} />

        {/* High resolution iOS icons - using standard iOS icon files */}
        <link rel='apple-touch-icon' href='/apple-touch-icon.png' />
        <link
          rel='apple-touch-icon-precomposed'
          href='/apple-touch-icon-precomposed.png'
        />
        <link
          rel='apple-touch-icon'
          sizes='152x152'
          href='/icons/icon-152x152.png'
        />
        <link
          rel='apple-touch-icon'
          sizes='167x167'
          href='/icons/icon-192x192.png'
        />
        <link
          rel='apple-touch-icon'
          sizes='180x180'
          href='/icons/icon-192x192.png'
        />
        <link
          rel='apple-touch-icon'
          sizes='192x192'
          href='/icons/icon-192x192.png'
        />
        <link
          rel='apple-touch-icon'
          sizes='256x256'
          href='/icons/icon-256x256.png'
        />
        <link
          rel='apple-touch-icon'
          sizes='384x384'
          href='/icons/icon-384x384.png'
        />
        <link
          rel='apple-touch-icon'
          sizes='512x512'
          href='/icons/icon-512x512.png'
        />

        {/* Android Specific */}
        <meta name='theme-color' content='#101114' />
        <meta name='msapplication-TileColor' content='#06b6d4' />

        {/* 将配置序列化后直接写入脚本，浏览器端可通过 window.RUNTIME_CONFIG 获取 */}
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.RUNTIME_CONFIG = ${JSON.stringify(runtimeConfig)};`,
          }}
        />

        {/* PWA Registration Script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              console.log('PWA: Starting initialization...');
              
              // Add error handling for unhandled errors
              window.addEventListener('error', function(event) {
                console.error('PWA: Unhandled error:', event.error);
              });
              
              window.addEventListener('unhandledrejection', function(event) {
                console.error('PWA: Unhandled promise rejection:', event.reason);
              });
              
              // Check if running in PWA mode
              if (window.matchMedia('(display-mode: standalone)').matches) {
                console.log('PWA: Running in standalone mode');
              } else {
                console.log('PWA: Running in browser mode');
              }
              
              // Register service worker with better error handling
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  console.log('PWA: Page loaded, registering service worker...');
                  
                  // Check if service worker file exists first
                  fetch('/sw.js', { method: 'HEAD' })
                    .then(function(response) {
                      if (response.ok) {
                        console.log('PWA: Service worker file found, registering...');
                        return navigator.serviceWorker.register('/sw.js');
                      } else {
                        throw new Error('Service worker file not found');
                      }
                    })
                    .then(function(registration) {
                      console.log('PWA: Service worker registered successfully:', registration);
                      
                      // Check for updates
                      registration.addEventListener('updatefound', function() {
                        console.log('PWA: Service worker update found');
                      });
                    })
                    .catch(function(registrationError) {
                      console.error('PWA: Service worker registration failed:', registrationError);
                      
                      // Continue without service worker
                      console.log('PWA: Continuing without service worker');
                    });
                });
              } else {
                console.log('PWA: Service worker not supported');
              }
              
              // Add network status monitoring
              window.addEventListener('online', function() {
                console.log('PWA: Network is online');
              });
              
              window.addEventListener('offline', function() {
                console.log('PWA: Network is offline');
              });
            `,
          }}
        />
      </head>
      <body
        className={`${inter.className} min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 antialiased`}
        style={{
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      >
        <ThemeProvider
          attribute='class'
          defaultTheme='dark'
          enableSystem
          disableTransitionOnChange
        >
          <SiteProvider siteName={siteName} announcement={announcement}>
            {children}
          </SiteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
