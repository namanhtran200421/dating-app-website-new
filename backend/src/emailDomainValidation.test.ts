import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createEmailDomainValidator,
  type MailDnsResolver,
} from "./services/emailDomainValidation.js";

function dnsError(code: string): Error {
  return Object.assign(new Error(code), { code });
}

function resolver(
  overrides: Partial<MailDnsResolver> = {},
): MailDnsResolver {
  return {
    async resolveMx() {
      return [{ exchange: "mx.example.net", priority: 10 }];
    },
    async resolve4() {
      throw dnsError("ENODATA");
    },
    async resolve6() {
      throw dnsError("ENODATA");
    },
    ...overrides,
  };
}

test("accepts domains with MX records", async () => {
  const validator = createEmailDomainValidator({
    blockDisposableEmails: true,
    resolver: resolver(),
    timeoutMs: 100,
  });
  assert.deepEqual(await validator.validate("person@example.com"), {
    status: "valid",
  });
});

test("accepts A or AAAA fallback when a domain has no MX", async () => {
  const validator = createEmailDomainValidator({
    blockDisposableEmails: false,
    resolver: resolver({
      async resolveMx() {
        throw dnsError("ENODATA");
      },
      async resolve4() {
        return ["192.0.2.1"];
      },
    }),
    timeoutMs: 100,
  });
  assert.deepEqual(await validator.validate("person@example.com"), {
    status: "valid",
  });
});

test("rejects Null MX and domains without mail or address records", async () => {
  const nullMx = createEmailDomainValidator({
    blockDisposableEmails: false,
    resolver: resolver({
      async resolveMx() {
        return [{ exchange: ".", priority: 0 }];
      },
    }),
    timeoutMs: 100,
  });
  const nonexistent = createEmailDomainValidator({
    blockDisposableEmails: false,
    resolver: resolver({
      async resolveMx() {
        throw dnsError("ENOTFOUND");
      },
    }),
    timeoutMs: 100,
  });

  assert.deepEqual(await nullMx.validate("person@example.com"), {
    status: "invalid",
    reason: "no-mail",
  });
  assert.deepEqual(await nonexistent.validate("person@example.com"), {
    status: "invalid",
    reason: "no-mail",
  });
});

test("rejects known disposable domains before DNS lookup", async () => {
  let dnsCalls = 0;
  const validator = createEmailDomainValidator({
    blockDisposableEmails: true,
    resolver: resolver({
      async resolveMx() {
        dnsCalls += 1;
        return [];
      },
    }),
    timeoutMs: 100,
  });

  assert.deepEqual(await validator.validate("person@mailinator.com"), {
    status: "invalid",
    reason: "disposable",
  });
  assert.equal(dnsCalls, 0);
});

test("DNS timeouts and transient errors fail temporarily without hanging", async () => {
  const timedOut = createEmailDomainValidator({
    blockDisposableEmails: false,
    resolver: resolver({
      async resolveMx() {
        return new Promise(() => undefined);
      },
    }),
    timeoutMs: 10,
  });
  const transient = createEmailDomainValidator({
    blockDisposableEmails: false,
    resolver: resolver({
      async resolveMx() {
        throw dnsError("SERVFAIL");
      },
    }),
    timeoutMs: 100,
  });

  assert.deepEqual(await timedOut.validate("person@example.com"), {
    status: "temporary-failure",
  });
  assert.deepEqual(await transient.validate("person@example.com"), {
    status: "temporary-failure",
  });
});
