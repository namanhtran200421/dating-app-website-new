import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';

const root = 'dist/datingapp/browser';
const site = 'https://www.rosemarry.app';
const previous = await readFile('public/sitemap.xml', 'utf8');
const dates = new Map(
  [...previous.matchAll(/<url>\s*<loc>(.*?)<\/loc>\s*<lastmod>(.*?)<\/lastmod>/g)].map((m) => [
    m[1],
    m[2],
  ]),
);
const pages = new Map();
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await scan(path);
    else if (entry.name === 'index.html') {
      // Metadata extraction does not need CSS parsing (jsdom does not implement all modern CSS).
      const dom = new JSDOM(
        (await readFile(path, 'utf8')).replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ''),
      );
      const doc = dom.window.document;
      await preloadPriorityImages(path, doc);
      const canonical = doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
      if (
        canonical?.startsWith(site + '/') &&
        !doc.querySelector('meta[name="robots"]')?.getAttribute('content')?.includes('noindex')
      ) {
        const date =
          doc
            .querySelector('meta[property="og:updated_time"]')
            ?.getAttribute('content')
            ?.slice(0, 10) ||
          doc
            .querySelector('meta[property="article:modified_time"]')
            ?.getAttribute('content')
            ?.slice(0, 10) ||
          dates.get(canonical) ||
          '2026-09-05';
        pages.set(canonical, date);
      }
      dom.window.close();
    }
  }
}

/**
 * Hoists every `fetchpriority="high"` image into a matching `<link rel="preload">`.
 *
 * Each route is prerendered separately, so this puts the right image in the right page's head
 * rather than preloading the home page's hero everywhere. `type` is carried across from the
 * `<picture>` source, which makes a browser without AVIF ignore the hint instead of wasting a
 * download on a file it cannot decode.
 */
async function preloadPriorityImages(path, doc) {
  const links = [];

  for (const image of doc.querySelectorAll('img[fetchpriority="high"]')) {
    const source = image.parentElement?.querySelector?.('source[type="image/avif"]');
    const attributes = source
      ? {
          type: 'image/avif',
          imagesrcset: source.getAttribute('srcset')?.replace(/\s+/g, ' ').trim(),
          imagesizes: source.getAttribute('sizes')?.replace(/\s+/g, ' ').trim(),
        }
      : { href: image.getAttribute('src') };

    const serialised = Object.entries({
      rel: 'preload',
      as: 'image',
      ...attributes,
      fetchpriority: 'high',
    })
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');
    const tag = `<link ${serialised}>`;
    if (!links.includes(tag)) links.push(tag);
  }

  if (links.length === 0) return;

  const html = await readFile(path, 'utf8');
  if (html.includes('rel="preload" as="image"')) return;
  await writeFile(path, html.replace('</head>', `${links.join('')}</head>`));
}

await scan(root);
if (!pages.has(site + '/') || pages.size < 10)
  throw new Error('Expected homepage and all public article routes in prerender output.');
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[
  ...pages,
]
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([url, date]) => `  <url><loc>${url}</loc><lastmod>${date}</lastmod></url>`)
  .join('\n')}\n</urlset>\n`;
await writeFile(`${root}/sitemap.xml`, sitemap);
await writeFile('public/sitemap.xml', sitemap);
console.log(`Sitemap generated from ${pages.size} indexable prerendered pages.`);
