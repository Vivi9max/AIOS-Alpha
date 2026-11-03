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
