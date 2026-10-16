import { stripAdGroups } from '@/lib/libretv/ad-filter';

export function filterVodAds(content: string): string {
  const normalized = content.replace(/\r\n/g, '\n');
  // Removing segments changes implicit IVs and byte offsets. Leave these streams
  // and moving live windows untouched rather than risk corrupting playback.
  if (
    !/^#EXT-X-ENDLIST\s*$/m.test(normalized) ||
    /^#EXT-X-STREAM-INF:/m.test(normalized) ||
    /^#EXT-X-BYTERANGE:/m.test(normalized) ||
    normalized
      .split('\n')
      .some(
        (line) =>
          line.startsWith('#EXT-X-KEY:') &&
          !/METHOD=NONE(?:,|$)/.test(line) &&
          (!/METHOD=AES-128(?:,|$)/.test(line) || !/,IV=0x[\da-f]+/i.test(line))
      )
  )
    return content;
  const filtered = stripAdGroups(normalized);
  if (!/^#EXTINF:/m.test(filtered)) return content;
  return /^#EXT-X-ENDLIST\s*$/m.test(filtered)
    ? filtered
    : `${filtered.trimEnd()}\n#EXT-X-ENDLIST\n`;
}
