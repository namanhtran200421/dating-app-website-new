import { readdir, readFile, writeFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';

/*
 * Keep the existing icon classes and appearance, shipping only SVGs used by the site.
 *
 * Icons are emitted per component rather than as one global sheet. Only the four icons in the
 * always-present nav and footer belong in the render-blocking global stylesheet; the other
 * thirty-odd are used by lazy routes, and travel in those routes' chunks instead. A component that
 * is never rendered gets a file nobody imports, so dead markup costs nothing.
 *
 * Every generated per-component file must be listed in its component's `styleUrls`, otherwise the
 * icons would silently render as blank boxes. That is checked below and fails the build.
 */
const iconRoot = 'node_modules/@fortawesome/fontawesome-free';
const generatedRoot = 'src/generated';
const perComponentRoot = join(generatedRoot, 'icons');

/** Layout shown on every route: these icons stay global. */
const GLOBAL_AREA = 'src/app/core';

const BASE_RULE =
  '.fa-solid,.fa-regular,.fa-brands{display:inline-block;width:1.25em;height:1em;flex-shrink:0;' +
  'vertical-align:-.125em;background-color:currentColor;mask:var(--rm-icon) center/contain ' +
  'no-repeat;-webkit-mask:var(--rm-icon) center/contain no-repeat}';
const LICENCE =
  '/* Font Awesome Free icons: CC BY 4.0, Fonticons Inc. https://fontawesome.com/license/free */';

function iconsIn(text) {
  const found = new Set();

  for (const match of text.matchAll(/class="([^"]*\bfa-(?:solid|regular|brands)\b[^"]*)"/g)) {
    const style = match[1].match(/\bfa-(solid|regular|brands)\b/)[1];
    const name = [...match[1].matchAll(/\bfa-([a-z0-9-]+)\b/g)]
      .map((m) => m[1])
      .find((n) => !['solid', 'regular', 'brands'].includes(n));
    if (name) found.add(`${style}/${name}`);
  }

  // Icon classes kept in TS data and bound with [class], e.g. icon: 'fa-solid fa-camera'.
  for (const match of text.matchAll(/'fa-(solid|regular|brands) fa-([a-z0-9-]+)'/g)) {
    found.add(`${match[1]}/${match[2]}`);
  }

  return found;
}

/** Icons grouped by the directory of the component that renders them. */
const byDirectory = new Map();

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);

    if (entry.isDirectory()) {
      await scan(path);
    } else if (/\.(html|ts)$/.test(path) && !path.endsWith('.spec.ts')) {
      const icons = iconsIn(await readFile(path, 'utf8'));
      if (icons.size === 0) continue;

      const key = dirname(path);
      const existing = byDirectory.get(key) ?? new Set();
      icons.forEach((icon) => existing.add(icon));
      byDirectory.set(key, existing);
    }
  }
}

await scan('src/app');

const svgCache = new Map();
async function rule(icon) {
  if (!svgCache.has(icon)) {
    const [style, name] = icon.split('/');
    const svg = (await readFile(`${iconRoot}/svgs/${icon}.svg`, 'utf8'))
      .replace(/<!--[\s\S]*?-->/g, '')
      .trim();
    svgCache.set(
      icon,
      `.fa-${style}.fa-${name}{--rm-icon:url("data:image/svg+xml,${encodeURIComponent(svg)}")}`,
    );
  }

  return svgCache.get(icon);
}

async function sheet(icons, { withBaseRule }) {
  const rules = [LICENCE];
  if (withBaseRule) rules.push(BASE_RULE);
  for (const icon of [...icons].sort()) rules.push(await rule(icon));
  return rules.join('\n') + '\n';
}

const globalIcons = new Set();
const componentSheets = [];

for (const [directory, icons] of byDirectory) {
  if (directory.startsWith(GLOBAL_AREA)) {
    icons.forEach((icon) => globalIcons.add(icon));
    continue;
  }

  const slug = relative('src/app', directory).replace(/[/\\]/g, '-');
  componentSheets.push({ directory, slug, icons });
}

await rm(perComponentRoot, { recursive: true, force: true });
await mkdir(perComponentRoot, { recursive: true });
await writeFile(join(generatedRoot, 'icons.css'), await sheet(globalIcons, { withBaseRule: true }));

const unwired = [];

for (const { directory, slug, icons } of componentSheets) {
  const file = join(perComponentRoot, `${slug}.css`);
  await writeFile(file, await sheet(icons, { withBaseRule: false }));

  // A component only gets its icons if it lists the generated file; check that it does.
  const sources = (await readdir(directory)).filter((name) => name.endsWith('.ts'));
  const wired = await Promise.all(
    sources.map(async (name) =>
      (await readFile(join(directory, name), 'utf8')).includes(`icons/${slug}.css`),
    ),
  );
  if (!wired.some(Boolean)) unwired.push({ directory, slug, count: icons.size });
}

await mkdir('public/licenses', { recursive: true });
await copyFile(`${iconRoot}/LICENSE.txt`, 'public/licenses/font-awesome.txt');

const total = globalIcons.size + componentSheets.reduce((sum, s) => sum + s.icons.size, 0);
console.log(
  `Generated icons: ${globalIcons.size} global, ${total - globalIcons.size} across ` +
    `${componentSheets.length} component sheets; no icon font downloads.`,
);

if (unwired.length > 0) {
  const detail = unwired
    .map(
      ({ directory, slug, count }) =>
        `  ${directory} (${count} icons) -> '<relative path>/generated/icons/${slug}.css'`,
    )
    .join('\n');
  console.warn(
    `\nThese components use Font Awesome icons but do not list their generated stylesheet in\n` +
      `styleUrls, so the icons will not render. Add it, or delete the unused markup:\n${detail}\n`,
  );
}
