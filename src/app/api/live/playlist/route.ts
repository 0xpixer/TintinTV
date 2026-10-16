import { NextResponse } from 'next/server';

import { getLivePlaylist, getLiveSources } from '@/lib/live-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const key = new URL(request.url).searchParams.get('source');
    const source = (await getLiveSources()).find(
      (s) => s.key === key && !s.disabled
    );
    if (!source)
      return NextResponse.json(
        { error: '直播源不存在或已停用' },
        { status: 404 }
      );
    const playlist = await getLivePlaylist(source);
    return NextResponse.json(playlist, {
      headers: { 'Cache-Control': 'private, max-age=300' },
    });
  } catch {
    return NextResponse.json(
      { error: '频道列表暂时无法加载，请切换直播源或稍后重试' },
      { status: 502 }
    );
  }
}
