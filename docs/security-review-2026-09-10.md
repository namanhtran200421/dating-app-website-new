# Security Review — rosemarry.app

**Date:** 2026-09-10
**Scope:** `backend/` (Express 5 + Mongoose API at `rosemarry-api.onrender.com`),
`frontend/datingapp/` (Angular, served by Vercel at `www.rosemarry.app`),
repository hygiene, and non-destructive live checks against production.
**Reviewer:** Automated security review (owner-authorized).

---

## 1. Method and boundaries

This review combined a full read of the backend source with a small number of
**single, non-destructive requests** to the live site (security-header
inspection, exposed-file probes, one CORS check, one rate-limit-header read).

**A live denial-of-service / "crash it" test was deliberately NOT performed.**
Flooding a production host degrades service for real users, can breach the
hosting provider's terms, and incurs cost, and there is no way to prove from
here that the same person also controls the Render and Vercel accounts. The more
productive path — reading the actual code for the bug classes that matter and
verifying the deployed configuration — is what was done instead.

---

## 2. Overall assessment

**The application is well built and has a small, well-defended attack surface.**
It is a marketing site plus three write endpoints (pre-signup email capture, a
contact form, and aggregate-only analytics). There is **no user authentication,
no user profiles, no messaging, and no photo storage**, so the classic dating-app
risks (auth bypass, IDOR on profiles/messages, media access control) do not
apply here.

Controls already done correctly (verified in code and, where noted, live):

- **Full Helmet header suite** on the API — HSTS, CSP, `X-Content-Type-Options`,
  `X-Frame-Options`, `Referrer-Policy: no-referrer`, COOP/CORP. *(verified live)*
- **CORS allowlist** restricted to the two production origins; a forged
  `Origin: https://evil.example` is not reflected. *(verified live)*
- **Strict input validation** with Zod `strictObject` + enums on every endpoint,
  rejecting unknown keys — no mass-assignment, no free-text injection.
- **NoSQL-injection defence in depth**: `mongoose.set('sanitizeFilter', true)`
  plus `strict: "throw"` schemas plus enum/regex field constraints.
- **Body limits**: `express.json({ limit: "32kb", strict: true })` — an oversized
  body returns 413, so the JSON parser cannot be used to exhaust memory.
- **Turnstile CAPTCHA** on both write forms, validating `success`, `hostname`,
  and `action`, with the token stripped before persistence.
- **Per-route rate limiting** (`express-rate-limit`, fails closed on store error).
- **No static file serving** — `/.env`, `/.git/config`, `/package.json`, and
  path-traversal probes all return 404. *(verified live)*
- **No ReDoS** — the name/message regexes are linear (no nested quantifiers).
- **Generic error responses** — the error handler never leaks stack traces,
  and success responses never echo stored records or database ids.
- **Privacy-respecting retention** — TTL indexes auto-expire stored data;
  analytics stores only aggregate counts (no IPs, no visitor ids, no PII).
- **Fail-secure defaults** — `NODE_ENV` defaults to `production`, port and
  retention values are validated at startup, `MONGO_URI` is required.
- **`.env` is not in git history** and is covered by `backend/.gitignore`.
- **Vercel challenge mitigation** is active on the frontend. *(verified live —
  the site returned an `x-vercel-mitigated: challenge` response to automated
  access, indicating edge bot/DDoS protection.)*

---

## 3. Findings

| # | Severity | Finding | Status |
|---|----------|---------|--------|
| 1 | Medium | Rate-limit client identity relied on a hardcoded proxy hop count that live headers contradict (Cloudflare fronts Render) | **Patched** |
| 2 | Low | Analytics `Origin` check is bypassable by non-browser clients (bounded aggregate pollution) | Documented + comment added |
| 3 | Low | No root `.gitignore`; two `.DS_Store` files committed | **Patched** |
| 4 | Info | `RateLimit-Policy` response header exposes an internal partition key | Optional (see below) |
| 5 | Info | In-memory rate-limit store resets on restart / not shared across instances | Recommendation only |
| 6 | Info | Stray space in `.env` key (`TURNSTILE_SECRET =`) — fragile but working | **Patched** |

---

### Finding 1 — Rate-limit key depended on an unverified proxy assumption (Medium)

**Location:** `backend/src/app.ts`

The code set `app.set("trust proxy", 1)` with the comment *"Render is the only
network path to this process and contributes one proxy hop."* Live response
headers contradict that: every API response carries `cf-ray` and
`server: cloudflare`, i.e. requests traverse **Cloudflare → Render → Express**,
not a single hop.

**Why it matters for availability.** `express-rate-limit` derives its per-client
key from `req.ip`, which depends entirely on the `trust proxy` hop count. If the
count is wrong, the key is wrong, and one of two failure modes results:

- **Too low** → many clients collapse onto one upstream proxy IP and share a
  single rate-limit bucket. An attacker in the same Cloudflare region could then
  exhaust the shared limit and lock out legitimate users — an amplified,
  low-effort availability attack, which is precisely the resilience this review
  was asked to test.
- **Too high** → the client-supplied `X-Forwarded-For` becomes trusted and the
  key is spoofable, letting an attacker rotate fake IPs to evade the limit
  entirely.

The exact hop count cannot be proven remotely without the flooding this review
declined, so the fix does not guess it.

**Fix applied.** Rate-limit keys are now derived from Cloudflare's
`CF-Connecting-IP` request header, which carries the true client address and —
because the origin is reachable only through Cloudflare's edge — cannot be forged
by a direct client. It falls back to `req.ip` when the header is absent (local
dev / tests). The `trust proxy` value was additionally made configurable via a
`TRUSTED_PROXY_HOPS` env var so `req.ip` can be corrected without a code change.
A regression test locks in that `CF-Connecting-IP` takes precedence over
`X-Forwarded-For`.

**Still recommended (operational):** confirm on Render that inbound requests
actually carry `CF-Connecting-IP`, and that the `*.onrender.com` origin cannot be
reached by bypassing Cloudflare. If a direct origin path exists, add a check that
the immediate peer is a Cloudflare IP before trusting the header.

---

### Finding 2 — Analytics `Origin` gate is not a security boundary (Low)

**Location:** `backend/src/analytics/analytics.ts`

The analytics endpoint has no CAPTCHA (by design — it fires on page load) and
gates writes on `req.get("origin")`. `Origin` is a request header that only
browsers set honestly; a scripted client sets any value it likes. Confirmed live:
a request with a forged `Origin: https://www.rosemarry.app` passed the gate and
reached schema validation.

**Impact is bounded and low.** An attacker can inflate aggregate counters, but:
the payload is constrained to strict enums (no injection, no arbitrary paths or
free text), writes are rate-limited per IP, only counts are stored (no PII), and
buckets auto-expire after 400 days. The worst case is skewed marketing analytics,
not data compromise or outage.

**Action taken.** A comment now documents that the `Origin` check is best-effort,
not a security control, so it is not mistaken for one later. No functional change
is warranted for a public, unauthenticated analytics beacon. If accuracy of the
numbers becomes important, consider a short-lived signed beacon token issued to
the page, or reconcile analytics against server-side signup totals.

---

### Finding 3 — No root `.gitignore`; `.DS_Store` committed (Low)

**Location:** repository root

The repository root had no `.gitignore` (only `backend/` and
`frontend/datingapp/` did), and two macOS `.DS_Store` files were tracked.
`.DS_Store` leaks local directory/file names, and — more importantly — the
absence of root ignore rules means a future `git add .` at the root could stage a
secret placed there.

**Fix applied.** Added a root `.gitignore` covering OS cruft, `.env*`, keys,
`node_modules/`, build output, and logs; untracked the two `.DS_Store` files.

---

### Finding 4 — `RateLimit-Policy` exposes an internal partition key (Info)

The draft-8 rate-limit headers include `pk=:...:`, a hashed partition key derived
from the client key. It is hashed and low-value, but it is unnecessary exposure.
Optional: keep `standardHeaders: "draft-8"` for the useful limit/remaining fields
but be aware the policy header carries this token; there is no need to act unless
you want to minimise metadata.

---

### Finding 5 — In-memory rate-limit store (Info)

The default `MemoryStore` resets on every process restart and is not shared if
Render ever runs more than one instance, weakening the limit under those
conditions. For a single free-tier instance this is acceptable. If you scale
horizontally, move to a shared store (e.g. Redis via `rate-limit-redis`).

---

### Finding 6 — Stray space in `.env` key (Info)

`TURNSTILE_SECRET =...` had a space before `=`. `dotenv` trims keys so it works
today, but the whitespace is fragile and confusing. Normalised to
`TURNSTILE_SECRET=...`.

---

## 4. Patches applied in this review

- `backend/src/app.ts` — `CF-Connecting-IP`-based rate-limit key
  (`resolveClientKey`), `TRUSTED_PROXY_HOPS` env override, imports/helpers.
- `backend/src/app.test.ts` — new regression test for CF-Connecting-IP keying.
- `backend/src/analytics/analytics.ts` — clarifying comment on the `Origin` gate.
- `.gitignore` (new, repository root) — OS/secret/build ignore rules.
- Untracked `.DS_Store` and `frontend/.DS_Store`.
- `backend/.env` — removed stray space in the `TURNSTILE_SECRET` key (local only,
  not tracked by git).

All 10 backend tests pass and the TypeScript build is clean after these changes.

## 5. Operational follow-ups (no code change)

1. Verify on Render that `CF-Connecting-IP` is present inbound and that the
   origin cannot be reached bypassing Cloudflare (Finding 1).
2. Consider a shared rate-limit store if you scale beyond one instance (Finding 5).
3. Rotate `TURNSTILE_SECRET` and `MONGO_URI` if they were ever pasted into chat,
   screenshots, or shared logs (general hygiene — not observed leaked here).
