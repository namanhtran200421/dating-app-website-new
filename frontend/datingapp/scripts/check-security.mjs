import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const globalHeaders = config.headers?.find((entry) => entry.source === '/(.*)')?.headers ?? [];
const csp = globalHeaders.find((header) => header.key === 'Content-Security-Policy')?.value;

if (!csp) throw new Error('vercel.json must define an enforced Content-Security-Policy.');

for (const directive of [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self' https://rosemarry-api.onrender.com",
  "frame-ancestors 'none'",
  'frame-src https://challenges.cloudflare.com',
  "object-src 'none'",
  "script-src 'self' https://challenges.cloudflare.com",
]) {
  if (!csp.includes(directive)) throw new Error(`CSP is missing: ${directive}`);
}

if (/script-src[^;]*(?:'unsafe-inline'|'unsafe-eval')/.test(csp)) {
  throw new Error('script-src must not allow unsafe inline scripts or eval.');
}

const buildRoot = new URL('../dist/datingapp/browser/', import.meta.url);
const files = await readdir(buildRoot, { recursive: true });

if (files.some((file) => file.endsWith('.map'))) {
  throw new Error('Production build contains source maps.');
}

const secretPattern = /MONGO_URI|TURNSTILE_SECRET|mongodb(?:\+srv)?:\/\/|BEGIN .*PRIVATE KEY/;
for (const file of files.filter((name) => /\.(?:html|js|json|css)$/.test(name))) {
  const contents = await readFile(join(buildRoot.pathname, file), 'utf8');
  if (secretPattern.test(contents)) throw new Error(`Potential secret in production file: ${file}`);

  if (file.endsWith('.html')) {
    for (const match of contents.matchAll(/<script\b([^>]*)>/gi)) {
      const attributes = match[1] ?? '';
      const type = /\btype=["']([^"']+)["']/i.exec(attributes)?.[1]?.toLowerCase();
      const isDataScript = type === 'application/json' || type === 'application/ld+json';
      if (!/\bsrc\s*=/i.test(attributes) && !isDataScript) {
        throw new Error(`Executable inline script in production file: ${file}`);
      }
    }

    if (/\son[a-z]+\s*=/i.test(contents)) {
      throw new Error(`Inline event handler in production file: ${file}`);
    }
  }
}

console.log('Security configuration and production artifact checks passed.');
