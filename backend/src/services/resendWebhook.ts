import { Resend, type WebhookEventPayload } from "resend";

export interface ResendWebhookHeaders {
  id: string;
  signature: string;
  timestamp: string;
}

export interface ResendWebhookVerifier {
  verify(payload: string, headers: ResendWebhookHeaders): WebhookEventPayload;
}

export function createResendWebhookVerifier(
  apiKey: string,
  webhookSecret: string,
): ResendWebhookVerifier {
  const resend = new Resend(apiKey);

  return {
    verify(payload, headers) {
      return resend.webhooks.verify({
        payload,
        headers,
        webhookSecret,
      });
    },
  };
}
