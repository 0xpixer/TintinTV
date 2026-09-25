/* eslint-disable @typescript-eslint/no-explicit-any,react-hooks/exhaustive-deps */

'use client';

import { Circle, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  const setThemeColor = (theme?: string) => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) {
      const meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.content = theme === 'dark' ? '#101114' : '#f6f7f8';
      document.head.appendChild(meta);
    } else {
      meta.setAttribute('content', theme === 'dark' ? '#101114' : '#f6f7f8');
    }
  };

  useEffect(() => {
    setMounted(true);
    setThemeColor(resolvedTheme);
  }, []);

  if (!mounted) {
    // 渲染一个占位符以避免布局偏移
    return <div className='h-10 w-10' />;
  }

  const toggleTheme = () => {
    // 检查浏览器是否支持 View Transitions API
    const targetTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setThemeColor(targetTheme);
    if (!(document as any).startViewTransition) {
      setTheme(targetTheme);
      return;
    }

    (document as any).startViewTransition(() => {
      setTheme(targetTheme);
    });
  };

  return (
    <button
      onClick={toggleTheme}
      className='flex h-10 w-10 items-center justify-center rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-950/5 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
      aria-label={resolvedTheme === 'dark' ? '切换浅色模式' : '切换深色模式'}
      title={resolvedTheme === 'dark' ? '切换浅色模式' : '切换深色模式'}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className='w-full h-full' />
      ) : (
        <Circle className='w-full h-full' />
      )}
    </button>
  );
}
