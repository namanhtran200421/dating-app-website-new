import { readdir, readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { join } from 'node:path';

// Keep the existing icon classes and appearance, shipping only SVGs used by the site.
const iconRoot = 'node_modules/@fortawesome/fontawesome-free';
const used = new Set();
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await scan(path);
    else if (/\.(html|ts)$/.test(path)) {
      const text = await readFile(path, 'utf8');
      for (const match of text.matchAll(/class="([^"]*\bfa-(?:solid|regular|brands)\b[^"]*)"/g)) {
        const style = match[1].match(/\bfa-(solid|regular|brands)\b/)[1];
        const name = [...match[1].matchAll(/\bfa-([a-z0-9-]+)\b/g)].map((m) => m[1]).find((n) => !['solid', 'regular', 'brands'].includes(n));
        if (name) used.add(`${style}/${name}`);
      }
    }
  }
}
await scan('src/app');
const rules = [
  '/* Font Awesome Free icons: CC BY 4.0, Fonticons Inc. https://fontawesome.com/license/free */',
  '.fa-solid,.fa-regular,.fa-brands{display:inline-block;width:1.25em;height:1em;flex-shrink:0;vertical-align:-.125em;background-color:currentColor;mask:var(--rm-icon) center/contain no-repeat;-webkit-mask:var(--rm-icon) center/contain no-repeat}',
];
for (const icon of [...used].sort()) {
  const [style, name] = icon.split('/');
  const svg = (await readFile(`${iconRoot}/svgs/${icon}.svg`, 'utf8')).replace(/<!--[\s\S]*?-->/g, '').trim();
  rules.push(`.fa-${style}.fa-${name}{--rm-icon:url("data:image/svg+xml,${encodeURIComponent(svg)}")}`);
}
await mkdir('src/generated', { recursive: true });
await writeFile('src/generated/icons.css', rules.join('\n') + '\n');
await mkdir('public/licenses', { recursive: true });
await copyFile(`${iconRoot}/LICENSE.txt`, 'public/licenses/font-awesome.txt');
console.log(`Generated ${used.size} used icons; no icon font downloads.`);
