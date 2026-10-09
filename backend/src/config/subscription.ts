const MINIMUM_LINK_SECRET_LENGTH = 32;

function integerSetting(
  name: string,
  rawValue: string | undefined,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const value = rawValue?.trim() ? Number(rawValue) : fallback;

  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} to ${maximum}.`);
  }

  return value;
}

function booleanSetting(name: string, rawValue: string | undefined, fallback: boolean): boolean {
  const value = rawValue?.trim().toLowerCase();

  if (!value) {
    return fallback;
  }

  if (value === "true") return true;
  if (value === "false") return false;
  throw new Error(`${name} must be true or false.`);
}

function publicWebUrl(rawValue: string | undefined, nodeEnv: string): string {
  const fallback =
    nodeEnv === "production"
      ? "https://www.rosemarry.app"
      : "http://localhost:4200";
  const url = new URL(rawValue?.trim() || fallback);

  if (nodeEnv === "production" && url.protocol !== "https:") {
    throw new Error("PUBLIC_WEB_URL must use HTTPS in production.");
  }

  return url.origin;
}

export interface SubscriptionConfiguration {
  blockDisposableEmails: boolean;
  dnsTimeoutMs: number;
  linkSecret: string;
  publicWebUrl: string;
  resendCooldownMs: number;
  verificationTtlMs: number;
}

export function loadSubscriptionConfiguration(
  nodeEnv: string,
): SubscriptionConfiguration {
  const linkSecret = process.env.SUBSCRIPTION_LINK_SECRET?.trim();

  if (!linkSecret || linkSecret.length < MINIMUM_LINK_SECRET_LENGTH) {
    throw new Error(
      `SUBSCRIPTION_LINK_SECRET must contain at least ${MINIMUM_LINK_SECRET_LENGTH} characters.`,
    );
  }

  return {
    blockDisposableEmails: booleanSetting(
      "BLOCK_DISPOSABLE_EMAILS",
      process.env.BLOCK_DISPOSABLE_EMAILS,
      true,
    ),
    dnsTimeoutMs: integerSetting(
      "EMAIL_DNS_TIMEOUT_MS",
      process.env.EMAIL_DNS_TIMEOUT_MS,
      2_500,
      250,
      10_000,
    ),
    linkSecret,
    publicWebUrl: publicWebUrl(process.env.PUBLIC_WEB_URL, nodeEnv),
    resendCooldownMs:
      integerSetting(
        "EMAIL_RESEND_COOLDOWN_SECONDS",
        process.env.EMAIL_RESEND_COOLDOWN_SECONDS,
        300,
        60,
        86_400,
      ) * 1_000,
    verificationTtlMs:
      integerSetting(
        "EMAIL_VERIFICATION_TTL_MINUTES",
        process.env.EMAIL_VERIFICATION_TTL_MINUTES,
        1_440,
        15,
        10_080,
      ) * 60_000,
  };
}
