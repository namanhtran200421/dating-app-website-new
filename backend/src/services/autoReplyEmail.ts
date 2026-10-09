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
  attemptId: string;
  verificationUrl: string;
  unsubscribeUrl: string;
}

export interface EmailDeliveryReceipt {
  providerMessageId: string;
}

export interface AutoReplyEmailService {
  sendContactReply(input: ContactAutoReplyInput): Promise<void>;
  sendPreSignupVerification(
    input: PreSignupAutoReplyInput,
  ): Promise<EmailDeliveryReceipt>;
}

export const disabledAutoReplyEmailService: AutoReplyEmailService = {
  async sendContactReply(): Promise<void> {},
  async sendPreSignupVerification(): Promise<EmailDeliveryReceipt> {
    return { providerMessageId: "local-email-disabled" };
  },
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
  rose: "#d81e4a",
  quiet: "#6f6b78",
};
// The fallback stacks only show when an email client blocks images (see emailText below).
const DISPLAY_FONT = "'DynaPuff','Arial Rounded MT Bold','Trebuchet MS',Arial,sans-serif";
const BODY_FONT = "'Playpen Sans','Trebuchet MS',Arial,sans-serif";

/*
 * Every line of copy is rendered to a 2x PNG by frontend/datingapp/scripts/generate-email-type.mjs
 * (`npm run email:type`) and served from the website, because Gmail and Outlook ignore web fonts.
 * Sizes are the CSS sizes that script prints. Bump EMAIL_TYPE_VERSION whenever the images are
 * regenerated so mail proxies fetch the new ones.
 */
const EMAIL_TYPE_VERSION = "4";
const EMAIL_TYPE = {
  "brand-nav": { width: 195, height: 39, text: "Rosemarry", font: DISPLAY_FONT, size: 26, color: COLORS.ink },
  "title-contact": { width: 568, height: 70, text: "We got your message", font: DISPLAY_FONT, size: 52, color: COLORS.ink },
  "title-early-access": { width: 512, height: 70, text: "Confirm your email", font: DISPLAY_FONT, size: 52, color: COLORS.ink },
  "message-contact": { width: 330, height: 60, text: "Thanks so much for reaching out! We'll get back to you soon.", font: BODY_FONT, size: 18, color: COLORS.ink },
  "message-early-access": { width: 330, height: 60, text: "Tap below to confirm you want Rosemarry early-access updates.", font: BODY_FONT, size: 18, color: COLORS.ink },
  "button-early-access": { width: 136, height: 24, text: "Confirm my email", font: BODY_FONT, size: 15, color: COLORS.ink },
  "signoff-warmly": { width: 66, height: 25, text: "Warmly,", font: BODY_FONT, size: 16, color: COLORS.ink },
  "signoff-team": { width: 218, height: 24, text: "The Rosemarry team", font: DISPLAY_FONT, size: 20, color: COLORS.rose },
  "footer-note": { width: 345, height: 20, text: "Automatic email from Rosemarry. Replies aren't monitored.", font: BODY_FONT, size: 12, color: COLORS.quiet },
} as const;
type EmailTypeKey = keyof typeof EMAIL_TYPE;

// The alt text carries the line itself and is styled, so blocked images still read as the copy.
function emailText(key: EmailTypeKey): string {
  const { width, height, text, font, size, color } = EMAIL_TYPE[key];
  return `<img src="${WEBSITE_URL}/images/email/${key}.png?v=${EMAIL_TYPE_VERSION}" width="${width}" height="${height}" alt="${escapeHtml(text)}" style="display:block;width:${width}px;max-width:100%;height:auto;border:0;font-family:${font};font-size:${size}px;font-weight:700;line-height:1.3;color:${color};">`;
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

function pillButton(label: EmailTypeKey, href: string): string {
  return offsetShadow(`<a href="${href}" style="display:block;text-decoration:none;">${emailText(label)}</a>`, {
    background: COLORS.pink,
    shadow: COLORS.ink,
    offset: 4,
    radius: 999,
    padding: "14px 24px",
    width: "auto",
  });
}

interface EmailLayoutInput {
  preheader: string;
  heading: string;
  headingImage: EmailTypeKey;
  message: EmailTypeKey;
  cta?: { label: EmailTypeKey; href: string };
  secondaryLink?: { label: string; href: string };
}

function emailLayout({
  preheader,
  heading,
  headingImage,
  message,
  cta,
  secondaryLink,
}: EmailLayoutInput): string {
  const card = offsetShadow(
    `${emailText(message)}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:26px;">
        <tr>
          <td class="rm-stack" valign="bottom">
            ${emailText("signoff-warmly")}
            <div style="margin-top:2px;">${emailText("signoff-team")}</div>
          </td>
          ${cta ? `<td class="rm-stack rm-stack-gap" align="right" valign="bottom">${pillButton(cta.label, cta.href)}</td>` : ""}
        </tr>
      </table>
      ${
        secondaryLink
          ? `<p style="margin:24px 0 0;font-family:${BODY_FONT};font-size:12px;line-height:1.5;color:${COLORS.quiet};">Didn&rsquo;t request this? <a href="${secondaryLink.href}" style="color:${COLORS.ink};font-weight:700;">${escapeHtml(secondaryLink.label)}</a></p>`
          : ""
      }`,
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
    <style>
      @media (max-width: 520px) {
        .rm-pad { padding: 22px !important; }
        .rm-stack { display: block !important; width: 100% !important; text-align: left !important; }
        .rm-stack-gap { padding-top: 22px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.paper};color:${COLORS.ink};font-family:${BODY_FONT};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLORS.paper};">
      <tr>
        <td align="center" style="padding:14px 16px;border-bottom:2px solid ${COLORS.ink};">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
            <tr><td><a href="${WEBSITE_URL}" style="text-decoration:none;">${emailText("brand-nav")}</a></td></tr>
          </table>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding:40px 16px 32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
            <tr><td style="padding-bottom:24px;"><h1 style="margin:0;">${emailText(headingImage)}</h1></td></tr>
            <tr><td>${card}</td></tr>
            <tr>
              <td style="padding-top:26px;"><a href="${WEBSITE_URL}" style="text-decoration:none;">${emailText("footer-note")}</a></td>
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
      const { error } = await resend.emails.send(
        {
          from: FROM_ADDRESS,
          to: [input.email],
          subject: "We received your Rosemarry message",
          text: `Hi ${input.firstName},\n\nThanks so much for reaching out about ${input.subject}! We'll get back to you soon.\n\nWarmly,\nThe Rosemarry team\n\nAutomatic email from Rosemarry. Replies aren't monitored.\n${WEBSITE_URL}`,
          html: emailLayout({
            preheader: "Thanks so much for reaching out! We'll get back to you soon.",
            heading: "We got your message",
            headingImage: "title-contact",
            message: "message-contact",
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

    async sendPreSignupVerification(input): Promise<EmailDeliveryReceipt> {
      const { data, error } = await resend.emails.send(
        {
          from: FROM_ADDRESS,
          to: [input.email],
          subject: "Confirm your Rosemarry early access email",
          text: `Confirm that you want Rosemarry early-access updates:\n${input.verificationUrl}\n\nThis link expires soon and can only be used once. If you did not request it, you can ignore this email or unsubscribe here:\n${input.unsubscribeUrl}\n\nWarmly,\nThe Rosemarry team\n\nAutomatic email from Rosemarry. Replies aren't monitored.`,
          html: emailLayout({
            preheader: "Confirm your email to join Rosemarry early access.",
            heading: "Confirm your email",
            headingImage: "title-early-access",
            message: "message-early-access",
            cta: {
              label: "button-early-access",
              href: input.verificationUrl,
            },
            secondaryLink: {
              label: "Unsubscribe this address",
              href: input.unsubscribeUrl,
            },
          }),
          tags: [
            { name: "form", value: "pre-signup" },
            { name: "message_type", value: "email_verification" },
          ],
        },
        {
          idempotencyKey: `early-access-verification/${input.attemptId}`,
          signal: AbortSignal.timeout(EMAIL_REQUEST_TIMEOUT_MS),
        },
      );

      if (error || !data?.id) {
        throw new Error("The email provider rejected the verification email.");
      }

      return { providerMessageId: data.id };
    },
  };
}
