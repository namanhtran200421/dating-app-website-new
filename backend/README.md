# Rosemarry API

Express API for Rosemarry's contact and early-access forms.

## Automatic email replies

Both forms send transactional confirmations through Resend from
`Rosemarry <noreply@rosemarry.app>`:

- Contact messages receive a delivery acknowledgement.
- New early-access registrations receive a welcome confirmation. An address
  that is already registered is not emailed again.

The database write is completed before email is requested. A temporary email
provider failure is logged without asking the user to resubmit a form whose
data is already stored. Provider requests use the database record ID as an
idempotency key to prevent duplicate sends during retries.

To enable sending:

1. Verify `rosemarry.app` in Resend. A registered mailbox alone does not prove
   domain ownership; Resend's DNS records must show as verified.
2. Create a sending-only Resend API key restricted to `rosemarry.app`.
3. Add the key to the Render web service as `RESEND_API_KEY`, then redeploy.

Production startup fails if `RESEND_API_KEY` is missing. Local development can
run without it; automatic emails are disabled and a warning is printed.

Copy `.env.example` to `.env` for the rest of the required local settings.
