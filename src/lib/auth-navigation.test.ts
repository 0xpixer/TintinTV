import { getAuthenticatedLoginDestination } from './auth-navigation';

describe('authenticated login navigation', () => {
  it('returns remembered sessions to the homepage by default', () => {
    expect(getAuthenticatedLoginDestination(null)).toBe('/');
    expect(getAuthenticatedLoginDestination('/login')).toBe('/');
  });

  it('preserves safe same-origin destinations', () => {
    expect(getAuthenticatedLoginDestination('/favorites')).toBe('/favorites');
    expect(getAuthenticatedLoginDestination('/play?id=1')).toBe('/play?id=1');
  });

  it('rejects protocol-relative destinations', () => {
    expect(getAuthenticatedLoginDestination('//example.com')).toBe('/');
  });
});
