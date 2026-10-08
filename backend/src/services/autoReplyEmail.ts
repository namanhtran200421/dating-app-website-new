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
  rose: "#d81e4a",
  yellow: "#ffc53d",
  mint: "#47d8ad",
  muted: "#5d5a68",
};
// Gmail and Outlook ignore web fonts, so each stack falls back to the closest rounded system face.
const DISPLAY_FONT = "'DynaPuff','Arial Rounded MT Bold','Trebuchet MS',Arial,sans-serif";
const BODY_FONT = "'Playpen Sans','Trebuchet MS',Arial,sans-serif";
const INSTAGRAM_URL = "https://www.instagram.com/rosemarry_app/";

/*
 * DynaPuff lines rendered to 2x PNGs by frontend/datingapp/scripts/generate-email-type.mjs
 * (`npm run email:type`) and served from the website. Sizes are the CSS sizes that script prints.
 * Bump EMAIL_TYPE_VERSION whenever the images are regenerated so mail proxies fetch the new ones.
 */
const EMAIL_TYPE_VERSION = "1";
const EMAIL_TYPE = {
  "brand-nav": { width: 195, height: 39, text: "Rosemarry", size: 26, color: COLORS.ink },
  "brand-footer": { width: 144, height: 31, text: "Rosemarry", size: 18, color: COLORS.white },
  "title-contact": { width: 568, height: 70, text: "We got your message", size: 52, color: COLORS.ink },
  "title-early-access": { width: 454, height: 70, text: "You're on the list", size: 52, color: COLORS.ink },
  "note-contact": { width: 190, height: 24, text: "Message received.", size: 20, color: COLORS.ink },
  "note-early-access": { width: 183, height: 24, text: "You're on the list.", size: 20, color: COLORS.ink },
  "panel-title": { width: 517, height: 48, text: "Get in before the first Circle", size: 36, color: COLORS.ink },
  signoff: { width: 207, height: 23, text: "The Rosemarry team", size: 19, color: COLORS.rose },
} as const;
type EmailTypeKey = keyof typeof EMAIL_TYPE;

// The alt text carries the line itself and is styled, so blocked images still read as the heading.
function displayType(key: EmailTypeKey): string {
  const { width, height, text, size, color } = EMAIL_TYPE[key];
  return `<img src="${WEBSITE_URL}/images/email/${key}.png?v=${EMAIL_TYPE_VERSION}" width="${width}" height="${height}" alt="${escapeHtml(text)}" style="display:block;width:${width}px;max-width:100%;height:auto;border:0;font-family:${DISPLAY_FONT};font-size:${size}px;font-weight:700;line-height:1.1;color:${color};">`;
}

const PARAGRAPH_STYLE = `margin:0 0 16px;font-family:${BODY_FONT};font-size:16px;line-height:1.65;color:${COLORS.ink};`;

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

function pillButton(text: string, href: string, size: "small" | "regular" = "regular"): string {
  const padding = size === "small" ? "10px 18px" : "14px 24px";
  const fontSize = size === "small" ? 13 : 15;
  return offsetShadow(
    `<a href="${href}" style="display:block;font-family:${BODY_FONT};font-size:${fontSize}px;font-weight:800;line-height:1;color:${COLORS.ink};text-decoration:none;white-space:nowrap;text-align:center;">${escapeHtml(text)}</a>`,
    { background: COLORS.pink, shadow: COLORS.ink, offset: 4, radius: 999, padding, width: "auto" },
  );
}

function sticker(text: string, background: string): string {
  return `<span style="display:inline-block;background:${background};border:1.5px solid ${COLORS.ink};border-radius:2px;padding:6px 10px 5px;font-family:${BODY_FONT};font-size:11px;font-weight:900;letter-spacing:1px;line-height:1;text-transform:uppercase;color:${COLORS.ink};box-shadow:2px 2px 0 ${COLORS.ink};">${escapeHtml(text)}</span>`;
}

function paragraph(html: string, last = false): string {
  return `<p style="${PARAGRAPH_STYLE}${last ? "margin-bottom:0;" : ""}">${html}</p>`;
}

// Same construction as the footer's "You're on the list" confirmation on the website.
function successNote(title: EmailTypeKey, detail: string): string {
  return `<div style="margin:8px 0 24px;">${offsetShadow(
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      <tr>
        <td width="44" valign="middle" style="width:44px;padding-right:14px;">
          <div style="width:40px;height:40px;border:1.5px solid ${COLORS.ink};border-radius:50%;background:${COLORS.mint};font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;line-height:40px;text-align:center;color:${COLORS.ink};">&#10003;</div>
        </td>
        <td valign="middle" style="font-family:${BODY_FONT};font-size:14px;line-height:1.55;color:${COLORS.muted};">
          <div style="margin-bottom:2px;">${displayType(title)}</div>
          ${detail}
        </td>
      </tr>
    </table>`,
    { background: COLORS.paper, shadow: COLORS.pink, offset: 6, radius: 22, padding: "14px 18px" },
  )}</div>`;
}

interface EmailLayoutInput {
  preheader: string;
  label: string;
  heading: string;
  headingImage: EmailTypeKey;
  content: string;
  cta: { text: string; href: string };
  showEarlyAccessPanel: boolean;
}

function emailLayout({
  preheader,
  label,
  heading,
  headingImage,
  content,
  cta,
  showEarlyAccessPanel,
}: EmailLayoutInput): string {
  const year = new Date().getFullYear();

  const nav = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLORS.paper};border-bottom:2px solid ${COLORS.ink};">
      <tr>
        <td align="center" style="padding:14px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
            <tr>
              <td valign="middle">
                <a href="${WEBSITE_URL}" style="text-decoration:none;">${displayType("brand-nav")}</a>
              </td>
              <td class="rm-hide-mobile" align="right" valign="middle">${pillButton("How it works", `${WEBSITE_URL}/how-it-works`, "small")}</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;

  const card = offsetShadow(
    `${content}
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top:28px;border-top:2px solid ${COLORS.ink};">
        <tr>
          <td class="rm-stack" valign="middle" style="padding-top:22px;font-family:${BODY_FONT};font-size:15px;line-height:1.5;color:${COLORS.ink};">
            Warmly,<div style="margin-top:4px;">${displayType("signoff")}</div>
          </td>
          <td class="rm-stack" align="right" valign="middle" style="padding-top:22px;">${pillButton(cta.text, cta.href)}</td>
        </tr>
      </table>`,
    { background: COLORS.white, shadow: COLORS.pink, offset: 8, radius: 24, padding: "36px", className: "rm-pad" },
  );

  const earlyAccessPanel = showEarlyAccessPanel
    ? `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLORS.yellow};border-top:2px solid ${COLORS.ink};">
      <tr>
        <td align="center" style="padding:40px 16px 44px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
            <tr>
              <td style="color:${COLORS.ink};">
                ${sticker("Early access", COLORS.paper)}
                <h2 style="margin:16px 0 8px;">${displayType("panel-title")}</h2>
                <p style="margin:0 0 22px;font-family:${BODY_FONT};font-size:13px;font-weight:800;color:${COLORS.ink};">1 month of Advanced free at launch</p>
                ${pillButton("Join early access", `${WEBSITE_URL}/#join`)}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`
    : "";

  const footerLink = "color:#c7c7cd;text-decoration:underline;text-underline-offset:3px;";
  const footer = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLORS.ink};border-top:2px solid ${COLORS.ink};">
      <tr>
        <td align="center" style="padding:28px 16px 32px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
            <tr>
              <td style="font-family:${BODY_FONT};font-size:12px;font-weight:700;line-height:1.7;color:#a6a6ad;">
                <a href="${WEBSITE_URL}" style="text-decoration:none;">${displayType("brand-footer")}</a>
                <div style="margin-top:14px;">Good things take time &middot; &copy; ${year} Rosemarry</div>
                <div style="margin-top:6px;">
                  <a href="${INSTAGRAM_URL}" style="${footerLink}">Instagram</a>&nbsp;&nbsp;&nbsp;
                  <a href="${WEBSITE_URL}/privacy-and-terms" style="${footerLink}">Privacy + Terms</a>&nbsp;&nbsp;&nbsp;
                  <a href="${WEBSITE_URL}/contact-us" style="${footerLink}">Contact</a>
                </div>
                <div style="margin-top:16px;font-size:11px;font-weight:400;color:#8b8b94;">This is an automatic confirmation from Rosemarry. Replies to this address are not monitored.</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
    <title>${escapeHtml(heading)}</title>
    <link href="https://fonts.googleapis.com/css2?family=DynaPuff:wght@400..700&family=Playpen+Sans:wght@400..800&display=swap" rel="stylesheet">
    <style>
      @media (max-width: 520px) {
        .rm-hide-mobile { display: none !important; }
        .rm-pad { padding: 22px !important; }
        .rm-stack { display: block !important; width: 100% !important; text-align: left !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:${COLORS.paper};color:${COLORS.ink};font-family:${BODY_FONT};">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${COLORS.paper};">
      <tr><td>${nav}</td></tr>
      <tr>
        <td align="center" style="padding:44px 16px 52px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;">
            <tr>
              <td style="padding-bottom:26px;">
                ${sticker(label, COLORS.yellow)}
                <h1 style="margin:18px 0 0;">${displayType(headingImage)}</h1>
              </td>
            </tr>
            <tr><td>${card}</td></tr>
          </table>
        </td>
      </tr>
      <tr><td>${earlyAccessPanel}${footer}</td></tr>
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
            headingImage: "title-contact",
            content: `${paragraph(`Hi ${firstName},`)}
              ${paragraph("Thanks for reaching out. Your message is safely with us.")}
              ${successNote("note-contact", `About: <strong style="color:${COLORS.ink};">${contactSubject}</strong>`)}
              ${paragraph("A member of the Rosemarry team will get back to you as soon as we can.", true)}`,
            cta: { text: "Back to Rosemarry", href: WEBSITE_URL },
            showEarlyAccessPanel: true,
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
            headingImage: "title-early-access",
            content: `${paragraph("Thanks for joining Rosemarry early access.")}
              ${successNote("note-early-access", `We saved ${escapeHtml(input.email)} for early-access updates.`)}
              ${paragraph("We'll email you when Rosemarry is ready for you. Until then, we'll only write when there is something worth sharing.", true)}`,
            cta: { text: "See how Circles work", href: `${WEBSITE_URL}/how-it-works` },
            showEarlyAccessPanel: false,
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
