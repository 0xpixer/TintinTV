import { Redis } from '@upstash/redis';
import { createHash } from 'node:crypto';

import { getConfig } from '@/lib/config';
import {
  fetchUpstreamWithMeta,
  getCache,
  setCache,
} from '@/lib/libretv/fetch-utils';
import { parseM3u } from '@/lib/libretv/m3u-parser';
import { isValidProxyUrl } from '@/lib/libretv/ssrf';
import { LiveChannel } from '@/lib/libretv/types';
import {
  FEATURED_PLAYLIST,
  mergeLiveSources,
  ServerLiveSource,
} from '@/lib/media-sources';

export interface Channel extends LiveChannel {
  sourceKey: string;
}
export interface LivePlaylist {
  channels: Channel[];
  groups: string[];
  savedAt: number;
  stale?: boolean;
}
const FRESH_MS = 24 * 60 * 60 * 1000;
const inflight = new Map<string, Promise<LivePlaylist>>();

function redis() {
  const url = process.env.UPSTASH_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_TOKEN || process.env.KV_REST_API_TOKEN;
  return url && token ? new Redis({ url, token }) : null;
}

export async function readLimitedText(
  response: Response,
  maxBytes = 2 * 1024 * 1024
) {
  if (!response.body) throw new Error('空响应');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new Error('播放列表过大');
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    await reader.cancel().catch(() => undefined);
  }
}

export async function getLiveSources() {
  return mergeLiveSources((await getConfig()).LiveSourceConfig);
}

function parsePlaylist(
  text: string,
  source: ServerLiveSource,
  baseUrl?: string
): LivePlaylist {
  if (
    !text.trimStart().startsWith('#EXTM3U') ||
    /#EXT-X-TARGETDURATION|#EXT-X-STREAM-INF/.test(text)
  ) {
    throw new Error('需要 M3U 频道列表，不能使用单个视频地址');
  }
  const channels = parseM3u(text, baseUrl)
    .filter((c) => isValidProxyUrl(c.url))
    .slice(0, 250)
    .map((c) => ({
      ...c,
      sourceKey: source.key,
      id: createHash('sha256')
        .update(`${source.key}:${c.url}`)
        .digest('hex')
        .slice(0, 24),
    }));
  if (!channels.length) throw new Error('未找到可用频道');
  return {
    channels,
    groups: Array.from(new Set(channels.map((c) => c.group || '其他'))),
    savedAt: Date.now(),
  };
}

export async function getLivePlaylist(
  source: ServerLiveSource
): Promise<LivePlaylist> {
  if (source.disabled) throw new Error('直播源已停用');
  if (source.url === 'builtin:featured')
    return parsePlaylist(FEATURED_PLAYLIST, source);
  const key = `live:playlist:v1:${createHash('sha256')
    .update(`${source.key}:${source.url}`)
    .digest('hex')}`;
  const cached = getCache<LivePlaylist>(key);
  if (cached) return cached;
  const pending = inflight.get(key);
  if (pending) return pending;
  const load = async () => {
    const client = redis();
    const stored = await client?.get<LivePlaylist>(key).catch(() => null);
    if (stored && Date.now() - stored.savedAt < FRESH_MS) {
      setCache(key, stored, 10 * 60 * 1000);
      return stored;
    }
    try {
      const { res, finalUrl } = await fetchUpstreamWithMeta(source.url, {
        timeoutMs: 12000,
      });
      if (!res.ok) throw new Error('直播源暂时无法连接');
      const playlist = parsePlaylist(
        await readLimitedText(res),
        source,
        finalUrl
      );
      await client
        ?.set(key, playlist, { ex: 7 * 24 * 60 * 60 })
        .catch(() => undefined);
      setCache(key, playlist, 10 * 60 * 1000);
      return playlist;
    } catch (error) {
      if (stored) {
        const stale = { ...stored, stale: true };
        setCache(key, stale, 5 * 60 * 1000);
        return stale;
      }
      throw error;
    }
  };
  const promise = load().finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

export async function prewarmLiveSources() {
  const sources = (await getLiveSources()).filter((s) => !s.disabled);
  let succeeded = 0;
  let index = 0;
  const worker = async () => {
    while (index < sources.length) {
      try {
        await getLivePlaylist(sources[index++]);
        succeeded++;
      } catch {
        /* Keep other sources available. */
      }
    }
  };
  await Promise.all([worker(), worker()]);
  return { total: sources.length, succeeded };
}
