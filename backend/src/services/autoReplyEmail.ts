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

function emailLayout(preheader: string, heading: string, content: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(heading)}</title>
  </head>
  <body style="margin:0;background:#fff8f2;color:#28171f;font-family:Arial,Helvetica,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(preheader)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff8f2;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:2px solid #28171f;border-radius:20px;">
            <tr>
              <td style="padding:28px 32px 12px;text-align:center;">
                <div style="font-size:28px;font-weight:800;letter-spacing:-0.5px;color:#d81e4a;">Rosemarry</div>
                <div style="margin-top:6px;font-size:14px;color:#6d5962;">Dating, at a better pace</div>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px 32px;">
                <h1 style="margin:0 0 20px;font-size:28px;line-height:1.2;color:#28171f;">${escapeHtml(heading)}</h1>
                ${content}
                <p style="margin:28px 0 0;font-size:16px;line-height:1.6;">Warmly,<br><strong>The Rosemarry team</strong></p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 32px;border-top:1px solid #eadde2;text-align:center;font-size:12px;line-height:1.5;color:#796770;">
                This is an automatic confirmation from Rosemarry. Replies to this address are not monitored.<br>
                <a href="${WEBSITE_URL}" style="color:#d81e4a;">rosemarry.app</a>
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
          html: emailLayout(
            "Your message is safely with the Rosemarry team.",
            "We got your message",
            `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Hi ${firstName},</p>
             <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Thanks for reaching out about <strong>${contactSubject}</strong>. Your message is safely with us.</p>
             <p style="margin:0;font-size:16px;line-height:1.6;">A member of the Rosemarry team will get back to you as soon as we can.</p>`,
          ),
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
          html: emailLayout(
            "You're on the Rosemarry early access list.",
            "You're on the list",
            `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;">Thanks for joining Rosemarry early access.</p>
             <p style="margin:0;font-size:16px;line-height:1.6;">We will email you when there is something worth sharing and let you know when Rosemarry is ready for you.</p>`,
          ),
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
