import {
  DEFAULT_LIVE_SOURCES,
  mergeLiveSources,
  parseSourceDefaults,
} from './media-sources';

describe('shared source defaults', () => {
  afterEach(() => {
    delete process.env.DEFAULT_LIVE_SOURCES;
  });
  it('works without user or deployment setup', () => {
    expect(mergeLiveSources()).toEqual(DEFAULT_LIVE_SOURCES);
    expect(mergeLiveSources().length).toBeGreaterThan(1);
  });
  it('preserves admin disabled defaults and custom entries', () => {
    const saved = [
      { ...DEFAULT_LIVE_SOURCES[0], disabled: true },
      { key: 'custom', name: 'Family', url: 'https://example.com/live.m3u' },
    ];
    const sources = mergeLiveSources(saved);
    expect(sources[0].disabled).toBe(true);
    expect(sources.find((s) => s.key === 'custom')?.builtin).toBe(false);
  });
  it('rejects malformed defaults, duplicates and credential URLs', () => {
    expect(parseSourceDefaults('{invalid')).toEqual([]);
    const result = parseSourceDefaults(
      JSON.stringify([
        { name: 'A', url: 'https://example.com/list' },
        { name: 'B', url: 'https://example.com/list' },
        { name: 'C', url: 'file:///etc/passwd' },
        { name: 'D', url: 'https://user:password@example.com' },
      ])
    );
    expect(result).toHaveLength(1);
  });
  it('keeps environment source IDs stable when order changes', () => {
    const sources = [
      { name: 'A', url: 'https://example.com/a' },
      { name: 'B', url: 'https://example.com/b' },
    ];
    const first = parseSourceDefaults(JSON.stringify(sources));
    const second = parseSourceDefaults(JSON.stringify(sources.reverse()));
    expect(first[0].key).toBe(second[1].key);
  });
});
