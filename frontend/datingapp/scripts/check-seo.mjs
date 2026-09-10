import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';

const root = resolve('dist/datingapp/browser');
const sitemap = await readFile(`${root}/sitemap.xml`, 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
const docs = new Map();
const titles = new Set();
for (const url of urls) {
  const path = new URL(url).pathname;
  const html = await readFile(`${root}${path === '/' ? '' : path}/index.html`, 'utf8');
  const dom = new JSDOM(html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ''), { url });
  const doc = dom.window.document;
  docs.set(path, doc);
  assert.equal(doc.querySelectorAll('link[rel="canonical"]').length, 1, url);
  assert.equal(doc.querySelector('link[rel="canonical"]').href, url, url);
  assert.equal(doc.querySelectorAll('h1').length, 1, `One h1: ${url}`);
  assert.equal(doc.querySelectorAll('main').length, 1, `One main landmark: ${url}`);
  assert.ok(doc.querySelector('meta[name="description"]')?.content, url);
  assert.ok(!doc.querySelector('meta[name="robots"]')?.content.includes('noindex'), url);
  assert.ok(!titles.has(doc.title), `Unique title: ${url}`);
  titles.add(doc.title);
  const graph = JSON.parse(doc.getElementById('rosemarry-structured-data').textContent)['@graph'];
  if (path.startsWith('/blog/')) {
    const article = graph.find((node) => node['@type'] === 'BlogPosting');
    assert.ok(article?.datePublished && article?.author?.url, `Article identity: ${url}`);
    assert.equal(article.headline, doc.querySelector('h1').textContent.trim());
    assert.ok(graph.some((node) => node['@type'] === 'BreadcrumbList'));
    assert.ok(doc.querySelectorAll('article section p').length >= 8, `Prerendered article body: ${url}`);
  }
}
for (const [path, doc] of docs) {
  for (const node of doc.querySelectorAll('a[href], img[src], source[srcset]')) {
    const value = node.getAttribute('href') || node.getAttribute('src') || node.getAttribute('srcset')?.split(/[, ]/)[0];
    if (!value) continue;
    const target = new URL(value, doc.baseURI);
    if (target.origin !== 'https://www.rosemarry.app') continue;
    const targetPath = target.pathname.replace(/\/$/, '') || '/';
    if (docs.has(targetPath)) {
      if (target.hash) assert.ok(docs.get(targetPath).getElementById(decodeURIComponent(target.hash.slice(1))), `Missing fragment: ${path} -> ${target}`);
    } else {
      await access(`${root}${target.pathname}`).catch(() => { throw new Error(`Broken internal URL: ${path} -> ${target}`); });
    }
  }
}
const notFound = await readFile(`${root}/404.html`, 'utf8');
assert.match(notFound, /noindex/);
assert.ok(!urls.some((url) => /404|policy-page/.test(url)));
console.log(`SEO checks passed: ${urls.length} pages, unique metadata, article schema, landmarks, internal links and assets.`);
for (const doc of docs.values()) doc.defaultView.close();
