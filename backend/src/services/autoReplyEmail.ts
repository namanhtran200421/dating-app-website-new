import { Resend } from "resend";

const FROM_ADDRESS = "Rosemarry <noreply@rosemarry.app>";
const WEBSITE_URL = "https://www.rosemarry.app";
const EMAIL_REQUEST_TIMEOUT_MS = 8_000;

export interface ContactAutoReplyInput {
  email: string;
  firstName: string;
  subject: string;
  submissionId: string;
}

export interface PreSignupAutoReplyInput {
  email: string;
  signupId: string;
}

export interface AutoReplyEmailService {
  sendContactReply(input: ContactAutoReplyInput): Promise<void>;
  sendPreSignupReply(input: PreSignupAutoReplyInput): Promise<void>;
}

export const disabledAutoReplyEmailService: AutoReplyEmailService = {
  async sendContactReply(): Promise<void> {},
  async sendPreSignupReply(): Promise<void> {},
};

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
      })[character] ?? character,
  );
}

// Mirrors the website's tokens in frontend/datingapp/src/styles.css and DESIGN.md.
const COLORS = {
  ink: "#202131",
  paper: "#fbf8ef",
  white: "#ffffff",
  pink: "#ed77a8",
};
// Gmail and Outlook ignore web fonts, so each stack falls back to the closest rounded system face.
const DISPLAY_FONT = "'DynaPuff','Arial Rounded MT Bold','Trebuchet MS',Arial,sans-serif";
const BODY_FONT = "'Playpen Sans','Trebuchet MS',Arial,sans-serif";

/*
 * DynaPuff lines rendered to 2x PNGs by frontend/datingapp/scripts/generate-email-type.mjs
 * (`npm run email:type`) and served from the website. Sizes are the CSS sizes that script prints.
 * Bump EMAIL_TYPE_VERSION whenever the images are regenerated so mail proxies fetch the new ones.
 */
const EMAIL_TYPE_VERSION = "1";
const EMAIL_TYPE = {
  "brand-nav": { width: 195, height: 39, text: "Rosemarry", size: 26 },
  "title-contact": { width: 568, height: 70, text: "We got your message", size: 52 },
  "title-early-access": { width: 454, height: 70, text: "You're on the list", size: 52 },
} as const;
type EmailTypeKey = keyof typeof EMAIL_TYPE;

// The alt text carries the line itself and is styled, so blocked images still read as the heading.
function displayType(key: EmailTypeKey): string {
  const { width, height, text, size } = EMAIL_TYPE[key];
  return `<img src="${WEBSITE_URL}/images/email/${key}.png?v=${EMAIL_TYPE_VERSION}" width="${width}" height="${height}" alt="${escapeHtml(text)}" style="display:block;width:${width}px;max-width:100%;height:auto;border:0;font-family:${DISPLAY_FONT};font-size:${size}px;font-weight:700;line-height:1.1;color:${COLORS.ink};">`;
}

/*
 * The site's cards sit on a solid offset shadow. Gmail strips box-shadow, so the shadow is a
 * rounded block of colour behind the object, showing along its right and bottom edges.
 */
function offsetShadow(
  content: string,
  options: {
    background: string;
    shadow: string;
    offset: number;
    radius: number;
    padding: string;
    width?: string;
    className?: string;
  },
): string {
  const { background, shadow, offset, radius, padding, width = "100%", className } = options;
  const classAttribute = className ? ` class="${className}"` : "";
  return `<table role="presentation" width="${width}" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;">
  <tr>
    <td style="background:${shadow};border-radius:${radius}px;padding:0 ${offset}px ${offset}px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;">
        <tr>
          <td${classAttribute} style="background:${background};border:2px solid ${COLORS.ink};border-radius:${radius}px;padding:${padding};">${content}</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function pillButton(text: string, href: string): string {
  return offsetShadow(
    `<a href="${href}" style="display:block;font-family:${BODY_FONT};font-size:15px;font-weight:800;line-height:1;color:${COLORS.ink};text-decoration:none;white-space:nowrap;text-align:center;">${escapeHtml(text)}</a>`,
    { background: COLORS.pink, shadow: COLORS.ink, offset: 4, radius: 999, padding: "14px 24px", width: "auto" },
  );
}

interface EmailLayoutInput {
  preheader: string;
  heading: string;
  headingImage: EmailTypeKey;
  message: string;
  cta?: { text: string; href: string };
}

function emailLayout({ preheader, heading, headingImage, message, cta }: EmailLayoutInput): string {
  const card = offsetShadow(
    `<p style="margin:0;font-family:${BODY_FONT};font-size:17px;line-height:1.6;color:${COLORS.ink};">${message}</p>
      ${cta ? `<div style="margin-top:24px;">${pillButton(cta.text, cta.href)}</div>` : ""}`,
    { background: COLORS.white, shadow: COLORS.pink, offset: 8, radius: 24, padding: "32px", className: "rm-pad" },
  );

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(heading)}</title>
    <link href="https://fonts.googleapis.com/css2?family=Playpen+Sans:wght@400..800&display=swap" rel="stylesheet">
    <style>
      @media (max-width: 520px) {
        .rm-pad { padding: 22px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.paper};color:${COLORS.ink};font-family:${BODY_FONT};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLORS.paper};">
      <tr>
        <td align="center" style="padding:14px 16px;border-bottom:2px solid ${COLORS.ink};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
            <tr><td><a href="${WEBSITE_URL}" style="text-decoration:none;">${displayType("brand-nav")}</a></td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:40px 16px 32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
            <tr><td style="padding-bottom:24px;"><h1 style="margin:0;">${displayType(headingImage)}</h1></td></tr>
            <tr><td>${card}</td></tr>
            <tr>
              <td style="padding:28px 0 0;font-family:${BODY_FONT};font-size:12px;line-height:1.6;color:#6f6b78;">
                Automatic email from <a href="${WEBSITE_URL}" style="color:${COLORS.ink};">Rosemarry</a>. Replies aren't monitored.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function createAutoReplyEmailService(
  nodeEnv: string,
  apiKey = process.env.RESEND_API_KEY,
): AutoReplyEmailService {
  const normalizedApiKey = apiKey?.trim();

  if (!normalizedApiKey) {
    if (nodeEnv === "development" || nodeEnv === "test") {
      console.warn(
        "RESEND_API_KEY is not configured; automatic emails are disabled locally.",
      );
      return disabledAutoReplyEmailService;
    }

    throw new Error("RESEND_API_KEY is required in production.");
  }

  const resend = new Resend(normalizedApiKey);

  return {
    async sendContactReply(input): Promise<void> {
      const firstName = escapeHtml(input.firstName);
      const contactSubject = escapeHtml(input.subject);
      const { error } = await resend.emails.send(
        {
          from: FROM_ADDRESS,
          to: [input.email],
          subject: "We received your Rosemarry message",
          text: `Thanks, ${input.firstName}. We got your message about ${input.subject} and will reply soon.\n\nAutomatic email from Rosemarry. Replies aren't monitored.\n${WEBSITE_URL}`,
          html: emailLayout({
            preheader: "We'll reply soon.",
            heading: "We got your message",
            headingImage: "title-contact",
            message: `Thanks, ${firstName}. We'll reply about <strong>${contactSubject}</strong> soon.`,
          }),
          tags: [{ name: "form", value: "contact" }],
        },
        {
          idempotencyKey: `contact-received/${input.submissionId}`,
          signal: AbortSignal.timeout(EMAIL_REQUEST_TIMEOUT_MS),
        },
      );

      if (error) {
        throw new Error("The email provider rejected the contact auto-reply.");
      }
    },

    async sendPreSignupReply(input): Promise<void> {
      const { error } = await resend.emails.send(
        {
          from: FROM_ADDRESS,
          to: [input.email],
          subject: "You're on the Rosemarry early access list",
          text: `You're on the list. We'll email you when Rosemarry is ready.\n\nSee how Circles work: ${WEBSITE_URL}/how-it-works\n\nAutomatic email from Rosemarry. Replies aren't monitored.`,
          html: emailLayout({
            preheader: "We'll email you when Rosemarry is ready.",
            heading: "You're on the list",
            headingImage: "title-early-access",
            message: "We'll email you when Rosemarry is ready.",
            cta: { text: "See how Circles work", href: `${WEBSITE_URL}/how-it-works` },
          }),
          tags: [{ name: "form", value: "pre-signup" }],
        },
        {
          idempotencyKey: `early-access-welcome/${input.signupId}`,
          signal: AbortSignal.timeout(EMAIL_REQUEST_TIMEOUT_MS),
        },
      );

      if (error) {
        throw new Error("The email provider rejected the pre-signup auto-reply.");
      }
    },
  };
}
