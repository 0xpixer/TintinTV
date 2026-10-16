import { NextResponse } from 'next/server';

import { signedStreamUrl } from '@/lib/live-proxy';
import { getLivePlaylist, getLiveSources } from '@/lib/live-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const sp = new URL(request.url).searchParams;
    const source = (await getLiveSources()).find(
      (s) => s.key === sp.get('source') && !s.disabled
    );
    if (!source)
      return NextResponse.json({ error: '直播源不可用' }, { status: 404 });
    const channel = (await getLivePlaylist(source)).channels.find(
      (c) => c.id === sp.get('id')
    );
    if (!channel)
      return NextResponse.json(
        { error: '频道不存在，请刷新列表' },
        { status: 404 }
      );
    return NextResponse.json(
      { url: channel.url, proxyUrl: signedStreamUrl(channel.url) },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json({ error: '暂时无法播放该频道' }, { status: 502 });
  }
}
