import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('dist/datingapp/browser');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png', '.avif': 'image/avif', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    let file = resolve(root, `.${pathname}`);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end(); return;
    }
    if ((await stat(file).catch(() => null))?.isDirectory()) file = resolve(file, 'index.html');
    let body;
    let status = 200;
    try { body = await readFile(file); }
    catch { file = resolve(root, '404.html'); body = await readFile(file); status = 404; }
    res.writeHead(status, { 'content-type': types[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(400).end(); }
}).listen(4173, '127.0.0.1', () => console.log('Production build: http://127.0.0.1:4173'));
