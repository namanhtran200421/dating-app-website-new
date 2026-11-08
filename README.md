# Rosemarry Website

An Angular marketing website with an Express and MongoDB API for contact messages and verified early-access signups.

This repository contains the public website and signup workflow. The mobile application is a [separate project](https://github.com/namanhtran200421/AI_DATING_APP).

## Technical highlights

- **Search-friendly rendering:** prerendered public routes, generated sitemaps, and automated SEO checks.
- **Double opt-in:** signup records remain pending until a single-use email token is consumed.
- **Abuse controls:** address validation, bounded DNS checks, Cloudflare Turnstile, and MongoDB-backed rate limits.
- **Reliable email state:** signed Resend webhooks and idempotent event handling distinguish API acceptance from delivery.
- **Subscription lifecycle:** confirmation, resend cooldowns, bounce handling, unsubscribe links, and retention settings.
- **Verification:** API workflow tests, Angular tests, and Playwright browser tests; the documented signup tests mock external services.

## Architecture

```text
Angular website
  → Express API
  → MongoDB signup / contact records
  → Resend verification emails and signed delivery webhooks
```

## Explore the code

| Area | Entry point |
| --- | --- |
| Website, build wrappers, SEO, and browser tests | [Frontend README](frontend/datingapp/README.md) |
| Signup state, webhook contract, and API configuration | [Backend README](backend/README.md) |
| Automated checks | [GitHub workflow](.github/workflows/seo-checks.yml) |
| Security guidance | [SECURITY.md](SECURITY.md) |

## Local development

Use Node.js 24. Configure your own development MongoDB and service settings using the [backend guide](backend/README.md#required-environment).

In separate terminals:

```bash
cd backend
npm ci
npm run dev
```

```bash
cd frontend/datingapp
npm ci
npm start
```

Use the npm build wrapper rather than invoking Angular directly: it generates required assets and the sitemap.

## Verify

```bash
cd backend
npm test
```

```bash
cd frontend/datingapp
npm run build
npm run check:seo
npm test -- --watch=false
npx playwright install chromium
npm run test:e2e
```

MongoDB-backed rate-limit tests require a disposable `MONGO_TEST_URI`; otherwise those tests are skipped. Use test configuration for external services to avoid sending real email or creating real registrations. See the component guides for the full verification requirements.

