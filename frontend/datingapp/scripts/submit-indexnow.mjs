import { readFile } from 'node:fs/promises';

const siteUrl = 'https://www.rosemarry.app';
const host = 'www.rosemarry.app';
const key = '96fa61b6fb1a18c297f9a8093a43b02a';
const sitemap = await readFile(new URL('../public/sitemap.xml', import.meta.url), 'utf8');
const defaultPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (!defaultPaths.length) throw new Error('Build the site to generate a nonempty sitemap before submission.');

const args = process.argv.slice(2);
const checkOnly = args.includes('--check');
const requestedPaths = args.filter((arg) => arg !== '--check');
const paths = requestedPaths.length > 0 ? requestedPaths : defaultPaths;
const urlList = paths.map((path) => {
  const url = new URL(path, siteUrl);

  if (url.host !== host) {
    throw new Error(`IndexNow URL must belong to ${host}: ${url.toString()}`);
  }

  return url.toString();
});

const keyLocation = `${siteUrl}/${key}.txt`;
const keyResponse = await fetch(keyLocation, {
  redirect: 'manual',
  signal: AbortSignal.timeout(15000),
});

if (keyResponse.status !== 200) {
  const mitigation = keyResponse.headers.get('x-vercel-mitigated');
  throw new Error(
    `IndexNow not submitted: ${keyLocation} returned HTTP ${keyResponse.status}` +
      (mitigation ? ` (Vercel: ${mitigation})` : '') +
      '. Deploy the key file and verify public access before retrying.',
  );
}

if ((await keyResponse.text()).trim() !== key) {
  throw new Error(
    `IndexNow not submitted: ${keyLocation} does not contain the expected key. ` +
      'Check for a challenge page or an HTML fallback.',
  );
}

if (checkOnly) {
  console.log(`IndexNow key is publicly accessible. No URLs submitted (${urlList.length} selected).`);
  process.exit(0);
}

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  signal: AbortSignal.timeout(15000),
  headers: { 'content-type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host,
    key,
    keyLocation,
    urlList,
  }),
});

if (!response.ok) {
  const responseBody = await response.text();
  throw new Error(`IndexNow returned ${response.status}: ${responseBody || response.statusText}`);
}

console.log(
  `IndexNow received ${urlList.length} URL${urlList.length === 1 ? '' : 's'}. ` +
    (response.status === 202 ? 'Key validation is pending. ' : '') +
    'Receipt does not guarantee indexing.',
);
