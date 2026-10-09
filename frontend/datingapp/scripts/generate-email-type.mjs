// Renders the fixed lines of the backend's automatic emails (backend/src/services/
// autoReplyEmail.ts) to PNGs. Gmail and Outlook ignore web fonts, so text has to ship as images
// for the emails to use DynaPuff and Playpen Sans like the site. Run `npm run email:type` after
// changing any line below, then update EMAIL_TYPE with the printed sizes; the PNGs are committed.
//
// Each image bakes in the surface it sits on, so it stays legible when a client inverts colours.
import { chromium } from '@playwright/test';
import { resolve } from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';

const ink = '#202131';
const paper = '#fbf8ef';
const white = '#ffffff';
const pink = '#ed77a8';
const rose = '#d81e4a';
const quiet = '#6f6b78';

const display = { family: 'DynaPuff', weight: 700 };
const body = { family: 'Playpen Sans', weight: 400 };
const bodyBold = { family: 'Playpen Sans', weight: 700 };

// `wrap` gives a fixed width (CSS px) for lines that should break onto several lines.
const lines = [
  {
    file: 'brand-nav',
    text: 'Rosemarry',
    font: display,
    size: 26,
    tracking: -1,
    color: ink,
    surface: paper,
    logo: 44,
  },
  {
    file: 'title-contact',
    text: 'We got your message',
    font: display,
    size: 56,
    tracking: -2.5,
    color: ink,
    surface: paper,
  },
  {
    file: 'title-contact-feedback',
    text: 'Feedback received',
    font: display,
    size: 56,
    tracking: -2.5,
    color: ink,
    surface: paper,
  },
  {
    file: 'title-contact-partnerships',
    text: 'Let’s talk soon',
    font: display,
    size: 56,
    tracking: -2.5,
    color: ink,
    surface: paper,
  },
  {
    file: 'title-contact-press',
    text: 'We got your request',
    font: display,
    size: 56,
    tracking: -2.5,
    color: ink,
    surface: paper,
  },
  {
    file: 'title-early-access',
    text: 'Confirm your email',
    font: display,
    size: 56,
    tracking: -2.5,
    color: ink,
    surface: paper,
  },
  {
    file: 'title-confirmed',
    text: 'Email confirmed',
    font: display,
    size: 56,
    tracking: -2.5,
    color: ink,
    surface: paper,
  },
  {
    file: 'message-contact',
    text: 'Thanks so much for reaching out! We’ll get back to you soon.',
    font: body,
    size: 18,
    color: ink,
    surface: white,
    wrap: 330,
  },
  {
    file: 'message-contact-feedback',
    text: 'Thank you! We read every note, and yours helps shape Rosemarry.',
    font: body,
    size: 18,
    color: ink,
    surface: white,
    wrap: 330,
  },
  {
    file: 'message-contact-partnerships',
    text: 'Thanks for thinking of Rosemarry! We’ll review your idea and reply soon.',
    font: body,
    size: 18,
    color: ink,
    surface: white,
    wrap: 330,
  },
  {
    file: 'message-contact-press',
    text: 'Thanks for your interest in Rosemarry! We’ll reply with what you need soon.',
    font: body,
    size: 18,
    color: ink,
    surface: white,
    wrap: 330,
  },
  {
    file: 'reference-label',
    text: 'Your reference',
    font: bodyBold,
    size: 13,
    color: quiet,
    surface: paper,
  },
  {
    file: 'message-early-access',
    text: 'Tap below to confirm you want Rosemarry early-access updates.',
    font: body,
    size: 18,
    color: ink,
    surface: white,
    wrap: 330,
  },
  {
    file: 'message-confirmed',
    text: 'You’re confirmed and on the Rosemarry early-access list.',
    font: body,
    size: 18,
    color: ink,
    surface: white,
    wrap: 330,
  },
  {
    file: 'button-early-access',
    text: 'Confirm my email',
    font: bodyBold,
    size: 15,
    color: ink,
    surface: pink,
  },
  { file: 'signoff-warmly', text: 'Warmly,', font: body, size: 16, color: ink, surface: white },
  {
    file: 'signoff-team',
    text: 'The Rosemarry team',
    font: display,
    size: 20,
    color: rose,
    surface: white,
  },
  {
    file: 'footer-note',
    text: 'Automatic email from Rosemarry. Replies aren’t monitored.',
    font: body,
    size: 12,
    color: quiet,
    surface: paper,
  },
];

// Inlined because a page built with setContent cannot read file:// URLs.
const dataUrl = async (path, type) =>
  `data:${type};base64,${(await readFile(resolve(path))).toString('base64')}`;
const dynaPuffUrl = await dataUrl('public/fonts/dynapuff-latin.woff2', 'font/woff2');
const playpenUrl = await dataUrl('public/fonts/playpen-sans-latin.woff2', 'font/woff2');
const logoUrl = await dataUrl('public/img/rosemarry/rose-hand-logo-264.png', 'image/png');
const outputDir = resolve('public/images/email');
await mkdir(outputDir, { recursive: true });

function lineStyle(line) {
  const padding =
    line.font === display
      ? `${Math.round(line.size * 0.12)}px ${Math.round(line.size * 0.06)}px`
      : '2px 0';
  const lineHeight = line.wrap
    ? Math.round(line.size * 1.55)
    : Math.round(line.size * (line.font === display ? 1 : 1.3));
  return [
    `font-family:'${line.font.family}'`,
    `font-weight:${line.font.weight}`,
    `font-size:${line.size}px`,
    `line-height:${lineHeight}px`,
    `letter-spacing:${line.tracking ?? 0}px`,
    `padding:${padding}`,
    `color:${line.color}`,
    `background:${line.surface}`,
    line.wrap ? `width:${line.wrap}px;white-space:normal;display:inline-block` : '',
  ].join(';');
}

const html = `<!doctype html>
<style>
  @font-face { font-family: 'DynaPuff'; src: url('${dynaPuffUrl}') format('woff2'); font-weight: 400 700; }
  @font-face { font-family: 'Playpen Sans'; src: url('${playpenUrl}') format('woff2'); font-weight: 400 700; }
  body { margin: 0; padding: 20px; }
  .line { display: inline-flex; align-items: center; gap: 8px; margin: 0 0 20px; white-space: nowrap; }
  .line img { height: auto; }
</style>
${lines
  .map(
    (line) =>
      `<div><span class="line" id="${line.file}" style="${lineStyle(line)}">${
        line.logo ? `<img src="${logoUrl}" alt="" style="width:${line.logo}px">` : ''
      }${line.text}</span></div>`,
  )
  .join('\n')}`;

const browser = await chromium.launch();
const page = await browser.newPage({
  deviceScaleFactor: 2,
  viewport: { width: 1000, height: 1200 },
});
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
for (const font of ["700 20px 'DynaPuff'", "400 20px 'Playpen Sans'"]) {
  if (!(await page.evaluate((spec) => document.fonts.check(spec), font))) {
    throw new Error(`${font} did not load; refusing to write fallback-font images.`);
  }
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
