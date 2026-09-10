import { readFile } from 'node:fs/promises';

// Supply a short-lived OAuth token with webmasters.readonly for reports/inspection,
// or webmasters for sitemap submission. The identity also needs property access.
const token = process.env.GOOGLE_ACCESS_TOKEN;
if (!token) throw new Error('Set GOOGLE_ACCESS_TOKEN locally using an identity with Search Console access. Never commit the token.');
const property = process.env.SEARCH_CONSOLE_PROPERTY || 'https://www.rosemarry.app/';
const site = 'https://www.rosemarry.app';
const command = process.argv[2] || 'report';

async function request(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Search Console HTTP ${response.status}. Check OAuth scope and access to ${property}.`);
  return response.status === 204 ? null : response.json();
}

if (command === 'report') {
  const end = new Date(Date.now() - 3 * 86400000);
  const start = new Date(end.getTime() - 27 * 86400000);
  const dates = { startDate: start.toISOString().slice(0, 10), endDate: end.toISOString().slice(0, 10) };
  const result = await request(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/searchAnalytics/query`, 'POST', {
    ...dates, dimensions: ['page', 'query'], rowLimit: 1000, dataState: 'final',
  });
  console.log(JSON.stringify({ property, ...dates, ...result }, null, 2));
} else if (command === 'inspect') {
  const sitemap = await readFile(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
  const urls = process.argv.slice(3).length ? process.argv.slice(3).map((path) => new URL(path, site).href) : [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  for (const url of urls) {
    if (new URL(url).origin !== site) throw new Error('Only Rosemarry URLs are supported.');
    const result = await request('https://searchconsole.googleapis.com/v1/urlInspection/index:inspect', 'POST', { inspectionUrl: url, siteUrl: property, languageCode: 'en-AU' });
    console.log(JSON.stringify({ url, ...result }));
  }
} else if (command === 'submit-sitemap') {
  const response = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property)}/sitemaps/${encodeURIComponent(site + '/sitemap.xml')}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Sitemap submission returned HTTP ${response.status}. Verify the property and webmasters scope.`);
  console.log('Google received the sitemap submission. This does not guarantee indexing.');
} else { throw new Error('Use report, inspect [paths...], or submit-sitemap. The API does not support individual recrawl requests.'); }
