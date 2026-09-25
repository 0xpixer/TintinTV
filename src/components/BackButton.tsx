import { ArrowLeft } from 'lucide-react';

export function BackButton() {
  return (
    <button
      onClick={() => window.history.back()}
      className='flex h-10 w-10 items-center justify-center rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-950/5 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white'
      aria-label='返回上一页'
      title='返回上一页'
    >
      <ArrowLeft className='w-full h-full' />
    </button>
  );
}
