import { trafficSource } from './measurement.service';

describe('trafficSource', () => {
  it('recognizes search and AI referrals without forwarding their URLs', () => {
    expect(trafficSource('https://www.google.com.au/search?q=private', '')).toBe('google');
    expect(trafficSource('https://www.bing.com/search?q=private', '')).toBe('bing');
    expect(trafficSource('https://chatgpt.com/c/private-conversation', '')).toBe('ai');
    expect(trafficSource('https://google.com.evil.example/search', '')).toBe('referral');
  });

  it('uses fixed campaign buckets and ignores arbitrary campaign text', () => {
    expect(trafficSource('', '?utm_source=instagram&email=private@example.com')).toBe('social');
    expect(trafficSource('https://www.google.com', '?utm_medium=cpc')).toBe('paid');
    expect(trafficSource('', '?utm_source=private@example.com')).toBe('direct');
  });
});
