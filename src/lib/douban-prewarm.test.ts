/** @jest-environment node */

import {
  DOUBAN_PREWARM_QUERIES,
  prewarmDoubanCategories,
} from './douban-prewarm';

describe('Douban category prewarming', () => {
  it('warms only the first page of the 18 common category entries', async () => {
    let active = 0;
    let maxActive = 0;
    const refresh = jest.fn(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
      return {
        code: 200,
        message: '获取成功',
        list: [{ id: '1', title: 'Cached', poster: '', rate: '', year: '' }],
      };
    });

    const summary = await prewarmDoubanCategories(refresh);

    expect(DOUBAN_PREWARM_QUERIES).toHaveLength(18);
    expect(
      DOUBAN_PREWARM_QUERIES.every(
        ({ pageLimit, pageStart }) => pageLimit === 25 && pageStart === 0
      )
    ).toBe(true);
    expect(refresh).toHaveBeenCalledTimes(18);
    expect(maxActive).toBeLessThanOrEqual(2);
    expect(summary).toEqual({
      total: 18,
      succeeded: 18,
      failed: 0,
      storedItems: 18,
    });
  });

  it('continues warming other entries when one category fails', async () => {
    let calls = 0;
    const summary = await prewarmDoubanCategories(async () => {
      calls += 1;
      if (calls === 1) throw new Error('temporarily unavailable');
      return { code: 200, message: '获取成功', list: [] };
    });

    expect(summary).toEqual({
      total: 18,
      succeeded: 17,
      failed: 1,
      storedItems: 0,
    });
  });
});
