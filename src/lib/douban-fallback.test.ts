import { mergeDoubanCategoryPage } from './douban-fallback';
import { DoubanItem } from './types';

function item(id: string): DoubanItem {
  return { id, title: id, poster: '', rate: '', year: '' };
}

describe('Douban fallback pages', () => {
  it('fills a short primary page without repeating titles', () => {
    expect(
      mergeDoubanCategoryPage(
        [item('1'), item('2')],
        [item('2'), item('3'), item('4')],
        4
      ).map(({ id }) => id)
    ).toEqual(['1', '2', '3', '4']);
  });
});
