# Rosemarry website

Angular marketing website, prerendered for search engines and deployed through the Vercel Git integration.

## Develop and build

Use Node 24 and install dependencies with `npm ci`. Start with `npm start`; this generates the icon styles before Angular starts. Build with `npm run build`, which generates only the icons used by the templates, prerenders the public routes and regenerates the sitemap from indexable output. Deploy output is `dist/datingapp/browser`.

Do not invoke `ng build` directly: the wrapper scripts generate required assets and the sitemap. Self-hosted fonts are checked in under `public/fonts` with licenses. `scripts/prepare-fonts.py` documents one-off regeneration; fontTools with Brotli support is required only to regenerate them.

## Verify

```bash
npm run build
npm run check:seo
npm test -- --watch=false
npx playwright install chromium
npm run test:e2e
```

`npm run preview` serves the production build on http://127.0.0.1:4173. Playwright starts it automatically when needed. Signup tests mock Turnstile and the API; they create no real registrations. The GitHub workflow also runs backend tests.

After deployment run `npm run check:live`, then `npm run indexnow -- --check`. Submit with `npm run indexnow` only after the production key and updated pages are public. HTTP receipt is not an indexing guarantee.

## Content and measurement

Journal summaries and full articles live in `src/app/pages/blog/article-catalog.ts` and `article-content.ts`. Change modification dates only for substantive updates.

`npm run search:report` and `npm run search:inspect` read Google Search Console and require an authorized `GOOGLE_ACCESS_TOKEN`. Never commit credentials.

## Automatic email type

The backend's automatic emails show their copy as images so Gmail and Outlook render the site's fonts. After changing a line in `scripts/generate-email-type.mjs`, run `npm run email:type`, copy the printed sizes into `EMAIL_TYPE` in `backend/src/services/autoReplyEmail.ts`, and bump `EMAIL_TYPE_VERSION`. Deploy the website before the backend sends emails that use new images.

See [search visibility runbook](../../docs/search-visibility-runbook.md) and [content and promotion plan](../../docs/visibility-content-and-promotion.md) for authenticated indexing tasks, profile copy, social drafts and measurement definitions.
