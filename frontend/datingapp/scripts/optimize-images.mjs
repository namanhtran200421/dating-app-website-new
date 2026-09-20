import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

/*
 * Builds the responsive AVIF/WebP variants the templates point at.
 *
 * Sources in public/images are the full-resolution originals and stay untouched; everything
 * generated lands in public/img (git-ignored, rebuilt on every `npm run build`). The templates
 * reference the generated files through <picture>, with the original left as the <img> fallback,
 * so a browser without AVIF/WebP still gets the picture it used to get.
 *
 * `widths` are CSS pixels the image is actually painted at, doubled for retina where it matters.
 * Nothing is ever upscaled: a width larger than the source is dropped.
 */
const OUTPUT_ROOT = 'public/img';
const SOURCE_ROOT = 'public/images';
const MANIFEST = join(OUTPUT_ROOT, '.manifest.json');

/** Quality settings picked to stay visually indistinguishable from the JPEG originals. */
const AVIF = { quality: 52, effort: 4, chromaSubsampling: '4:2:0' };
const WEBP = { quality: 74, effort: 4 };

const recipes = [
  // Hero collage. The cards are ~280-340 CSS px wide; card one scales its image 1.72x.
  { src: 'rosemarry/hero-candid-concert.jpg', widths: [360, 720, 1080] },
  { src: 'rosemarry/hero-two-people.jpg', widths: [360, 720] },
  { src: 'rosemarry/hero-friends.jpg', widths: [360, 720] },
  { src: 'rosemarry/hero-reaction.jpg', widths: [300, 600] },

  // "People don't" story deck: clamp(210px, 24vw, 300px) cards.
  { src: 'rosemarry/story-stranger.jpg', widths: [240, 360, 560] },
  { src: 'rosemarry/story-familiar.jpg', widths: [240, 360, 560] },
  { src: 'rosemarry/story-friend.jpg', widths: [240, 360, 560] },
  { src: 'rosemarry/story-partner.jpg', widths: [240, 360, 560] },

  // Swipe deck profiles: four across at ~250 CSS px, one across at ~320 on a phone.
  { src: 'rosemarry/profile-elena.jpg', widths: [240, 360, 560] },
  { src: 'rosemarry/profile-priya.jpg', widths: [240, 360, 560] },
  { src: 'rosemarry/profile-daniel.jpg', widths: [240, 360, 560] },
  { src: 'rosemarry/profile-mia-original.jpg', widths: [240, 360, 560] },
  { src: 'rosemarry/profile-steve-candid.jpg', widths: [240, 360, 560] },
  { src: 'rosemarry/profile-asha-original.jpg', widths: [240, 360, 560] },
  { src: 'rosemarry/profile-jonah-original.jpg', widths: [240, 360, 560] },

  // Blog hero band.
  { src: 'rosemarry/hero-group.jpg', widths: [640, 1280] },

  // Press kit downloads stay lossless; only the on-page previews are re-encoded.
  { src: 'rosemarry/logo-160.png', widths: [160, 320] },
  { src: 'rosemarry-social.png', widths: [600, 1200] },

  /*
   * The wordmark is 1080x810 and was being served at full size for a 48px nav logo and, worse,
   * as the favicon on every page. These are the sizes it is actually drawn at.
   */
  {
    src: 'rosemarry/rose-hand-logo.png',
    widths: [132, 264],
    png: [32, 180, 264],
  },
];

const manifest = await readFile(MANIFEST, 'utf8')
  .then((text) => JSON.parse(text))
  .catch(() => ({}));

const fingerprints = {};
let written = 0;
let skipped = 0;

for (const recipe of recipes) {
  const sourcePath = join(SOURCE_ROOT, recipe.src);
  const source = await stat(sourcePath);
  const image = sharp(sourcePath);
  const { width: sourceWidth } = await image.metadata();
  const stem = recipe.src.replace(/\.[^.]+$/, '');

  const jobs = [
    ...recipe.widths.map((width) => ({ width, format: 'avif' })),
    ...recipe.widths.map((width) => ({ width, format: 'webp' })),
    ...(recipe.png ?? []).map((width) => ({ width, format: 'png' })),
  ].filter((job) => job.width <= sourceWidth);

  for (const { width, format } of jobs) {
    const target = join(OUTPUT_ROOT, `${stem}-${width}.${format}`);
    const key = createHash('sha1')
      .update(`${sourcePath}:${source.size}:${source.mtimeMs}:${width}:${format}:2`)
      .digest('hex');
    fingerprints[target] = key;

    if (manifest[target] === key && (await stat(target).catch(() => null))) {
      skipped += 1;
      continue;
    }

    const pipeline = sharp(sourcePath).resize({ width, withoutEnlargement: true });
    const encoded =
      format === 'avif'
        ? pipeline.avif(AVIF)
        : format === 'webp'
          ? pipeline.webp(WEBP)
          : pipeline.png({ compressionLevel: 9, palette: true });

    await mkdir(dirname(target), { recursive: true });
    await encoded.toFile(target);
    written += 1;
  }
}

// Drop variants left behind by an earlier recipe so the deploy carries nothing unreferenced.
let pruned = 0;
for (const entry of await readdir(OUTPUT_ROOT, { recursive: true, withFileTypes: true })) {
  if (entry.isDirectory()) continue;
  const path = join(entry.parentPath, entry.name);
  if (path !== MANIFEST && !(path in fingerprints)) {
    await rm(path);
    pruned += 1;
  }
}

await mkdir(OUTPUT_ROOT, { recursive: true });
await writeFile(MANIFEST, JSON.stringify(fingerprints, null, 2));
console.log(
  `Optimised images: ${written} written, ${skipped} already current, ${pruned} stale removed.`,
);
