import { NextRequest, NextResponse } from 'next/server';

import { getAuthInfoFromCookie } from '@/lib/auth';
import { getConfig } from '@/lib/config';
import { getStorage } from '@/lib/db';
import { checkUpstreamAllowed } from '@/lib/libretv/ssrf';
import { mergeLiveSources, sourceKey } from '@/lib/media-sources';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function authorize(request: NextRequest) {
  const user = getAuthInfoFromCookie(request)?.username;
  const config = await getConfig();
  const entry = config.UserConfig.Users.find((u) => u.username === user);
  return user &&
    (user === process.env.USERNAME ||
      (entry?.role === 'admin' && !entry.banned))
    ? config
    : null;
}

export async function GET(request: NextRequest) {
  const config = await authorize(request);
  if (!config) return NextResponse.json({ error: '权限不足' }, { status: 403 });
  return NextResponse.json(
    { sources: mergeLiveSources(config.LiveSourceConfig) },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: NextRequest) {
  try {
    const config = await authorize(request);
    if (!config)
      return NextResponse.json({ error: '权限不足' }, { status: 403 });
    const storage = getStorage();
    if (!storage)
      return NextResponse.json(
        { error: '需要配置共享数据库' },
        { status: 400 }
      );
    const body = await request.json();
    const sources = mergeLiveSources(config.LiveSourceConfig);
    if (body.action === 'add') {
      if (
        typeof body.name !== 'string' ||
        !body.name.trim() ||
        body.name.length > 80 ||
        typeof body.url !== 'string' ||
        body.url.length > 2048
      )
        return NextResponse.json(
          { error: '名称或地址不正确' },
          { status: 400 }
        );
      const verdict = await checkUpstreamAllowed(body.url);
      if (!verdict.ok)
        return NextResponse.json({ error: verdict.reason }, { status: 400 });
      const url = new URL(body.url).href;
      if (sources.length >= 20)
        return NextResponse.json(
          { error: '最多配置 20 个直播源' },
          { status: 400 }
        );
      if (sources.some((s) => s.url === url))
        return NextResponse.json({ error: '直播源已存在' }, { status: 409 });
      sources.push({
        key: `custom_${sourceKey(url)}`,
        name: body.name.trim(),
        url,
      });
    } else {
      const item = sources.find((s) => s.key === body.key);
      if (!item)
        return NextResponse.json({ error: '直播源不存在' }, { status: 404 });
      if (body.action === 'toggle') item.disabled = !item.disabled;
      else if (body.action === 'delete' && !item.builtin)
        sources.splice(sources.indexOf(item), 1);
      else return NextResponse.json({ error: '不支持该操作' }, { status: 400 });
    }
    config.LiveSourceConfig = sources;
    await storage.setAdminConfig(config);
    return NextResponse.json(
      { sources },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch {
    return NextResponse.json({ error: '直播源保存失败' }, { status: 500 });
  }
}
