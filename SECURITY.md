# Rosemarry security baseline

Security is a continuing process, not a guarantee that a site can never be
compromised. This repository enforces the following baseline for the public
website and its two form endpoints.

## Application controls

- Angular renders untrusted text through normal template bindings. The build
  check rejects high-risk HTML and JavaScript injection sinks.
- The frontend has an enforced Content Security Policy with no inline or eval
  script execution, plus HSTS, clickjacking, MIME-sniffing, referrer, and
  browser-permission protections.
- Form requests must be JSON and must carry an exact production Origin. The API
  does not use cookies or browser sessions, and CORS credentials are disabled.
- Cloudflare Turnstile tokens are verified server-side against the expected
  action and hostname before a request reaches a controller.
- Zod strict-object schemas accept only typed, length-bounded form fields.
  Controllers construct database operations from parsed values instead of
  passing request objects to MongoDB. Mongoose filter sanitization, strict
  queries, strict models, and model validators provide additional layers.
- The early-access endpoint permits 10 requests per client IP per 15 minutes;
  contact permits 5. Limits run before JSON parsing. Render and Vercel also
  provide platform DDoS protection.
- API and form responses are non-cacheable and do not echo submitted personal
  information or internal database fields.

## Operational requirements

- Keep `MONGO_URI`, `TURNSTILE_SECRET`, and `RESEND_API_KEY` only in local
  ignored `.env` files and Render secret environment variables. Rotate any key
  that appears in source control, logs, screenshots, or support messages.
- Restrict the MongoDB user to the Rosemarry database and the minimum required
  read/write permissions. Restrict network access to the hosting environment
  where practical, and keep provider backups enabled.
- Keep Render's default proxy topology unless `TRUSTED_PROXY_HOPS` has been
  verified against the live service. A wrong value can weaken IP rate limiting.
- Review `npm audit`, Render logs, Turnstile analytics, Resend activity, and
  Vercel Firewall events regularly. Apply dependency updates promptly and run
  the complete test suite before deployment.
- The current rate-limit store is per API process. Before running more than one
  Render instance, replace it with a shared store or add edge rate limiting so
  all instances share the same counters.

## Verification

Run these checks before deployment:

```sh
cd backend
npm test
npm audit --audit-level=moderate

cd ../frontend/datingapp
npm run build
npm run check:security
npm test -- --watch=false
npm run test:e2e
npm audit --audit-level=moderate
```
