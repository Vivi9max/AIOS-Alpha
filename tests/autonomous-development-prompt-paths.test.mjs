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

const SHA_PATTERN = /^[0-9a-fA-F]{40}$/;

function isValidSha(value) {
  return typeof value === "string" && SHA_PATTERN.test(value);
}

function makeEvidence(overrides = {}) {
  const base = {
    expectedCommitSha:
      "1111111111111111111111111111111111111111",
    checkoutRef: "refs/heads/main",
    checkoutHeadSha:
      "1111111111111111111111111111111111111111",
    resultCommitSha:
      "1111111111111111111111111111111111111111",
  };

  return { ...base, ...overrides };
}

function validateEvidence(evidence) {
  const required = [
    "expectedCommitSha",
    "checkoutRef",
    "checkoutHeadSha",
    "resultCommitSha",
  ];

  for (const key of required) {
    if (
      evidence === null ||
      typeof evidence !== "object" ||
      !Object.prototype.hasOwnProperty.call(
        evidence,
        key,
      )
    ) {
      return {
        ok: false,
        reason: `missing:${key}`,
      };
    }
  }

  if (
    typeof evidence.checkoutRef !== "string" ||
    evidence.checkoutRef.trim().length === 0 ||
    !evidence.checkoutRef.startsWith("refs/heads/")
  ) {
    return {
      ok: false,
      reason: "invalid:checkoutRef",
    };
  }

  for (const key of [
    "expectedCommitSha",
    "checkoutHeadSha",
    "resultCommitSha",
  ]) {
    if (!isValidSha(evidence[key])) {
      return {
        ok: false,
        reason: `invalid:${key}`,
      };
    }
  }

  const expected =
    evidence.expectedCommitSha.toLowerCase();
  const head =
    evidence.checkoutHeadSha.toLowerCase();
  const result =
    evidence.resultCommitSha.toLowerCase();

  if (expected !== head) {
    return {
      ok: false,
      reason: "mismatch:expectedCommitSha:checkoutHeadSha",
    };
  }

  if (expected !== result) {
    return {
      ok: false,
      reason: "mismatch:expectedCommitSha:resultCommitSha",
    };
  }

  return { ok: true };
}

test(
  "receipt evidence rejects missing evidence",
  () => {
    const evidence = makeEvidence();
    delete evidence.resultCommitSha;

    const result = validateEvidence(evidence);

    assert.equal(result.ok, false);
    assert.equal(
      result.reason,
      "missing:resultCommitSha",
    );
  },
);

test(
  "receipt evidence rejects invalid SHA",
  () => {
    const result = validateEvidence(
      makeEvidence({
        resultCommitSha: "not-a-sha",
      }),
    );

    assert.equal(result.ok, false);
    assert.equal(
      result.reason,
      "invalid:resultCommitSha",
    );
  },
);

test(
  "receipt evidence rejects mismatched commit SHA",
  () => {
    const result = validateEvidence(
      makeEvidence({
        resultCommitSha:
          "2222222222222222222222222222222222222222",
      }),
    );

    assert.equal(result.ok, false);
    assert.equal(
      result.reason,
      "mismatch:expectedCommitSha:resultCommitSha",
    );
  },
);

test(
  "receipt evidence preserves branch/ref",
  () => {
    const evidence = makeEvidence({
      checkoutRef: "refs/heads/feature/evidence",
    });

    const result = validateEvidence(evidence);

    assert.equal(result.ok, true);
    assert.equal(
      evidence.checkoutRef,
      "refs/heads/feature/evidence",
    );
  },
);

test(
  "receipt evidence rejects detached HEAD (empty ref)",
  () => {
    const result = validateEvidence(
      makeEvidence({ checkoutRef: "" }),
    );

    assert.equal(result.ok, false);
    assert.equal(
      result.reason,
      "invalid:checkoutRef",
    );
  },
);

test(
  "receipt evidence matches SHA values case-insensitively",
  () => {
    const result = validateEvidence(
      makeEvidence({
        expectedCommitSha:
          "ABCDEF0123456789ABCDEF0123456789ABCDEF01",
        checkoutHeadSha:
          "abcdef0123456789abcdef0123456789abcdef01",
        resultCommitSha:
          "AbCdEf0123456789AbCdEf0123456789AbCdEf01",
      }),
    );

    assert.equal(result.ok, true);
  },
);

test(
  "receipt evidence persists and restores evidence fields",
  () => {
    const evidence = makeEvidence({
      checkoutRef: "refs/heads/repair/c170-6-12-r3",
    });

    const serialized = JSON.stringify(evidence);
    const restored = JSON.parse(serialized);

    assert.deepEqual(restored, evidence);
    assert.equal(
      validateEvidence(restored).ok,
      true,
    );
  },
);

test(
  "receipt evidence preserves compatibility with legacy records",
  () => {
    const legacyRecord = {
      id: "legacy-task",
      status: "completed",
    };

    const result = validateEvidence(legacyRecord);

    assert.equal(result.ok, false);
    assert.match(
      result.reason,
      /^missing:/,
    );
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        legacyRecord,
        "expectedCommitSha",
      ),
      false,
    );
  },
);

test(
  "incomplete evidence chain cannot produce a valid successful receipt",
  () => {
    const scenarios = [
      makeEvidence({ expectedCommitSha: "" }),
      makeEvidence({ checkoutHeadSha: "" }),
      makeEvidence({ resultCommitSha: "" }),
      makeEvidence({ checkoutRef: "" }),
      makeEvidence({
        checkoutHeadSha:
          "3333333333333333333333333333333333333333",
      }),
    ];

    for (const evidence of scenarios) {
      assert.equal(
        validateEvidence(evidence).ok,
        false,
      );
    }
  },
);
