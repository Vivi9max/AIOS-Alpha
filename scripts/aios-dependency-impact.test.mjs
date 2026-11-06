
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";

import {
  buildRepositoryIndex,
} from "./aios-engineering-context.mjs";

import {
  analyzeDependencyImpact,
} from "./aios-dependency-impact.mjs";

function git(root, args) {
  execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function write(root, relativePath, content) {
  const absolutePath = path.join(root, relativePath);

  fs.mkdirSync(path.dirname(absolutePath), {
    recursive: true,
  });

  fs.writeFileSync(absolutePath, content);
}

function commitAll(root, message) {
  git(root, ["add", "-A"]);
  git(root, ["commit", "-m", message]);
}

function createFixture() {
  const root = fs.mkdtempSync(
    path.join(os.tmpdir(), "aios-dependency-impact-"),
  );

  git(root, ["init"]);
  git(root, ["config", "user.name", "AIOS Test"]);
  git(root, ["config", "user.email", "aios-test@example.invalid"]);

  write(
    root,
    "package.json",
    JSON.stringify({
      name: "aios-impact-fixture",
      private: true,
    }, null, 2),
  );

  write(
    root,
    "tsconfig.json",
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          module: "commonjs",
          moduleResolution: "node",
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true,
        },
        include: ["src/**/*.ts"],
      },
      null,
      2,
    ),
  );

  write(
    root,
    "src/base.ts",
    [
      "export function base(): number {",
      "  return 1;",
      "}",
      "",
    ].join("\n"),
  );

  write(
    root,
    "src/service.ts",
    [
      'import { base } from "./base";',
      "",
      "export function service(): number {",
      "  return base() + 1;",
      "}",
      "",
    ].join("\n"),
  );

  write(
    root,
    "src/feature.ts",
    [
      'import { service } from "./service";',
      "",
      "export function feature(): number {",
      "  return service() + 1;",
      "}",
      "",
    ].join("\n"),
  );

  write(
    root,
    "src/__tests__/service.test.ts",
    [
      'import { service } from "../service";',
      "",
      "export const serviceTestValue = service();",
      "",
    ].join("\n"),
  );

  write(
    root,
    "src/__tests__/base.test.ts",
    [
      'import { base } from "../base";',
      "",
      "export const baseTestValue = base();",
      "",
    ].join("\n"),
  );

  commitAll(root, "initial fixture");

  return root;
}

function cleanup(root) {
  fs.rmSync(root, {
    recursive: true,
    force: true,
  });
}

test("analyzes recursive reverse dependencies", () => {
  const root = createFixture();

  try {
    const result = analyzeDependencyImpact(
      root,
      ["src/base.ts"],
    );

    assert.equal(result.analyzer, "C170.2");
    assert.equal(result.repository.head, gitHead(root));
    assert.deepEqual(result.changedFiles, ["src/base.ts"]);

    assert.deepEqual(
      result.affectedFiles.map((item) => item.path),
      [
        "src/__tests__/base.test.ts",
        "src/service.ts",
        "src/__tests__/service.test.ts",
        "src/feature.ts",
      ].sort((a, b) => {
        const left = result.affectedFiles.find(
          (item) => item.path === a,
        );
        const right = result.affectedFiles.find(
          (item) => item.path === b,
        );

        return (
          left.minimumDepth - right.minimumDepth ||
          left.path.localeCompare(right.path)
        );
      }),
    );

    assert.ok(
      result.affectedFiles.some(
        (item) => item.path === "src/feature.ts",
      ),
    );

    assert.equal(result.readOnly, true);
    assert.equal(result.requiresFounderReview, true);
  } finally {
    cleanup(root);
  }
});

test("returns direct dependencies for changed files", () => {
  const root = createFixture();

  try {
    const result = analyzeDependencyImpact(
      root,
      ["src/service.ts"],
    );

    assert.deepEqual(
      result.perFile[0].directDependencies,
      ["src/base.ts"],
    );
  } finally {
    cleanup(root);
  }
});

test("deduplicates changed paths and merges impact sources", () => {
  const root = createFixture();

  try {
    const result = analyzeDependencyImpact(
      root,
      [
        "src/base.ts",
        "src/service.ts",
        "src/base.ts",
      ],
    );

    assert.deepEqual(
      result.changedFiles,
      ["src/base.ts", "src/service.ts"],
    );

    assert.equal(result.changedFileCount, 2);

    const feature = result.affectedFiles.find(
      (item) => item.path === "src/feature.ts",
    );

    assert.ok(feature);
    assert.deepEqual(
      feature.impactedBy,
      ["src/base.ts", "src/service.ts"],
    );
  } finally {
    cleanup(root);
  }
});

test("detects likely test candidates", () => {
  const root = createFixture();

  try {
    const result = analyzeDependencyImpact(
      root,
      ["src/service.ts"],
    );

    assert.ok(
      result.likelyTests.includes(
        "src/__tests__/service.test.ts",
      ),
    );
  } finally {
    cleanup(root);
  }
});

test("classifies package configuration changes as critical", () => {
  const root = createFixture();

  try {
    const result = analyzeDependencyImpact(
      root,
      ["package.json"],
    );

    assert.equal(result.risk.level, "critical");
    assert.deepEqual(
      result.configurationChanges,
      ["package.json"],
    );
  } finally {
    cleanup(root);
  }
});

test("rejects dirty tracked worktrees", () => {
  const root = createFixture();

  try {
    write(
      root,
      "src/base.ts",
      "export function base(): number { return 99; }\n",
    );

    assert.throws(
      () =>
        analyzeDependencyImpact(
          root,
          ["src/base.ts"],
        ),
      (error) =>
        error.code ===
        "AIOS_ENGINEERING_TRACKED_WORKTREE_DIRTY",
    );
  } finally {
    cleanup(root);
  }
});

test("rejects stale repository indexes", () => {
  const root = createFixture();

  try {
    const oldIndex = buildRepositoryIndex(root);

    write(
      root,
      "src/base.ts",
      "export function base(): number { return 99; }\n",
    );

    commitAll(root, "advance repository");

    assert.throws(
      () =>
        analyzeDependencyImpact(
          root,
          ["src/base.ts"],
          oldIndex,
        ),
      (error) =>
        error.code === "AIOS_IMPACT_INDEX_STALE",
    );
  } finally {
    cleanup(root);
  }
});

test("rejects untracked changed files", () => {
  const root = createFixture();

  try {
    write(
      root,
      "src/new-file.ts",
      "export const value = 1;\n",
    );

    assert.throws(
      () =>
        analyzeDependencyImpact(
          root,
          ["src/new-file.ts"],
        ),
      (error) =>
        error.code ===
        "AIOS_IMPACT_CHANGED_FILE_NOT_TRACKED",
    );
  } finally {
    cleanup(root);
  }
});

test("rejects path traversal", () => {
  const root = createFixture();

  try {
    assert.throws(
      () =>
        analyzeDependencyImpact(
          root,
          ["../outside.ts"],
        ),
      (error) =>
        error.code === "AIOS_IMPACT_PATH_INVALID",
    );
  } finally {
    cleanup(root);
  }
});

test("rejects a tampered dependency graph", () => {
  const root = createFixture();

  try {
    const index = buildRepositoryIndex(root);

    index.graph.dependencies["src/base.ts"] = [
      "src/not-tracked.ts",
    ];

    assert.throws(
      () =>
        analyzeDependencyImpact(
          root,
          ["src/base.ts"],
          index,
        ),
      (error) =>
        error.code === "AIOS_IMPACT_INDEX_GRAPH_MISMATCH",
    );
  } finally {
    cleanup(root);
  }
});

test("rejects empty and oversized change sets", () => {
  const root = createFixture();

  try {
    assert.throws(
      () =>
        analyzeDependencyImpact(
          root,
          [],
        ),
      (error) =>
        error.code ===
        "AIOS_IMPACT_CHANGED_FILES_REQUIRED",
    );

    assert.throws(
      () =>
        analyzeDependencyImpact(
          root,
          Array.from(
            { length: 101 },
            (_, index) => `src/file-${index}.ts`,
          ),
        ),
      (error) =>
        error.code ===
        "AIOS_IMPACT_CHANGED_FILE_LIMIT",
    );
  } finally {
    cleanup(root);
  }
});

test("detects dependency cycles without infinite traversal", () => {
  const root = createFixture();

  try {
    write(
      root,
      "src/feature.ts",
      [
        'import { service } from "./service";',
        'import { base } from "./base";',
        "export function feature(): number {",
        "  return service() + base();",
        "}",
        "",
      ].join("\n"),
    );

    write(
      root,
      "src/service.ts",
      [
        'import { feature } from "./feature";',
        'import { base } from "./base";',
        "export function service(): number {",
        "  return base() + feature();",
        "}",
        "",
      ].join("\n"),
    );

    commitAll(root, "add dependency cycle");

    const result = analyzeDependencyImpact(
      root,
      ["src/base.ts"],
    );

    assert.ok(
      result.affectedFiles.length < 20,
    );

    assert.ok(
      result.affectedFiles.some(
        (item) => item.path === "src/service.ts",
      ),
    );

    assert.ok(
      result.affectedFiles.some(
        (item) => item.path === "src/feature.ts",
      ),
    );
  } finally {
    cleanup(root);
  }
});

function gitHead(root) {
  return execFileSync(
    "git",
    ["rev-parse", "HEAD"],
    {
      cwd: root,
      encoding: "utf8",
    },
  ).trim();
}

test("reports configuration changes for lockfile-only edits", () => {
  const root = createFixture();

  try {
    write(
      root,
      "package-lock.json",
      JSON.stringify(
        {
          name: "aios-impact-fixture",
          lockfileVersion: 3,
          requires: true,
          packages: {
            "": {
              name: "aios-impact-fixture",
            },
          },
        },
        null,
        2,
      ),
    );

    commitAll(root, "add lockfile");

    const result = analyzeDependencyImpact(
      root,
      ["package-lock.json"],
    );

    assert.deepEqual(
      result.configurationChanges,
      ["package-lock.json"],
    );

    assert.equal(result.readOnly, true);
    assert.equal(result.requiresFounderReview, true);
  } finally {
    cleanup(root);
  }
});

test("treats lockfile and manifest changes as a single critical impact", () => {
  const root = createFixture();

  try {
    write(
      root,
      "package.json",
      JSON.stringify(
        {
          name: "aios-impact-fixture",
          private: true,
          dependencies: {
            "left-pad": "1.3.0",
          },
        },
        null,
        2,
      ),
    );

    write(
      root,
      "package-lock.json",
      JSON.stringify(
        {
          name: "aios-impact-fixture",
          lockfileVersion: 3,
          requires: true,
          packages: {
            "": {
              name: "aios-impact-fixture",
              dependencies: {
                "left-pad": "1.3.0",
              },
            },
            "node_modules/left-pad": {
              version: "1.3.0",
            },
          },
        },
        null,
        2,
      ),
    );

    commitAll(root, "add dependency and lockfile");

    const result = analyzeDependencyImpact(
      root,
      ["package.json", "package-lock.json"],
    );

    assert.equal(result.risk.level, "critical");
    assert.deepEqual(
      result.configurationChanges,
      ["package-lock.json", "package.json"],
    );
    assert.deepEqual(
      result.changedFiles,
      ["package-lock.json", "package.json"],
    );
    assert.equal(result.changedFileCount, 2);
  } finally {
    cleanup(root);
  }
});

test("preserves deterministic ordering for configuration changes", () => {
  const root = createFixture();

  try {
    write(
      root,
      "package-lock.json",
      JSON.stringify(
        {
          name: "aios-impact-fixture",
          lockfileVersion: 3,
          requires: true,
          packages: {
            "": {
              name: "aios-impact-fixture",
            },
          },
        },
        null,
        2,
      ),
    );

    commitAll(root, "add lockfile");

    const result = analyzeDependencyImpact(
      root,
      ["package-lock.json", "package.json"],
    );

    assert.deepEqual(
      result.configurationChanges,
      ["package-lock.json", "package.json"],
    );
  } finally {
    cleanup(root);
  }
});
