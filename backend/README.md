# Rosemarry API

Express and MongoDB API for Rosemarry's contact and early-access forms.

## Early-access double opt-in

An early-access request is not a newsletter subscription until its email is
confirmed. The workflow is:

1. Normalise and validate the address with `validator.js`.
2. Reject known disposable domains and check DNS for MX, Null MX, and A/AAAA
   fallback records with a bounded timeout.
3. Verify Cloudflare Turnstile and apply per-IP and per-address limits.
4. Store the signup as `PENDING`, keeping only a SHA-256 hash of a random
   256-bit, single-use verification token.
5. Send a Resend transactional verification email. The token is placed in a URL
   fragment so it is not sent to Vercel in the initial page request.
6. Atomically consume an unexpired token and move the record to `VERIFIED`.

Only records matching `{ status: "VERIFIED" }` are eligible for future
newsletter campaigns. `PENDING`, `BOUNCED`, and `UNSUBSCRIBED` records must not
be exported or sent campaigns. DNS checks establish only that a domain can
receive mail; they do not prove that an individual mailbox exists.

Submitting the same address returns the same generic response regardless of
whether it exists. A separate lowercased `emailKey` unique index prevents
case-variant duplicates while the deliverable address retains its valid local
part. Pending addresses can receive another verification email
only after `EMAIL_RESEND_COOLDOWN_SECONDS`; the resend endpoint also has a
separate IP limit of three requests per hour.

## Required environment

Environment files, including examples, are intentionally excluded from Git.
Keep local values in the ignored `.env` file and configure production values
directly in Render. Required production variables are:

- `MONGO_URI`
- `TURNSTILE_SECRET`
- `TURNSTILE_HOSTNAMES=www.rosemarry.app,rosemarry.app`
- `RESEND_API_KEY`
- `RESEND_WEBHOOK_SECRET`
- `SUBSCRIPTION_LINK_SECRET` (generate with `openssl rand -base64 48`)
- `PUBLIC_WEB_URL=https://www.rosemarry.app`
- `CONTACT_RETENTION_DAYS`
- `PRE_SIGNUP_RETENTION_DAYS`

Secrets belong only in ignored local environment files and Render secret
environment variables. They must never be exposed to Angular or committed.

## Resend setup

1. Keep `rosemarry.app` verified in Resend and use a sending key restricted to
   that domain. Mail is sent from `Rosemarry <noreply@rosemarry.app>`.
2. In Resend, create a webhook whose endpoint is:
   `https://rosemarry-api.onrender.com/api/webhooks/resend`
3. Subscribe it to `email.delivered`, `email.delivery_delayed`,
   `email.bounced`, `email.complained`, `email.failed`, and
   `email.suppressed`.
4. Copy the webhook signing secret (`whsec_...`) to
   `RESEND_WEBHOOK_SECRET` in Render.

The endpoint verifies the raw request body with Resend's SDK and the Svix
signature headers. Events are applied only when both the recipient and current
Resend email ID match. Event IDs are atomically recorded on the signup, making
retries idempotent. Permanent bounces, complaints, and suppressions move a
pending address to `BOUNCED`; older events cannot overwrite a newer send or a
verified subscription.

Provider API acceptance is not treated as delivery. Delivery status changes
only after a verified webhook event.

## Existing data migration

After deploying the schema and before using subscriber data, run once from a
trusted environment:

```sh
npm run subscription:migrate
```

The migration preserves all historical records and marks records without a
status as `PENDING`. It deliberately does not mark old addresses as verified,
because the old flow did not retain reliable evidence of email ownership.

## Unsubscribe

Verification emails contain a signed unsubscribe link. The user confirms the
action on the Rosemarry website without logging in. The signature does not
contain the email address, and tampering invalidates it. Unsubscribing clears
any active verification token and changes the status to `UNSUBSCRIBED`.

## Verification

```sh
npm test
npm audit --audit-level=moderate
```

Tests mock DNS, Turnstile, Resend, webhook verification, and the repository;
they do not send real email or alter production data.
