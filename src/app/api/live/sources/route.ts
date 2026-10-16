import { NextResponse } from 'next/server';

import { getLiveSources } from '@/lib/live-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sources = (await getLiveSources())
      .filter((s) => !s.disabled)
      .map(({ key, name }) => ({ key, name }));
    return NextResponse.json(
      { sources },
      { headers: { 'Cache-Control': 'private, max-age=60' } }
    );
  } catch {
    return NextResponse.json({ error: '直播源暂时无法加载' }, { status: 503 });
  }
}
