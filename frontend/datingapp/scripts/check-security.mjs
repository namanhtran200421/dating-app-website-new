import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
const globalHeaders = config.headers?.find((entry) => entry.source === '/(.*)')?.headers ?? [];
const headerMap = new Map(
  globalHeaders.map((header) => [header.key.toLowerCase(), header.value]),
);
const csp = headerMap.get('content-security-policy');

if (!csp) throw new Error('vercel.json must define an enforced Content-Security-Policy.');

for (const directive of [
  "default-src 'self'",
  "base-uri 'self'",
  "connect-src 'self' https://rosemarry-api.onrender.com",
  "form-action 'self'",
  "frame-ancestors 'none'",
  'frame-src https://challenges.cloudflare.com',
  "object-src 'none'",
  "script-src 'self' https://challenges.cloudflare.com",
  "script-src-attr 'none'",
  "style-src 'self' 'unsafe-inline'",
  'upgrade-insecure-requests',
]) {
  if (!csp.includes(directive)) throw new Error(`CSP is missing: ${directive}`);
}

if (/script-src[^;]*(?:'unsafe-inline'|'unsafe-eval')/.test(csp)) {
  throw new Error('script-src must not allow unsafe inline scripts or eval.');
}

for (const [header, expected] of Object.entries({
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'x-permitted-cross-domain-policies': 'none',
  'strict-transport-security': 'max-age=63072000; includeSubDomains; preload',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'cross-origin-opener-policy': 'same-origin-allow-popups',
})) {
  if (headerMap.get(header) !== expected) {
    throw new Error(`${header} must be set to: ${expected}`);
  }
}

const sourceRoot = new URL('../src/', import.meta.url);
const sourceRootPath = fileURLToPath(sourceRoot);
const sourceFiles = await readdir(sourceRoot, { recursive: true });
const dangerousSourcePatterns = [
  [/\[innerHTML\]/i, '[innerHTML]'],
  [/\bbypassSecurityTrust\w*\s*\(/, 'DomSanitizer bypass'],
  [/\bdocument\.write(?:ln)?\s*\(/, 'document.write'],
  [/\binsertAdjacentHTML\s*\(/, 'insertAdjacentHTML'],
  [/\beval\s*\(/, 'eval'],
  [/\bnew\s+Function\s*\(/, 'new Function'],
  [/\bsrcdoc\b/i, 'srcdoc'],
];

for (const file of sourceFiles.filter((name) => /\.(?:html|ts)$/.test(name))) {
  const contents = await readFile(join(sourceRootPath, file), 'utf8');
  for (const [pattern, label] of dangerousSourcePatterns) {
    if (pattern.test(contents)) {
      throw new Error(`Potential XSS sink (${label}) in source file: ${file}`);
    }
  }
}

const buildRoot = new URL('../dist/datingapp/browser/', import.meta.url);
const buildRootPath = fileURLToPath(buildRoot);
const files = await readdir(buildRoot, { recursive: true });

if (files.some((file) => file.endsWith('.map'))) {
  throw new Error('Production build contains source maps.');
}

const secretPattern =
  /MONGO_URI|TURNSTILE_SECRET|RESEND_API_KEY|re_[A-Za-z0-9]{20,}|mongodb(?:\+srv)?:\/\/|BEGIN .*PRIVATE KEY/;
for (const file of files.filter((name) => /\.(?:html|js|json|css)$/.test(name))) {
  const contents = await readFile(join(buildRootPath, file), 'utf8');
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
