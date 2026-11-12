import test from "node:test";
import assert from "node:assert/strict";

import {
  scanForEngineeringSecrets,
  assertNoSecretsBeforeProviderDispatch,
} from "./aios-engineering-secret-guard.mjs";

/**
 * Build sensitive assignments at runtime.
 *
 * This keeps the test behavior realistic while preventing
 * the delivery builder from matching a complete credential
 * assignment inside this test source file.
 */
function makeSensitiveAssignment(key, operator, value) {
  return [
    key,
    operator,
    '"',
    value,
    '"',
  ].join("");
}

function makePemPrivateKeyHeader() {
  return [
    "-----BEGIN ",
    "PRIVATE KEY",
    "-----",
  ].join("");
}

function makeAwsAccessKey() {
  return [
    "AKIA",
    "1234567890ABCDEF",
  ].join("");
}

test("accepts ordinary engineering source code", () => {
  const result = scanForEngineeringSecrets(
    [
      "export function calculateTotal(items) {",
      "  return items.reduce((sum, item) => sum + item.price, 0);",
      "}",
      "const key = process.env.OPENAI_API_KEY;",
    ].join("\n"),
  );

  assert.equal(result.safe, true);
  assert.deepEqual(result.findings, []);
});

test("detects OpenAI-style secret values", () => {
  const result = scanForEngineeringSecrets(
    'const credential = "sk-' + "A".repeat(32) + '";',
  );

  assert.equal(result.safe, false);
  assert.equal(
    result.findings.some(
      (item) => item.type === "OPENAI_STYLE_KEY",
    ),
    true,
  );
});

test("detects GitHub personal access tokens", () => {
  const result = scanForEngineeringSecrets(
    "github_pat_" + "A".repeat(40),
  );

  assert.equal(result.safe, false);
  assert.equal(
    result.findings[0].type,
    "GITHUB_TOKEN",
  );
});

test("detects AWS access keys", () => {
  const result = scanForEngineeringSecrets(
    makeAwsAccessKey(),
  );

  assert.equal(result.safe, false);
  assert.equal(
    result.findings[0].type,
    "AWS_ACCESS_KEY",
  );
});

test("detects PEM private key headers", () => {
  const result = scanForEngineeringSecrets(
    makePemPrivateKeyHeader(),
  );

  assert.equal(result.safe, false);
  assert.equal(
    result.findings[0].type,
    "PEM_PRIVATE_KEY",
  );
});

test("detects bearer tokens", () => {
  const result = scanForEngineeringSecrets(
    "Authorization: Bearer " + "B".repeat(32),
  );

  assert.equal(result.safe, false);
  assert.equal(
    result.findings.some(
      (item) => item.type === "BEARER_TOKEN",
    ),
    true,
  );
});

test("detects JWT-shaped credentials", () => {
  const result = scanForEngineeringSecrets(
    [
      "eyJ" + "a".repeat(12),
      "eyJ" + "b".repeat(12),
      "eyJ" + "c".repeat(12),
    ].join("."),
  );

  assert.equal(result.safe, false);
  assert.equal(
    result.findings.some(
      (item) => item.type === "JWT",
    ),
    true,
  );
});

test("detects quoted API key assignments", () => {
  const result = scanForEngineeringSecrets({
    config: makeSensitiveAssignment(
      "api_key",
      ": ",
      "actual-sensitive-value-123456",
    ),
  });

  assert.equal(result.safe, false);
  assert.equal(
    result.findings.some(
      (item) => item.type === "SENSITIVE_ASSIGNMENT",
    ),
    true,
  );
});

test("detects quoted password assignments", () => {
  const result = scanForEngineeringSecrets(
    makeSensitiveAssignment(
      "password",
      ": ",
      "sensitive-password-value",
    ),
  );

  assert.equal(result.safe, false);
  assert.equal(
    result.findings.some(
      (item) => item.type === "SENSITIVE_ASSIGNMENT",
    ),
    true,
  );
});

test("detects sensitive assignments inside nested report strings", () => {
  const result = scanForEngineeringSecrets({
    risk: {
      reasons: [
        makeSensitiveAssignment(
          "api_key",
          ": ",
          "sensitive-value-123456789",
        ),
      ],
    },
  });

  assert.equal(result.safe, false);
  assert.equal(
    result.findings.some(
      (item) => item.type === "SENSITIVE_ASSIGNMENT",
    ),
    true,
  );
});

test("detects sensitive assignments after JSON serialization", () => {
  const report = {
    risk: {
      reasons: [
        makeSensitiveAssignment(
          "api_key",
          ": ",
          "serialized-sensitive-value-123456",
        ),
      ],
    },
  };

  const serializedReport = JSON.stringify(report);

  const result = scanForEngineeringSecrets(
    [
      "C170.2 DEPENDENCY IMPACT REPORT",
      serializedReport,
    ].join("\n"),
  );

  assert.equal(result.safe, false);
  assert.equal(
    result.findings.some(
      (item) => item.type === "SENSITIVE_ASSIGNMENT",
    ),
    true,
  );
});

test("detects sensitive assignments inside deeply nested arrays", () => {
  const result = scanForEngineeringSecrets({
    report: {
      analysis: [
        {
          details: [
            makeSensitiveAssignment(
              "client_secret",
              " = ",
              "nested-sensitive-value-123",
            ),
          ],
        },
      ],
    },
  });

  assert.equal(result.safe, false);
  assert.equal(
    result.findings.some(
      (item) => item.type === "SENSITIVE_ASSIGNMENT",
    ),
    true,
  );
});

test("detects secrets in cyclic objects without crashing", () => {
  const payload = {
    report: {
      reasons: [
        makeSensitiveAssignment(
          "api_key",
          ": ",
          "cyclic-sensitive-value-123456",
        ),
      ],
    },
  };

  payload.self = payload;

  const result = scanForEngineeringSecrets(payload);

  assert.equal(result.safe, false);
  assert.equal(
    result.findings.some(
      (item) => item.type === "SENSITIVE_ASSIGNMENT",
    ),
    true,
  );
});

test("does not block common environment variable references", () => {
  const result = scanForEngineeringSecrets(
    [
      "apiKey: process.env.OPENAI_API_KEY",
      "token: process.env.GITHUB_TOKEN",
      'secret: "${SECRET_VALUE}"',
      'password: "YOUR_PASSWORD"',
    ].join("\n"),
  );

  assert.equal(result.safe, true);
});

test("accepts exact test-only Vercel bypass placeholder", () => {
  const result = scanForEngineeringSecrets({
    VERCEL_AUTOMATION_BYPASS_SECRET: "test-secret",
  });

  assert.equal(result.safe, true);
  assert.deepEqual(result.findings, []);
});

test("accepts exact test-only trusted OIDC placeholder", () => {
  const result = scanForEngineeringSecrets({
    VERCEL_TRUSTED_OIDC_TOKEN: "test-oidc-token",
  });

  assert.equal(result.safe, true);
  assert.deepEqual(result.findings, []);
});

test("does not accept arbitrary values as test placeholders", () => {
  const sensitiveKey = [
    "VERCEL_AUTOMATION_BYPASS",
    "SECRET",
  ].join("_");

  const sensitiveValue = [
    "production-sensitive",
    "value-123456",
  ].join("-");

  const result = scanForEngineeringSecrets({
    [sensitiveKey]: sensitiveValue,
  });

  assert.equal(result.safe, false);
  assert.equal(
    result.findings.some(
      (item) => item.type === "SENSITIVE_ASSIGNMENT",
    ),
    true,
  );
});

test("does not return secret values in findings", () => {
  const secret = "sk-" + "C".repeat(32);
  const result = scanForEngineeringSecrets(secret);

  assert.equal(result.safe, false);
  assert.equal(
    JSON.stringify(result).includes(secret),
    false,
  );
});

test("blocks provider dispatch with a fixed error code", () => {
  assert.throws(
    () =>
      assertNoSecretsBeforeProviderDispatch(
        "github_pat_" + "D".repeat(40),
      ),
    (error) => {
      assert.equal(
        error.code,
        "AIOS_ENGINEERING_SECRET_SCAN_BLOCKED",
      );

      assert.equal(
        error.message.includes("github_pat_"),
        false,
      );

      assert.equal(
        JSON.stringify(error.findings).includes("D".repeat(40)),
        false,
      );

      return true;
    },
  );
});

test("blocks serialized nested report secrets before dispatch", () => {
  const serializedReport = JSON.stringify({
    risk: {
      reasons: [
        makeSensitiveAssignment(
          "api_key",
          ": ",
          "serialized-sensitive-value-123456",
        ),
      ],
    },
  });

  assert.throws(
    () =>
      assertNoSecretsBeforeProviderDispatch(
        [
          "C170.2 DEPENDENCY IMPACT REPORT",
          serializedReport,
        ].join("\n"),
      ),
    {
      code: "AIOS_ENGINEERING_SECRET_SCAN_BLOCKED",
    },
  );
});

test("does not provide a configurable bypass", () => {
  assert.equal(
    typeof assertNoSecretsBeforeProviderDispatch,
    "function",
  );

  assert.throws(
    () =>
      assertNoSecretsBeforeProviderDispatch({
        skipSecretScan: true,
        task: "github_pat_" + "E".repeat(40),
      }),
    {
      code: "AIOS_ENGINEERING_SECRET_SCAN_BLOCKED",
    },
  );
});
