// Renders scripts/social-card.html to the versioned Open Graph image (1200 x 630),
// the Open Graph / Twitter card and the press kit's social artwork. Run on demand with
// `npm run social:image` after the card design changes; the PNG is committed.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { stat } from 'node:fs/promises';

const source = resolve('scripts/social-card.html');
const output = resolve('public/images/rosemarry-social-20260920.png');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.goto(pathToFileURL(source).href, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: output, clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();

const { size } = await stat(output);
console.log(`Social card written: ${output} (${Math.round(size / 1024)} KB)`);
