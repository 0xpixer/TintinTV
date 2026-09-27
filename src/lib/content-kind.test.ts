import { resolveContentKind } from './content-kind';

const detail = {
  id: '1',
  title: 'Example',
  poster: '',
  episodes: ['one'],
  source: 'test',
  source_name: 'Test',
  year: '2026',
};

describe('resolveContentKind', () => {
  it('keeps a category passed from a browse page', () => {
    expect(
      resolveContentKind('show', '', { ...detail, episodes: ['one', 'two'] })
    ).toBe('show');
    expect(resolveContentKind('animation-movie', '', detail)).toBe(
      'animation-movie'
    );
  });

  it('uses source metadata for older playback links', () => {
    expect(
      resolveContentKind(null, '', {
        ...detail,
        type_name: '日韩动漫',
        episodes: ['one', 'two'],
      })
    ).toBe('animation-series');
    expect(
      resolveContentKind(null, '', {
        ...detail,
        type_name: '大陆综艺',
        episodes: ['one', 'two'],
      })
    ).toBe('show');
    expect(
      resolveContentKind(null, '', { ...detail, episodes: ['one', 'two'] })
    ).toBe('tv');
    expect(resolveContentKind(null, '', detail)).toBe('movie');
  });

  it('ignores unknown route hints', () => {
    expect(
      resolveContentKind('unknown', 'movie', {
        ...detail,
        episodes: ['one', 'two'],
      })
    ).toBe('movie');
  });
});
