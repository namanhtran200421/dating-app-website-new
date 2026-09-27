const site = process.env.AI_CHECK_SITE || 'https://www.rosemarry.app';
const userAgent =
  'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot';

const fetchAsSearchBot = async (path) => {
  const url = new URL(path, site);
  const response = await fetch(url, {
    headers: { 'user-agent': userAgent },
    redirect: 'follow',
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status !== 200) {
    const mitigation = response.headers.get('x-vercel-mitigated');
    throw new Error(
      `${url.pathname}: OAI-SearchBot received HTTP ${response.status}${mitigation ? ` (${mitigation})` : ''}`,
    );
  }
  return response.text();
};

const robots = await fetchAsSearchBot('/robots.txt');
for (const crawler of ['OAI-SearchBot', 'ChatGPT-User']) {
  const block = robots.match(
    new RegExp(`User-agent:\\s*${crawler}([\\s\\S]*?)(?=User-agent:|$)`, 'i'),
  )?.[1];
  if (!block || !/^\s*Allow:\s*\/\s*$/im.test(block)) {
    throw new Error(`robots.txt does not explicitly allow ${crawler}.`);
  }
  if (/^\s*Disallow:\s*\/\s*$/im.test(block)) {
    throw new Error(`robots.txt blocks ${crawler}.`);
  }
}

for (const path of ['/', '/press']) {
  const html = await fetchAsSearchBot(path);
  if (/name=["']robots["'][^>]+noindex/i.test(html))
    throw new Error(`${path}: OAI-SearchBot received a noindex page.`);
  if (!/rel=["']canonical["']/i.test(html) || !/application\/ld\+json/i.test(html))
    throw new Error(`${path}: canonical or structured data is missing.`);
  console.log(`OAI-SearchBot: 200 + indexable HTML at ${path}`);
}

const ranges = await fetch('https://openai.com/searchbot.json', {
  signal: AbortSignal.timeout(20_000),
}).then((response) => {
  if (!response.ok) throw new Error(`OpenAI IP list returned HTTP ${response.status}.`);
  return response.json();
});
if (!Array.isArray(ranges.prefixes) || ranges.prefixes.length === 0)
  throw new Error('OpenAI SearchBot IP list was empty or malformed.');

console.log(`OpenAI publishes ${ranges.prefixes.length} OAI-SearchBot network prefixes.`);
console.log(
  'Public crawler checks passed. Confirm real crawl activity separately in Vercel request logs; a public request cannot prove historical bot visits.',
);
