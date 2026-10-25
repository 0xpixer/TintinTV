import { matchingPlaybackSources } from './playback-source-match';
import { SearchResult } from './types';

function result(
  title: string,
  year = '2024',
  episodes = ['video.m3u8']
): SearchResult {
  return {
    id: `${title}-${year}`,
    title,
    year,
    episodes,
    source: 'demo',
    source_name: 'Demo',
    poster: '',
  };
}

describe('automatic playback source matching', () => {
  it('does not play a different movie whose title merely contains the requested title', () => {
    expect(
      matchingPlaybackSources([result('天堂：希望')], '希望', '2024', 'movie')
    ).toEqual([]);
    expect(
      matchingPlaybackSources(
        [result('八仙的传说', '1985')],
        '八仙',
        '',
        'movie'
      )
    ).toEqual([]);
  });

  it('accepts punctuation differences but rejects a different release year', () => {
    const correct = result('摔跤吧!爸爸', '2016');
    expect(
      matchingPlaybackSources(
        [result('摔跤吧！爸爸', '2024'), correct],
        '摔跤吧！爸爸',
        '2016',
        'movie'
      )
    ).toEqual([correct]);
  });

  it('does not guess when the source year is missing or the title is unrelated', () => {
    expect(
      matchingPlaybackSources(
        [result('希望', 'unknown'), result('别的电影', '2024')],
        '希望',
        '2024',
        'movie'
      )
    ).toEqual([]);
  });

  it('requires a playable source of the requested type', () => {
    expect(
      matchingPlaybackSources(
        [result('八仙', '2024', []), result('八仙', '2024', ['1', '2'])],
        '八仙',
        '2024',
        'movie'
      )
    ).toEqual([]);
  });
});
