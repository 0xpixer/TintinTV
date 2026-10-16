'use client';

import { Plus, Trash2 } from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';

import { ServerLiveSource } from '@/lib/media-sources';

export default function LiveSourceManager() {
  const [sources, setSources] = useState<ServerLiveSource[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/live-source', { signal: controller.signal })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '加载失败');
        setSources(data.sources);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, []);

  async function update(body: Record<string, unknown>) {
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/admin/live-source', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存失败');
      setSources(data.sources);
      if (body.action === 'add') {
        setName('');
        setUrl('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setBusy(false);
    }
  }

  function add(event: FormEvent) {
    event.preventDefault();
    void update({ action: 'add', name, url });
  }

  return (
    <section className='mt-8 border-t border-[color:var(--tv-line)] pt-6'>
      <h2 className='mb-4 text-lg font-semibold'>直播源</h2>
      {error && (
        <p role='alert' className='mb-4 text-sm text-red-500'>
          {error}
        </p>
      )}
      <ul className='divide-y divide-[color:var(--tv-line)]'>
        {sources.map((source) => (
          <li key={source.key} className='flex items-center gap-3 py-3'>
            <input
              type='checkbox'
              checked={!source.disabled}
              disabled={busy}
              aria-label={`启用 ${source.name}`}
              onChange={() =>
                void update({ action: 'toggle', key: source.key })
              }
            />
            <div className='min-w-0 flex-1'>
              <p className='text-sm font-medium'>{source.name}</p>
              <p className='truncate text-xs text-[color:var(--tv-muted)]'>
                {source.builtin ? '预置源' : source.url}
              </p>
            </div>
            {!source.builtin && (
              <button
                type='button'
                disabled={busy}
                title={`删除 ${source.name}`}
                aria-label={`删除 ${source.name}`}
                className='p-2'
                onClick={() =>
                  void update({ action: 'delete', key: source.key })
                }
              >
                <Trash2 size={18} />
              </button>
            )}
          </li>
        ))}
      </ul>
      <form onSubmit={add} className='mt-4 flex flex-wrap gap-3'>
        <input
          required
          maxLength={80}
          aria-label='直播源名称'
          placeholder='名称'
          value={name}
          onChange={(e) => setName(e.target.value)}
          className='w-40 rounded-md border-[color:var(--tv-line)] bg-[color:var(--tv-bg)] text-sm'
        />
        <input
          required
          type='url'
          maxLength={2048}
          aria-label='M3U 订阅地址'
          placeholder='https://…/playlist.m3u'
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className='min-w-0 flex-1 basis-64 rounded-md border-[color:var(--tv-line)] bg-[color:var(--tv-bg)] text-sm'
        />
        <button
          type='submit'
          disabled={busy}
          className='flex items-center gap-2 rounded-md bg-[color:var(--tv-text)] px-4 py-2 text-sm text-[color:var(--tv-bg)]'
        >
          <Plus size={18} />
          添加
        </button>
      </form>
    </section>
  );
}
