import { getDoubanProxyUrl, getImageProxyUrl } from './utils';

describe('proxy settings without browser storage', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('keeps the server Douban API available when localStorage is blocked', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage denied');
    });

    expect(getDoubanProxyUrl()).toBeNull();
  });

  it('keeps image loading available when localStorage is blocked', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage denied');
    });

    expect(getImageProxyUrl()).toBeNull();
  });
});
