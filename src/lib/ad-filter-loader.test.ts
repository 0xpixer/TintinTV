import { AdFilterLoader } from './ad-filter-loader';

jest.mock('hls.js', () => ({
  __esModule: true,
  default: {
    DefaultConfig: {
      loader: class {
        load(
          context: unknown,
          options: { data: string },
          callbacks: { onSuccess: (...args: unknown[]) => void }
        ) {
          callbacks.onSuccess(
            { data: options.data },
            { loaded: 10 },
            context,
            'network-meta'
          );
        }
      },
    },
  },
}));

const playlist =
  '#EXTM3U\n#EXT-X-DISCONTINUITY\n#EXTINF:5,\n/ads/ad.ts\n#EXT-X-DISCONTINUITY\n#EXTINF:300,\n/movie.ts\n#EXT-X-ENDLIST';

it.each(['manifest', 'level'])(
  'filters %s in the direct Hls.js fallback and preserves callback metadata',
  (type) => {
    const callback = jest.fn();
    const loader = new AdFilterLoader({});
    // The fixture loader consumes only the payload, not Hls.js network settings.
    loader.load(
      { type } as never,
      { data: playlist } as never,
      { onSuccess: callback } as never
    );
    expect(callback.mock.calls[0][0].data).not.toContain('/ads/ad.ts');
    expect(callback.mock.calls[0][0].data).toContain('/movie.ts');
    expect(callback.mock.calls[0][3]).toBe('network-meta');
  }
);

it('does not modify media fragment responses', () => {
  const callback = jest.fn();
  new AdFilterLoader({}).load(
    { type: 'fragment' } as never,
    { data: playlist } as never,
    { onSuccess: callback } as never
  );
  expect(callback.mock.calls[0][0].data).toBe(playlist);
});
