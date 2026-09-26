import { readFileSync } from 'fs';
import { join } from 'path';
import { runInNewContext } from 'vm';

import { getCacheStrategyForRequest } from './pwa-cache-policy';

describe('PWA cache policy', () => {
  it('does not handle non-GET requests', () => {
    expect(
      getCacheStrategyForRequest('POST', 'https://example.com/api/favorites')
    ).toBeNull();
  });

  it('never caches API requests', () => {
    expect(
      getCacheStrategyForRequest('GET', 'https://example.com/api/favorites')
    ).toBe('network-only');
    expect(
      getCacheStrategyForRequest(
        'GET',
        'https://example.com/api/search?q=tintin'
      )
    ).toBe('network-only');
    expect(
      getCacheStrategyForRequest('GET', 'https://example.com/api/admin/config')
    ).toBe('network-only');
  });

  it('uses network-first for app shell and Next assets', () => {
    expect(getCacheStrategyForRequest('GET', 'https://example.com/')).toBe(
      'network-first'
    );
    expect(
      getCacheStrategyForRequest(
        'GET',
        'https://example.com/_next/static/chunks/app.js'
      )
    ).toBe('network-first');
  });

  it('fetches content pages before using an offline copy', () => {
    expect(
      getCacheStrategyForRequest('GET', 'https://example.com/douban?type=movie')
    ).toBe('network-first');
    expect(
      getCacheStrategyForRequest('GET', 'https://example.com/favorites')
    ).toBe('network-first');
  });

  it('uses cache-first for images and other static files', () => {
    expect(
      getCacheStrategyForRequest('GET', 'https://example.com/logo.png')
    ).toBe('cache-first');
    expect(
      getCacheStrategyForRequest('GET', 'https://example.com/manifest.json')
    ).toBe('cache-first');
  });

  it('uses the same policy in the actual service worker', () => {
    const script = readFileSync(join(process.cwd(), 'public/sw.js'), 'utf8');
    const context = {
      URL,
      self: { addEventListener: jest.fn() },
    };
    const strategy = runInNewContext(
      `${script}\ngetCacheStrategyForRequest`,
      context
    ) as (request: { method: string }, url: URL) => string | null;

    for (const path of ['/', '/douban?type=movie', '/favorites']) {
      const url = new URL(path, 'https://example.com');
      expect(strategy({ method: 'GET' }, url)).toBe(
        getCacheStrategyForRequest('GET', url.toString())
      );
    }
  });
});
