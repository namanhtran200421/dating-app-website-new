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

const COLORS = {
  ink: "#202131",
  paper: "#fbf8ef",
  white: "#ffffff",
  pink: "#ed77a8",
  rose: "#d81e4a",
  yellow: "#ffc53d",
  mint: "#47d8ad",
  purple: "#8d6cff",
  muted: "#5b5566",
};
const DISPLAY_FONT = "'DynaPuff',Arial,Helvetica,sans-serif";
const BODY_FONT = "'Playpen Sans',Arial,Helvetica,sans-serif";
const PARAGRAPH_STYLE = `margin:0 0 16px;font-family:${BODY_FONT};font-size:16px;line-height:1.65;color:${COLORS.ink};`;

/*
 * Gmail and Outlook strip box-shadow, so the hard offset shadow is drawn with table cells:
 * a strip down the right (starting `offset` px from the top) and one along the bottom
 * (starting `offset` px from the left). Corners stay square so the shadow lines up everywhere.
 */
function hardShadowBox(
  content: string,
  options: { background: string; shadow: string; offset: number; border: number; padding: string },
): string {
  const { background, shadow, offset, border, padding } = options;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:separate;">
  <tr>
    <td rowspan="2" style="background:${background};border:${border}px solid ${COLORS.ink};padding:${padding};">${content}</td>
    <td width="${offset}" height="${offset}" style="width:${offset}px;height:${offset}px;font-size:0;line-height:0;">&nbsp;</td>
  </tr>
  <tr>
    <td width="${offset}" style="width:${offset}px;background:${shadow};font-size:0;line-height:0;">&nbsp;</td>
  </tr>
  <tr>
    <td colspan="2" style="padding:0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
        <tr>
          <td width="${offset}" height="${offset}" style="width:${offset}px;height:${offset}px;font-size:0;line-height:0;">&nbsp;</td>
          <td height="${offset}" style="height:${offset}px;background:${shadow};font-size:0;line-height:0;">&nbsp;</td>
        </tr>
      </table>
    </td>
  </tr>
</table>`;
}

function paragraph(html: string, last = false): string {
  return `<p style="${PARAGRAPH_STYLE}${last ? "margin-bottom:0;" : ""}">${html}</p>`;
}

function noteBox(label: string, value: string, background: string): string {
  return `<div style="margin:8px 0 24px;">${hardShadowBox(
    `<div style="font-family:${BODY_FONT};font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${COLORS.ink};">${label}</div>
     <div style="margin-top:4px;font-family:${DISPLAY_FONT};font-size:20px;line-height:1.3;color:${COLORS.ink};">${value}</div>`,
    { background, shadow: COLORS.ink, offset: 4, border: 2, padding: "14px 18px" },
  )}</div>`;
}

interface EmailLayoutInput {
  preheader: string;
  label: string;
  heading: string;
  content: string;
  cta: { text: string; href: string };
}

function emailLayout({ preheader, label, heading, content, cta }: EmailLayoutInput): string {
  const button = `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;"><tr><td>${hardShadowBox(
    `<a href="${cta.href}" style="display:block;font-family:${BODY_FONT};font-size:16px;font-weight:700;line-height:1;color:${COLORS.ink};text-decoration:none;white-space:nowrap;">${escapeHtml(cta.text)} &rarr;</a>`,
    { background: COLORS.pink, shadow: COLORS.ink, offset: 4, border: 2, padding: "14px 22px" },
  )}</td></tr></table>`;

  const card = `<div class="rm-pad" style="background:${COLORS.pink};border-bottom:3px solid ${COLORS.ink};padding:28px 32px 26px;">
      <span style="display:inline-block;background:${COLORS.yellow};border:2px solid ${COLORS.ink};padding:4px 10px;font-family:${BODY_FONT};font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${COLORS.ink};">${escapeHtml(label)}</span>
      <h1 style="margin:16px 0 0;font-family:${DISPLAY_FONT};font-size:34px;font-weight:700;line-height:1.1;letter-spacing:-0.5px;color:${COLORS.ink};">${escapeHtml(heading)}</h1>
    </div>
    <div class="rm-pad" style="padding:28px 32px 32px;">
      ${content}
      ${button}
      <p style="${PARAGRAPH_STYLE}margin:32px 0 0;">Warmly,<br><span style="font-family:${DISPLAY_FONT};font-size:20px;color:${COLORS.rose};">The Rosemarry team</span></p>
    </div>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(heading)}</title>
    <link href="https://fonts.googleapis.com/css2?family=DynaPuff:wght@400..700&family=Playpen+Sans:wght@400..700&display=swap" rel="stylesheet">
    <style>
      @media (max-width: 480px) {
        .rm-hide-mobile { display: none !important; }
        .rm-pad { padding-left: 20px !important; padding-right: 20px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.paper};color:${COLORS.ink};font-family:${BODY_FONT};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLORS.paper};">
      <tr>
        <td align="center" style="padding:32px 16px 40px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
            <tr>
              <td style="padding:0 0 24px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="font-family:${DISPLAY_FONT};font-size:30px;font-weight:700;letter-spacing:-0.5px;color:${COLORS.rose};">
                      <a href="${WEBSITE_URL}" style="color:${COLORS.rose};text-decoration:none;">Rosemarry</a>
                    </td>
                    <td class="rm-hide-mobile" align="right" style="font-family:${BODY_FONT};font-size:13px;font-weight:700;color:${COLORS.ink};">
                      <span style="display:inline-block;background:${COLORS.mint};border:2px solid ${COLORS.ink};padding:4px 10px;white-space:nowrap;">Dating, at a better pace</span>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td>${hardShadowBox(card, { background: COLORS.white, shadow: COLORS.ink, offset: 8, border: 3, padding: "0" })}</td>
            </tr>
            <tr>
              <td style="padding:28px 8px 0;text-align:center;font-family:${BODY_FONT};font-size:12px;line-height:1.6;color:${COLORS.muted};">
                This is an automatic confirmation from Rosemarry. Replies to this address are not monitored.<br>
                <a href="${WEBSITE_URL}" style="color:${COLORS.ink};font-weight:700;text-decoration:underline;text-decoration-color:${COLORS.pink};text-decoration-thickness:3px;">rosemarry.app</a>
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
          text: `Hi ${input.firstName},\n\nThanks for reaching out about ${input.subject}. We have received your message and a member of the Rosemarry team will get back to you as soon as we can.\n\nWarmly,\nThe Rosemarry team\n\nThis is an automatic confirmation. Replies to this address are not monitored.\n${WEBSITE_URL}`,
          html: emailLayout({
            preheader: "Your message is safely with the Rosemarry team.",
            label: "Message received",
            heading: "We got your message",
            content: `${paragraph(`Hi ${firstName},`)}
              ${paragraph("Thanks for reaching out. Your message is safely with us.")}
              ${noteBox("You wrote to us about", contactSubject, COLORS.yellow)}
              ${paragraph("A member of the Rosemarry team will get back to you as soon as we can.", true)}`,
            cta: { text: "Back to Rosemarry", href: WEBSITE_URL },
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
          text: `You're on the list.\n\nThanks for joining Rosemarry early access. We will email you when there is something worth sharing and let you know when Rosemarry is ready for you.\n\nWarmly,\nThe Rosemarry team\n\nThis is an automatic confirmation. Replies to this address are not monitored.\n${WEBSITE_URL}`,
          html: emailLayout({
            preheader: "You're on the Rosemarry early access list.",
            label: "Early access",
            heading: "You're on the list",
            content: `${paragraph("Thanks for joining Rosemarry early access.")}
              ${noteBox("What happens next", "We'll email you when Rosemarry is ready for you.", COLORS.mint)}
              ${paragraph("Until then, we'll only write when there is something worth sharing.", true)}`,
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
