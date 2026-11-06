import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(
  new URL(
    "../lib/github/autonomous-development-prompt.ts",
    import.meta.url,
  ),
  "utf8",
);

function getRepositoryPathPattern() {
  const match = source.match(
    /const pattern\s*=\s*\/([\s\S]*?)\/g;/,
  );

  assert.ok(
    match,
    "repository path regex must exist in the prompt module",
  );

  return new RegExp(
    match[1],
    "g",
  );
}

test(
  "explicit target parser allows dotted filename stems",
  () => {
    const pattern =
      getRepositoryPathPattern();

    const objective =
      "Target file: docs/C169.8-staging-smoke-test.md";

    assert.deepEqual(
      Array.from(
        objective.matchAll(pattern),
        (item) => item[0],
      ),
      [
        "docs/C169.8-staging-smoke-test.md",
      ],
    );
  },
);

test(
  "explicit target parser retains normal source and document paths",
  () => {
    const pattern =
      getRepositoryPathPattern();

    const objective = [
      "Update app/founder/page.tsx",
      "and lib/github/bridge.ts",
      "and docs/architecture.md",
    ].join(" ");

    assert.deepEqual(
      Array.from(
        objective.matchAll(pattern),
        (item) => item[0],
      ),
      [
        "app/founder/page.tsx",
        "lib/github/bridge.ts",
        "docs/architecture.md",
      ],
    );
  },
);

test(
  "explicit target parser preserves versioned multi-dot filenames",
  () => {
    const pattern =
      getRepositoryPathPattern();

    const objective =
      "Create docs/C169.8.1-release-notes.v2.md";

    assert.deepEqual(
      Array.from(
        objective.matchAll(pattern),
        (item) => item[0],
      ),
      [
        "docs/C169.8.1-release-notes.v2.md",
      ],
    );
  },
);

const SHA_PATTERN = /^[0-9a-f]{40}$/i;

function isString(value) {
  return typeof value === "string" && value.length > 0;
}

function isSha(value) {
  return isString(value) && SHA_PATTERN.test(value);
}

function shasMatch(a, b) {
  return isString(a) && isString(b) && a.toLowerCase() === b.toLowerCase();
}

function assertStrictReceiptEvidence(evidence) {
  assert.ok(evidence, "receipt evidence must exist");

  assert.ok(
    isString(evidence.commitSha),
    "commitSha must be a non-empty string",
  );
  assert.ok(
    isString(evidence.resultCommitSha),
    "resultCommitSha must be a non-empty string",
  );
  assert.ok(
    isString(evidence.expectedCommitSha),
    "expectedCommitSha must be a non-empty string",
  );
  assert.ok(
    isString(evidence.checkoutHeadSha),
    "checkoutHeadSha must be a non-empty string",
  );

  assert.ok(isSha(evidence.commitSha), "commitSha must be a valid 40-char hex SHA");
  assert.ok(
    isSha(evidence.resultCommitSha),
    "resultCommitSha must be a valid 40-char hex SHA",
  );
  assert.ok(
    isSha(evidence.expectedCommitSha),
    "expectedCommitSha must be a valid 40-char hex SHA",
  );
  assert.ok(
    isSha(evidence.checkoutHeadSha),
    "checkoutHeadSha must be a valid 40-char hex SHA",
  );

  assert.ok(
    shasMatch(evidence.commitSha, evidence.resultCommitSha),
    "commitSha must match resultCommitSha (case-insensitive)",
  );
  assert.ok(
    shasMatch(evidence.commitSha, evidence.expectedCommitSha),
    "commitSha must match expectedCommitSha (case-insensitive)",
  );
  assert.ok(
    shasMatch(evidence.commitSha, evidence.checkoutHeadSha),
    "commitSha must match checkoutHeadSha (case-insensitive)",
  );

  assert.ok(
    isString(evidence.checkoutRef),
    "checkoutRef must be a real branch/ref string",
  );
  assert.ok(
    !/^[0-9a-f]{40}$/i.test(evidence.checkoutRef),
    "checkoutRef must not be a detached raw SHA",
  );
}

const VALID_SHA =
  "c64588f278075d649138cae063f724f7b179444e";

function buildValidEvidence(overrides) {
  return {
    commitSha: VALID_SHA,
    resultCommitSha: VALID_SHA,
    expectedCommitSha: VALID_SHA,
    checkoutHeadSha: VALID_SHA,
    checkoutRef:
      "refs/heads/c169-8-ad-ad-1793971076282-vfugez-repair-2",
    ...overrides,
  };
}

test(
  "strict receipt evidence rejects missing commitSha",
  () => {
    assert.throws(
      () =>
        assertStrictReceiptEvidence(
          buildValidEvidence({ commitSha: undefined }),
        ),
      /commitSha/,
    );
  },
);

test(
  "strict receipt evidence rejects invalid SHA format",
  () => {
    assert.throws(
      () =>
        assertStrictReceiptEvidence(
          buildValidEvidence({ commitSha: "not-a-sha" }),
        ),
      /40-char hex SHA/,
    );
  },
);

test(
  "strict receipt evidence rejects mismatched SHA",
  () => {
    assert.throws(
      () =>
        assertStrictReceiptEvidence(
          buildValidEvidence({
            resultCommitSha:
              "0000000000000000000000000000000000000000",
          }),
        ),
      /match resultCommitSha/,
    );
  },
);

test(
  "strict receipt evidence rejects missing checkoutRef",
  () => {
    assert.throws(
      () =>
        assertStrictReceiptEvidence(
          buildValidEvidence({ checkoutRef: undefined }),
        ),
      /checkoutRef/,
    );
  },
);

test(
  "strict receipt evidence rejects detached checkout raw SHA as checkoutRef",
  () => {
    assert.throws(
      () =>
        assertStrictReceiptEvidence(
          buildValidEvidence({ checkoutRef: VALID_SHA }),
        ),
      /checkoutRef must not be a detached raw SHA/,
    );
  },
);

test(
  "strict receipt evidence accepts valid matching evidence",
  () => {
    assert.doesNotThrow(() =>
      assertStrictReceiptEvidence(buildValidEvidence()),
    );
  },
);
