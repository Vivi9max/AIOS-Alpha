#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildRepositoryIndex,
} from "./aios-engineering-context.mjs";

const SCRIPT_FILE = fileURLToPath(import.meta.url);

const LIMITS = Object.freeze({
  maxChangedFiles: 100,
  maxAffectedFiles: 5000,
  maxTestCandidates: 200,
});

const ROOT_CONFIGS = new Set([
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "eslint.config.js",
  "eslint.config.mjs",
  ".gitignore",
  "next-env.d.ts",
  ".npmrc",
  ".nvmrc",
]);

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function normalizePath(value) {
  return value.split(path.sep).join("/");
}

function assertRepositoryPath(value) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 1024 ||
    value.includes("\0") ||
    value.includes("\\") ||
    path.posix.isAbsolute(value) ||
    value.split("/").some(
      (segment) =>
        segment === ".." ||
        segment === "." ||
        segment.length === 0,
    )
  ) {
    fail(
      "AIOS_IMPACT_PATH_INVALID",
      `Invalid repository-relative path: ${String(value)}`,
    );
  }

  return value;
}

function assertIndexShape(index) {
  if (
    !index ||
    typeof index !== "object" ||
    index.schemaVersion !== 1 ||
    typeof index.head !== "string" ||
    !Array.isArray(index.trackedFiles) ||
    !index.graph ||
    typeof index.graph !== "object" ||
    !index.graph.dependencies ||
    typeof index.graph.dependencies !== "object" ||
    !index.graph.reverseDependencies ||
    typeof index.graph.reverseDependencies !== "object"
  ) {
    fail(
      "AIOS_IMPACT_INDEX_INVALID",
      "The supplied C170.1 repository index has an invalid structure.",
    );
  }

  if (!/^[0-9a-f]{40,64}$/i.test(index.head)) {
    fail(
      "AIOS_IMPACT_INDEX_INVALID",
      "The supplied repository index has an invalid HEAD.",
    );
  }
}

function stableJson(value) {
  return JSON.stringify(value);
}

function validateIndexAgainstFreshSnapshot(
  suppliedIndex,
  freshIndex,
) {
  if (!suppliedIndex) {
    return;
  }

  assertIndexShape(suppliedIndex);

  if (suppliedIndex.head !== freshIndex.head) {
    fail(
      "AIOS_IMPACT_INDEX_STALE",
      "The supplied repository index does not match the current Git HEAD.",
    );
  }

  const suppliedPaths = suppliedIndex.trackedFiles
    .map((item) => item?.path)
    .sort();

  const freshPaths = freshIndex.trackedFiles
    .map((item) => item.path)
    .sort();

  if (
    stableJson(suppliedPaths) !==
    stableJson(freshPaths)
  ) {
    fail(
      "AIOS_IMPACT_INDEX_FILESET_MISMATCH",
      "The supplied repository index has a different tracked-file inventory.",
    );
  }

  if (
    stableJson(suppliedIndex.graph) !==
    stableJson(freshIndex.graph)
  ) {
    fail(
      "AIOS_IMPACT_INDEX_GRAPH_MISMATCH",
      "The supplied dependency graph differs from the current repository graph.",
    );
  }
}

function validateGraph(graph, trackedSet) {
  for (const [source, dependencies] of Object.entries(
    graph.dependencies,
  )) {
    if (!trackedSet.has(source) || !Array.isArray(dependencies)) {
      fail(
        "AIOS_IMPACT_GRAPH_INVALID",
        `Invalid dependency graph entry: ${source}`,
      );
    }

    for (const dependency of dependencies) {
      if (
        typeof dependency !== "string" ||
        !trackedSet.has(dependency)
      ) {
        fail(
          "AIOS_IMPACT_GRAPH_INVALID",
          `Dependency graph references an untracked file from ${source}.`,
        );
      }
    }
  }

  for (const [target, importers] of Object.entries(
    graph.reverseDependencies,
  )) {
    if (!trackedSet.has(target) || !Array.isArray(importers)) {
      fail(
        "AIOS_IMPACT_GRAPH_INVALID",
        `Invalid reverse dependency graph entry: ${target}`,
      );
    }

    for (const importer of importers) {
      if (
        typeof importer !== "string" ||
        !trackedSet.has(importer)
      ) {
        fail(
          "AIOS_IMPACT_GRAPH_INVALID",
          `Reverse dependency graph references an untracked file from ${target}.`,
        );
      }
    }
  }
}

function getTestCandidates(changedPath, trackedFiles) {
  const base = path.posix.basename(changedPath).toLowerCase();
  const stem = base.replace(/\.(tsx?|jsx?)$/, "");
  const directory = path.posix.dirname(changedPath);

  return trackedFiles
    .filter((candidate) => {
      const lower = candidate.toLowerCase();
      const candidateBase = path.posix.basename(lower);

      const testLike =
        /\.(test|spec)\.(tsx?|jsx?)$/.test(candidateBase) ||
        lower.includes("/__tests__/") ||
        lower.startsWith("tests/") ||
        lower.startsWith("test/");

      if (!testLike) {
        return false;
      }

      return (
        candidateBase.includes(stem) ||
        path.posix.dirname(candidate) === directory ||
        lower.includes("autonomous-development")
      );
    })
    .sort()
    .slice(0, LIMITS.maxTestCandidates);
}

function collectReverseImpact(
  changedPath,
  reverseDependencies,
) {
  const visited = new Set([changedPath]);
  const queue = [
    {
      file: changedPath,
      depth: 0,
    },
  ];

  const impacted = [];

  while (queue.length > 0) {
    const current = queue.shift();

    const importers = reverseDependencies[current.file] ?? [];

    for (const importer of [...importers].sort()) {
      if (visited.has(importer)) {
        continue;
      }

      visited.add(importer);

      const item = {
        path: importer,
        depth: current.depth + 1,
        impactedBy: current.file,
      };

      impacted.push(item);

      if (visited.size > LIMITS.maxAffectedFiles) {
        fail(
          "AIOS_IMPACT_AFFECTED_FILE_LIMIT",
          `Impact analysis exceeded ${LIMITS.maxAffectedFiles} affected files.`,
        );
      }

      queue.push({
        file: importer,
        depth: current.depth + 1,
      });
    }
  }

  return impacted.sort(
    (a, b) =>
      a.depth - b.depth ||
      a.path.localeCompare(b.path),
  );
}

function classifyRisk({
  changedPaths,
  affectedFiles,
  configurationChanges,
}) {
  const reasons = [];

  if (configurationChanges.length > 0) {
    reasons.push(
      "One or more root-level project configuration files changed.",
    );
  }

  if (changedPaths.length >= 10) {
    reasons.push(
      "The change set contains at least 10 files.",
    );
  }

  if (affectedFiles.length >= 100) {
    reasons.push(
      "The recursive reverse-dependency impact reaches at least 100 files.",
    );
  }

  if (
    configurationChanges.some((file) =>
      [
        "package.json",
        "package-lock.json",
        "tsconfig.json",
        ".npmrc",
        ".nvmrc",
      ].includes(file),
    )
  ) {
    return {
      level: "critical",
      reasons: [
        ...reasons,
        "A package, lockfile, Node.js runtime, or TypeScript project configuration file changed.",
      ],
    };
  }

  if (
    configurationChanges.length > 0 ||
    changedPaths.length >= 10 ||
    affectedFiles.length >= 100
  ) {
    return {
      level: "high",
      reasons,
    };
  }

  if (
    changedPaths.length >= 3 ||
    affectedFiles.length >= 10
  ) {
    return {
      level: "moderate",
      reasons: [
        ...reasons,
        "The change affects multiple files or has a non-trivial dependency reach.",
      ],
    };
  }

  return {
    level: "low",
    reasons: [
      "No high-impact configuration changes or large dependency fan-out were detected.",
      "Low risk is a static-analysis classification, not a guarantee of safety.",
    ],
  };
}

export function analyzeDependencyImpact(
  root = process.cwd(),
  changedPaths = [],
  repositoryIndex = undefined,
) {
  if (!Array.isArray(changedPaths) || changedPaths.length === 0) {
    fail(
      "AIOS_IMPACT_CHANGED_FILES_REQUIRED",
      "At least one changed repository-relative file path is required.",
    );
  }

  if (changedPaths.length > LIMITS.maxChangedFiles) {
    fail(
      "AIOS_IMPACT_CHANGED_FILE_LIMIT",
      `Change set exceeds ${LIMITS.maxChangedFiles} files.`,
    );
  }

  const normalizedPaths = [
    ...new Set(changedPaths.map(assertRepositoryPath)),
  ].sort();

  const freshIndex = buildRepositoryIndex(root);

  validateIndexAgainstFreshSnapshot(
    repositoryIndex,
    freshIndex,
  );

  const trackedFiles = freshIndex.trackedFiles
    .map((item) => item.path)
    .sort();

  const trackedSet = new Set(trackedFiles);

  for (const changedPath of normalizedPaths) {
    if (!trackedSet.has(changedPath)) {
      fail(
        "AIOS_IMPACT_CHANGED_FILE_NOT_TRACKED",
        `Changed file is not tracked in the current repository: ${changedPath}`,
      );
    }
  }

  validateGraph(freshIndex.graph, trackedSet);

  const dependencies = freshIndex.graph.dependencies;
  const reverseDependencies =
    freshIndex.graph.reverseDependencies;

  const affectedByPath = new Map();
  const perFile = [];

  for (const changedPath of normalizedPaths) {
    const directDependencies = [
      ...(dependencies[changedPath] ?? []),
    ].sort();

    const reverseImpact = collectReverseImpact(
      changedPath,
      reverseDependencies,
    );

    const testCandidates = getTestCandidates(
      changedPath,
      trackedFiles,
    );

    for (const item of reverseImpact) {
      if (!affectedByPath.has(item.path)) {
        affectedByPath.set(item.path, {
          path: item.path,
          minimumDepth: item.depth,
          impactedBy: [changedPath],
        });
      } else {
        const existing = affectedByPath.get(item.path);

        existing.minimumDepth = Math.min(
          existing.minimumDepth,
          item.depth,
        );

        existing.impactedBy = [
          ...new Set([
            ...existing.impactedBy,
            changedPath,
          ]),
        ].sort();
      }
    }

    perFile.push({
      path: changedPath,
      directDependencies,
      reverseImporters: reverseImpact,
      likelyTests: testCandidates,
      directImporterCount:
        reverseDependencies[changedPath]?.length ?? 0,
      recursiveAffectedCount: reverseImpact.length,
      isRootConfiguration: ROOT_CONFIGS.has(changedPath),
    });
  }

  const affectedFiles = [
    ...affectedByPath.values(),
  ].sort(
    (a, b) =>
      a.minimumDepth - b.minimumDepth ||
      a.path.localeCompare(b.path),
  );

  if (affectedFiles.length > LIMITS.maxAffectedFiles) {
    fail(
      "AIOS_IMPACT_AFFECTED_FILE_LIMIT",
      `Combined impact exceeds ${LIMITS.maxAffectedFiles} files.`,
    );
  }

  const configurationChanges = normalizedPaths
    .filter((item) => ROOT_CONFIGS.has(item))
    .sort();

  const allTestCandidates = [
    ...new Set(
      perFile.flatMap((item) => item.likelyTests),
    ),
  ].sort();

  const risk = classifyRisk({
    changedPaths: normalizedPaths,
    affectedFiles,
    configurationChanges,
  });

  return {
    schemaVersion: 1,
    analyzer: "C170.2",
    repository: {
      head: freshIndex.head,
      branch: freshIndex.branch,
    },
    changedFiles: normalizedPaths,
    changedFileCount: normalizedPaths.length,
    directDependencyCount: perFile.reduce(
      (total, item) =>
        total + item.directDependencies.length,
      0,
    ),
    affectedFileCount: affectedFiles.length,
    affectedFiles,
    perFile,
    likelyTests: allTestCandidates,
    configurationChanges,
    risk,
    limitations: [
      "Static TypeScript dependency analysis only.",
      "Computed dynamic imports and computed require paths may not be discovered.",
      "Runtime reflection and framework-specific implicit dependencies are not guaranteed to be discovered.",
      "Test candidates are heuristic matches and do not prove complete test coverage.",
      "Risk levels are conservative heuristics and do not replace human review.",
      "Deleted files and untracked proposed files are not supported by this current-worktree API.",
    ],
    readOnly: true,
    requiresFounderReview: true,
  };
}

function parseArgs(argv) {
  if (
    argv.length >= 2 &&
    argv[0] === "analyze" &&
    argv.slice(1).every(
      (item) => typeof item === "string" && item.length > 0,
    )
  ) {
    return {
      command: "analyze",
      changedPaths: argv.slice(1),
    };
  }

  fail(
    "AIOS_IMPACT_USAGE",
    [
      "Usage:",
      "  node scripts/aios-dependency-impact.mjs analyze <file> [file ...]",
      "",
      "Example:",
      "  node scripts/aios-dependency-impact.mjs analyze lib/example.ts",
    ].join("\n"),
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  const result = analyzeDependencyImpact(
    process.cwd(),
    args.changedPaths,
  );

  process.stdout.write(
    `${JSON.stringify(result, null, 2)}\n`,
  );
}

const invokedPath = process.argv[1]
  ? path.resolve(process.argv[1])
  : "";

if (
  invokedPath &&
  pathToFileURL(invokedPath).href ===
    pathToFileURL(SCRIPT_FILE).href
) {
  try {
    main();
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? error.code
        : "AIOS_IMPACT_FAILED";

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    process.stderr.write(`${code}: ${message}\n`);
    process.exitCode = 1;
  }
}
