export interface ServerLiveSource {
  key: string;
  name: string;
  url: string;
  disabled?: boolean;
  builtin?: boolean;
}

export const DEFAULT_LIVE_SOURCES: ServerLiveSource[] = [
  { key: 'featured', name: '精选直播', url: 'builtin:featured', builtin: true },
  {
    key: 'cn',
    name: '中国大陆',
    url: 'https://iptv-org.github.io/iptv/countries/cn.m3u',
    builtin: true,
  },
  {
    key: 'hk',
    name: '香港',
    url: 'https://iptv-org.github.io/iptv/countries/hk.m3u',
    builtin: true,
  },
  {
    key: 'tw',
    name: '台湾',
    url: 'https://iptv-org.github.io/iptv/countries/tw.m3u',
    builtin: true,
  },
];

export const FEATURED_PLAYLIST = `#EXTM3U
#EXTINF:-1 tvg-id="cgtn" group-title="新闻",CGTN 环球电视
https://news.cgtn.com/resource/live/english/cgtn-news.m3u8
#EXTINF:-1 tvg-id="cgtn-doc" group-title="纪录片",CGTN Documentary
https://news.cgtn.com/resource/live/document/cgtn-doc.m3u8
#EXTINF:-1 tvg-id="cctvplus" group-title="新闻",CCTV+ 新闻现场
https://cd-live-stream.news.cctvplus.com/live/smil:CHANNEL1.smil/playlist.m3u8
#EXTINF:-1 tvg-id="dw" group-title="新闻",DW English
https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8
`;

export function sourceKey(url: string) {
  let hash = 5381;
  for (let i = 0; i < url.length; i++)
    hash = ((hash << 5) + hash + url.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

export function parseSourceDefaults(raw: string | undefined) {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const seen = new Set<string>();
    return parsed
      .filter(
        (item): item is { name: string; url: string; detail?: string } => {
          if (
            !item ||
            typeof item.name !== 'string' ||
            typeof item.url !== 'string'
          )
            return false;
          try {
            const url = new URL(item.url);
            if (
              !['http:', 'https:'].includes(url.protocol) ||
              url.username ||
              url.password ||
              seen.has(url.href)
            )
              return false;
            seen.add(url.href);
            return Boolean(item.name.trim());
          } catch {
            return false;
          }
        }
      )
      .slice(0, 20)
      .map((item) => ({
        key: `env_${sourceKey(item.url)}`,
        name: item.name.trim(),
        url: new URL(item.url).href,
        detail: typeof item.detail === 'string' ? item.detail : undefined,
      }));
  } catch {
    return [];
  }
}

export function mergeLiveSources(
  saved: ServerLiveSource[] = []
): ServerLiveSource[] {
  const defaults: ServerLiveSource[] = [
    ...DEFAULT_LIVE_SOURCES,
    ...parseSourceDefaults(process.env.DEFAULT_LIVE_SOURCES).map((source) => ({
      ...source,
      builtin: true,
    })),
  ];
  const merged = new Map(defaults.map((source) => [source.key, source]));
  saved.forEach((source) =>
    merged.set(source.key, {
      ...source,
      builtin: merged.get(source.key)?.builtin || false,
    })
  );
  return Array.from(merged.values()).slice(0, 20);
}
