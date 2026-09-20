/**
 * Builds the `srcset` strings for the AVIF/WebP variants that `scripts/optimize-images.mjs`
 * writes into `public/img`, next to the untouched original used as the `<img>` fallback.
 *
 * The widths passed here must match the recipe for the same file in that script, otherwise the
 * browser asks for a variant that was never generated.
 */
export interface ResponsiveImage {
  /** Original full-resolution file, used as the `<img src>` fallback. */
  readonly src: string;
  readonly avif: string;
  readonly webp: string;
}

export function responsiveImage(
  path: string,
  widths: readonly number[],
  extension: 'jpg' | 'png' = 'jpg',
): ResponsiveImage {
  const stem = `/img/${path}`;

  return {
    src: `/images/${path}.${extension}`,
    avif: srcset(stem, widths, 'avif'),
    webp: srcset(stem, widths, 'webp'),
  };
}

function srcset(stem: string, widths: readonly number[], format: string): string {
  return widths.map((width) => `${stem}-${width}.${format} ${width}w`).join(', ');
}
