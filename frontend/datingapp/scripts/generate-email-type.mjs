// Renders the DynaPuff lines used by the backend's automatic emails (backend/src/services/
// autoReplyEmail.ts) to PNGs. Gmail and Outlook ignore web fonts, so display type has to ship as
// images for the emails to match the site. Run `npm run email:type` after changing any line below,
// then update the sizes in EMAIL_TYPE if they changed; the PNGs are committed.
//
// Each image bakes in the surface it sits on, so it stays legible when a client inverts colours.
import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';

const ink = '#202131';
const paper = '#fbf8ef';

const lines = [
  { file: 'brand-nav', text: 'Rosemarry', size: 26, tracking: -1, color: ink, surface: paper, logo: 44 },
  { file: 'title-contact', text: 'We got your message', size: 56, tracking: -2.5, color: ink, surface: paper },
  { file: 'title-early-access', text: 'You’re on the list', size: 56, tracking: -2.5, color: ink, surface: paper },
];

// Inlined because a page built with setContent cannot read file:// URLs.
const dataUrl = async (path, type) =>
  `data:${type};base64,${(await readFile(resolve(path))).toString('base64')}`;
const fontUrl = await dataUrl('public/fonts/dynapuff-latin.woff2', 'font/woff2');
const logoUrl = await dataUrl('public/img/rosemarry/rose-hand-logo-264.png', 'image/png');
const outputDir = resolve('public/images/email');
await mkdir(outputDir, { recursive: true });

const html = `<!doctype html>
<style>
  @font-face { font-family: 'DynaPuff'; src: url('${fontUrl}') format('woff2'); font-weight: 400 700; }
  body { margin: 0; padding: 20px; }
  .line {
    display: inline-flex; align-items: center; gap: 8px; margin: 0 0 20px;
    font-family: 'DynaPuff'; font-weight: 700; white-space: nowrap;
  }
  .line img { height: auto; }
</style>
${lines
  .map(
    (line) =>
      `<div><span class="line" id="${line.file}" style="font-size:${line.size}px;line-height:${line.size}px;padding:${Math.round(line.size * 0.12)}px ${Math.round(line.size * 0.06)}px;letter-spacing:${line.tracking}px;color:${line.color};background:${line.surface};">${
        line.logo ? `<img src="${logoUrl}" alt="" style="width:${line.logo}px">` : ''
      }${line.text}</span></div>`,
  )
  .join('\n')}`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2, viewport: { width: 1000, height: 800 } });
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
if (!(await page.evaluate(() => document.fonts.check("700 20px 'DynaPuff'")))) {
  throw new Error('DynaPuff did not load; refusing to write fallback-font images.');
}

// Whole-pixel boxes, so the baked-in surface has no half-blended edge rows.
await page.$$eval('.line', (elements) => {
  for (const element of elements) {
    const { width, height } = element.getBoundingClientRect();
    element.style.width = `${Math.ceil(width)}px`;
    element.style.height = `${Math.ceil(height)}px`;
    element.style.boxSizing = 'border-box';
  }
});

const sizes = {};
for (const line of lines) {
  const element = page.locator(`#${line.file}`);
  const box = await element.boundingBox();
  await element.screenshot({ path: `${outputDir}/${line.file}.png` });
  sizes[line.file] = { width: Math.round(box.width), height: Math.round(box.height) };
}
await browser.close();

console.log(`Email type written to ${outputDir} (2x). CSS sizes for EMAIL_TYPE:`);
console.log(JSON.stringify(sizes, null, 2));
