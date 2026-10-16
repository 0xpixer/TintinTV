/** @jest-environment node */
import dns from 'node:dns/promises';

import { checkUpstreamAllowed, isPrivateIP, isValidProxyUrl } from './ssrf';

jest.mock('node:dns/promises', () => ({
  __esModule: true,
  default: { lookup: jest.fn() },
}));

describe('media upstream boundary', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '192.168.1.1',
    '169.254.169.254',
    '100.127.1.1',
    '224.0.0.1',
    '0.1.2.3',
    '198.19.1.1',
    '::1',
    '::ffff:c0a8:101',
    '0:0:0:0:0:ffff:7f00:1',
    'fe80::1',
    'fd00::1',
    'ff02::1',
  ])('blocks %s', (ip) => {
    expect(isPrivateIP(ip)).toBe(true);
  });
  it('allows public literals only', () => {
    expect(isValidProxyUrl('https://8.8.8.8/x')).toBe(true);
    expect(isPrivateIP('2606:4700:4700::1111')).toBe(false);
    expect(isValidProxyUrl('https://user:pass@example.com')).toBe(false);
    expect(isValidProxyUrl('file:///tmp/x')).toBe(false);
  });
  it('rejects hosts resolving to private addresses or failing DNS', async () => {
    (dns.lookup as jest.Mock).mockResolvedValue([
      { address: '127.0.0.1', family: 4 },
    ]);
    expect((await checkUpstreamAllowed('https://example.com')).ok).toBe(false);
    (dns.lookup as jest.Mock).mockRejectedValue(new Error('DNS failure'));
    expect((await checkUpstreamAllowed('https://example.com')).ok).toBe(false);
  });
});
