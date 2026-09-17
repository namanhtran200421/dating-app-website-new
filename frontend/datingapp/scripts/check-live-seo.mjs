const site = 'https://www.rosemarry.app';
const fetchPublic = async (path) => {
  const response = await fetch(new URL(path, site), {
    redirect: 'manual',
    signal: AbortSignal.timeout(20000),
  });
  if (response.status !== 200)
    throw new Error(
      `${path}: HTTP ${response.status}${response.headers.get('x-vercel-mitigated') ? ' (Vercel challenge)' : ''}`,
    );
  return response.text();
};

const robots = await fetchPublic('/robots.txt');
if (!robots.includes(`${site}/sitemap.xml`))
  throw new Error('robots.txt must reference the production sitemap.');
const sitemap = await fetchPublic('/sitemap.xml');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
if (urls.length < 10) throw new Error('The latest sitemap with all journal articles is not live.');
for (const url of urls) {
  if (new URL(url).origin !== site) throw new Error('Unexpected sitemap host.');
  const html = await fetchPublic(url);
  if (
    !html.includes(`href="${url}"`) ||
    !/<h1\b/.test(html) ||
    !html.includes('rosemarry-structured-data')
  )
    throw new Error(`Missing prerendered SEO content: ${url}`);
  console.log(`200 + prerendered content: ${new URL(url).pathname}`);
}
const missing = await fetch(`${site}/seo-check-page-does-not-exist`, {
  redirect: 'manual',
  signal: AbortSignal.timeout(20000),
});
if (missing.status !== 404)
  throw new Error(`Unknown URLs must return 404, received ${missing.status}.`);
for (const [path, expected] of [
  ['/how-it-works', '/'],
  ['/circle', '/'],
  ['/policy-page', '/privacy-and-terms'],
]) {
  const response = await fetch(site + path, {
    redirect: 'manual',
    signal: AbortSignal.timeout(20000),
  });
  if (
    ![301, 308].includes(response.status) ||
    new URL(response.headers.get('location') || '/', site).pathname !== expected
  )
    throw new Error(`Permanent redirect missing: ${path}`);
}
console.log('Production SEO checks passed. Index status still requires Search Console.');
