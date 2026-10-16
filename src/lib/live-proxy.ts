import { createHmac, timingSafeEqual } from 'node:crypto';

const secret = () => {
  const configured = process.env.PROXY_SECRET || process.env.PASSWORD;
  if (configured) return configured;
  if (process.env.NODE_ENV !== 'production')
    return 'tintintv-local-development-only';
  throw new Error('Stream signing requires PASSWORD or PROXY_SECRET');
};

function signature(url: string, expires: number) {
  return createHmac('sha256', secret())
    .update(`${expires}:${url}`)
    .digest('hex');
}

export function signedStreamUrl(
  url: string,
  expires = Math.floor(Date.now() / 1000) + 6 * 60 * 60
) {
  return `/api/live/stream?${new URLSearchParams({
    url,
    expires: String(expires),
    token: signature(url, expires),
  })}`;
}

export function validStreamSignature(
  url: string,
  expires: number,
  token: string
) {
  if (
    !Number.isSafeInteger(expires) ||
    expires < Date.now() / 1000 ||
    expires > Date.now() / 1000 + 6 * 60 * 60 + 60 ||
    !/^[a-f0-9]{64}$/.test(token)
  )
    return false;
  return timingSafeEqual(
    Buffer.from(token, 'hex'),
    Buffer.from(signature(url, expires), 'hex')
  );
}

// Sign every nested manifest, key and segment; relative paths use the final redirect URL.
export function rewriteLiveManifest(
  text: string,
  base: string,
  expires: number
) {
  const rewrite = (uri: string) => {
    const target = new URL(uri, base);
    if (!['http:', 'https:'].includes(target.protocol))
      throw new Error('Unsupported stream protocol');
    return signedStreamUrl(target.href, expires);
  };
  return text
    .split(/\r?\n/)
    .map((line) => {
      if (!line.trim()) return line;
      if (line.startsWith('#'))
        return line.replace(
          /URI="([^"]+)"/g,
          (_, uri: string) => `URI="${rewrite(uri)}"`
        );
      return rewrite(line.trim());
    })
    .join('\n');
}
