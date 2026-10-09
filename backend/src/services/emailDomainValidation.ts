import { promises as dns } from "node:dns";
import { isDisposableEmailDomain } from "disposable-email-domains-js";

export type EmailDomainValidationResult =
  | { status: "valid" }
  | { status: "invalid"; reason: "disposable" | "no-mail" }
  | { status: "temporary-failure" };

export interface MailDnsResolver {
  resolve4(hostname: string): Promise<string[]>;
  resolve6(hostname: string): Promise<string[]>;
  resolveMx(hostname: string): Promise<Array<{ exchange: string; priority: number }>>;
}

export interface EmailDomainValidator {
  validate(email: string): Promise<EmailDomainValidationResult>;
}

type DnsError = Error & { code?: string };

const DEFINITIVE_DNS_ERRORS = new Set(["ENODATA", "ENOTFOUND", "NXDOMAIN"]);

function domainFromEmail(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

function isDefinitiveDnsError(error: unknown): boolean {
  return (
    error instanceof Error &&
    typeof (error as DnsError).code === "string" &&
    DEFINITIVE_DNS_ERRORS.has((error as DnsError).code ?? "")
  );
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      const error = new Error("DNS lookup timed out.") as DnsError;
      error.code = "ETIMEOUT";
      reject(error);
    }, timeoutMs);
    timeout.unref();

    promise.then(
      (value) => {
        clearTimeout(timeout);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timeout);
        reject(error);
      },
    );
  });
}

async function fallbackAddressLookup(
  resolver: MailDnsResolver,
  domain: string,
  timeoutMs: number,
): Promise<EmailDomainValidationResult> {
  const results = await Promise.allSettled([
    withTimeout(resolver.resolve4(domain), timeoutMs),
    withTimeout(resolver.resolve6(domain), timeoutMs),
  ]);

  if (
    results.some(
      (result) => result.status === "fulfilled" && result.value.length > 0,
    )
  ) {
    return { status: "valid" };
  }

  if (
    results.every(
      (result) =>
        result.status === "fulfilled" || isDefinitiveDnsError(result.reason),
    )
  ) {
    return { status: "invalid", reason: "no-mail" };
  }

  return { status: "temporary-failure" };
}

export function createEmailDomainValidator(options: {
  blockDisposableEmails: boolean;
  resolver?: MailDnsResolver;
  timeoutMs: number;
}): EmailDomainValidator {
  const resolver = options.resolver ?? dns;

  return {
    async validate(email): Promise<EmailDomainValidationResult> {
      const domain = domainFromEmail(email);

      if (options.blockDisposableEmails && isDisposableEmailDomain(domain)) {
        return { status: "invalid", reason: "disposable" };
      }

      try {
        const mxRecords = await withTimeout(
          resolver.resolveMx(domain),
          options.timeoutMs,
        );
        const hasNullMx = mxRecords.some(
          ({ exchange }) => exchange === "" || exchange === ".",
        );

        if (hasNullMx) {
          return { status: "invalid", reason: "no-mail" };
        }

        if (mxRecords.some(({ exchange }) => exchange.length > 0)) {
          return { status: "valid" };
        }

        return fallbackAddressLookup(resolver, domain, options.timeoutMs);
      } catch (error) {
        if (!isDefinitiveDnsError(error)) {
          return { status: "temporary-failure" };
        }

        return fallbackAddressLookup(resolver, domain, options.timeoutMs);
      }
    },
  };
}
