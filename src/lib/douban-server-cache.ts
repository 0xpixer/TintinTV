import { Redis } from '@upstash/redis';

import { DoubanResult } from './types';

interface CachedDoubanResult {
  savedAt: number;
  result: DoubanResult;
}

const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;
const FRESH_MS = 2 * 60 * 60 * 1000;

let client: Redis | null | undefined;

function getClient() {
  if (client !== undefined) return client;
  const url = process.env.UPSTASH_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_TOKEN || process.env.KV_REST_API_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

export async function readDoubanCache(key: string) {
  const redis = getClient();
  if (!redis) return null;
  try {
    const value = await redis.get<CachedDoubanResult>(`douban:category:${key}`);
    if (!value?.result?.list?.length) return null;
    return {
      result: value.result,
      fresh: Date.now() - value.savedAt < FRESH_MS,
    };
  } catch {
    return null;
  }
}

export async function writeDoubanCache(key: string, result: DoubanResult) {
  const redis = getClient();
  if (!redis || !result.list.length) return;
  try {
    await redis.set(
      `douban:category:${key}`,
      { savedAt: Date.now(), result },
      { ex: CACHE_TTL_SECONDS }
    );
  } catch {
    // Browsing still works when the shared cache is unavailable.
  }
}
