import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const VERIFICATION_TOKEN_BYTES = 32;
const MONGODB_ID_PATTERN = /^[a-f\d]{24}$/i;

export interface VerificationToken {
  hash: string;
  raw: string;
}

export function createVerificationToken(): VerificationToken {
  const raw = randomBytes(VERIFICATION_TOKEN_BYTES).toString("base64url");
  return { raw, hash: hashVerificationToken(raw) };
}

export function hashVerificationToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function unsubscribeSignature(id: string, secret: string): Buffer {
  return createHmac("sha256", secret)
    .update(`unsubscribe:${id}`, "utf8")
    .digest();
}

export function createUnsubscribeToken(id: string, secret: string): string {
  const encodedId = Buffer.from(id, "utf8").toString("base64url");
  return `${encodedId}.${unsubscribeSignature(id, secret).toString("base64url")}`;
}

export function verifyUnsubscribeToken(
  token: string,
  secret: string,
): string | null {
  const [encodedId, encodedSignature, ...rest] = token.split(".");

  if (!encodedId || !encodedSignature || rest.length > 0) {
    return null;
  }

  try {
    const id = Buffer.from(encodedId, "base64url").toString("utf8");
    const signature = Buffer.from(encodedSignature, "base64url");
    const expected = unsubscribeSignature(id, secret);

    if (
      !MONGODB_ID_PATTERN.test(id) ||
      signature.length !== expected.length ||
      !timingSafeEqual(signature, expected)
    ) {
      return null;
    }

    return id;
  } catch {
    return null;
  }
}
