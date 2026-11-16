#!/usr/bin/env node
/**
 * C169.8-D2.1 Independent Non-Destructive Verification
 *
 * Runs: node scripts/verify-autonomous-development-control-plane.mjs
 *
 * Strategy:
 *   1. Transpile the real production TypeScript modules with the repository's
 *      installed `typescript` package (no new dependencies).
 *   2. Replace `@/` aliases and `server-only` with local stubs inside a
 *      temporary directory.
 *   3. Import the transpiled production module and drive it exclusively
 *      through its public API.
 *   4. Use an in-memory storage stub — no Redis, no Production storage,
 *      no GitHub/Vercel API, no real Autonomous Development task.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// TypeScript transpiler (repository dependency)
// ---------------------------------------------------------------------------

let ts;
try {
  ts = (await import("typescript")).default;
} catch {
  console.error(
    "TypeScript is not installed. Run `npm install` in the repository root first.",
  );
  process.exit(1);
}

function transpile(source, fileName) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      isolatedModules: true,
      skipLibCheck: true,
    },
    fileName,
  });
  return result.outputText;
}

// ---------------------------------------------------------------------------
// Read real production sources
// ---------------------------------------------------------------------------

const controlPlaneSource = fs.readFileSync(
  path.join(REPO_ROOT, "lib/github/autonomous-development-control-plane.ts"),
  "utf8",
);

const receiptSource = fs.readFileSync(
  path.join(REPO_ROOT, "lib/github/autonomous-development-receipt.ts"),
  "utf8",
);

const objectiveContractSource = fs.readFileSync(
  path.join(
    REPO_ROOT,
    "lib/autonomous-development-objective-contract.ts",
  ),
  "utf8",
);

// ---------------------------------------------------------------------------
// Redirect imports to stubs inside the temporary directory
// ---------------------------------------------------------------------------

const patchedControlPlane = controlPlaneSource
  .replace(
    /import\s+"server-only";/,
    'import "./server-only-stub.mjs";',
  )
  .replace(
    /"@\/lib\/server-storage"/g,
    '"./server-storage-stub.mjs"',
  )
  .replace(
    /"@\/lib\/github\/autonomous-development-receipt"/g,
    '"./autonomous-development-receipt.mjs"',
  )
  .replace(
    /"@\/lib\/autonomous-development-objective-contract"/g,
    '"./autonomous-development-objective-contract.mjs"',
  );

const patchedReceipt = receiptSource.replace(
  /import\s+"server-only";/,
  'import "./server-only-stub.mjs";',
);

// ---------------------------------------------------------------------------
// Temporary module directory
// ---------------------------------------------------------------------------

const tmpDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "aios-d2-1-verify-"),
);

function writeTmp(name, content) {
  fs.writeFileSync(
    path.join(tmpDir, name),
    content,
    "utf8",
  );
}

writeTmp(
  "control-plane.mjs",
  transpile(patchedControlPlane, "control-plane.ts"),
);

writeTmp(
  "autonomous-development-receipt.mjs",
  transpile(patchedReceipt, "autonomous-development-receipt.ts"),
);

writeTmp(
  "autonomous-development-objective-contract.mjs",
  transpile(
    objectiveContractSource,
    "autonomous-development-objective-contract.ts",
  ),
);

writeTmp(
  "server-only-stub.mjs",
  "export {};\n",
);

writeTmp(
  "server-storage-stub.mjs",
  [
    "const data = new Map();",
    "",
    "export const storage = {",
    "  async get(key) {",
    "    return data.get(key) ?? null;",
    "  },",
    "  async set(key, value) {",
    "    data.set(key, value);",
    "  },",
    "  __clear() {",
    "    data.clear();",
    "  },",
    "};",
    "",
  ].join("\n"),
);

// ---------------------------------------------------------------------------
// Import transpiled production module + storage stub
// ---------------------------------------------------------------------------

const { storage } = await import(
  pathToFileURL(
    path.join(tmpDir, "server-storage-stub.mjs"),
  ).href
);

const {
  createAutonomousDevelopmentTask,
  claimAutonomousDevelopmentTask,
  heartbeatAutonomousDevelopmentTask,
  updateAutonomousDevelopmentTask,
  listPersistentAutonomousDevelopmentTasks,
  persistAutonomousDevelopmentTasks,
} = await import(
  pathToFileURL(
    path.join(tmpDir, "control-plane.mjs"),
  ).href
);

const TASK_STORAGE_KEY =
  "aios:autonomous-development:tasks";

// ---------------------------------------------------------------------------
// Test harness
// ---------------------------------------------------------------------------

let passed = 0;
let failed = 0;
const report = [];

async function run(name, fn) {
  try {
    await fn();
    report.push(`TEST ${name}: PASS`);
    passed += 1;
  } catch (error) {
    report.push(`TEST ${name}: FAIL — ${error.message}`);
    failed += 1;
  }
}

async function resetStorage() {
  // Drain any queued persistence writes before clearing.
  await persistAutonomousDevelopmentTasks();
  storage.__clear();
}

// ---------------------------------------------------------------------------
// TEST 1 — Heartbeat Isolation
// ---------------------------------------------------------------------------

await run("1 HEARTBEAT ISOLATION", async () => {
  await resetStorage();

  const task = createAutonomousDevelopmentTask({
    objective:
      "C169.8-D2.1 heartbeat isolation fixture",
  });

  claimAutonomousDevelopmentTask(task.id);

  const before = {
    updatedAt: task.updatedAt,
    reason: task.reason,
    lastHeartbeatAt: task.lastHeartbeatAt,
    status: task.status,
    phase: task.phase,
  };

  await new Promise((resolve) =>
    setTimeout(resolve, 10),
  );

  heartbeatAutonomousDevelopmentTask(
    task.id,
    "SHOULD_NOT_BECOME_TASK_REASON",
  );

  assert.equal(
    task.updatedAt,
    before.updatedAt,
    "heartbeat must not change updatedAt",
  );

  assert.equal(
    task.reason,
    before.reason,
    "heartbeat must not overwrite task.reason",
  );

  assert.notEqual(
    task.lastHeartbeatAt,
    before.lastHeartbeatAt,
    "heartbeat must advance lastHeartbeatAt",
  );

  assert.equal(
    task.status,
    before.status,
    "heartbeat must not change status",
  );

  assert.equal(
    task.phase,
    before.phase,
    "heartbeat must not change phase",
  );
});

// ---------------------------------------------------------------------------
// TEST 2 — Terminal State Precedence
// ---------------------------------------------------------------------------

await run("2 TERMINAL PRECEDENCE", async () => {
  await resetStorage();

  const activeTask =
    createAutonomousDevelopmentTask({
      objective:
        "C169.8-D2.1 terminal precedence active fixture",
    });

  claimAutonomousDevelopmentTask(activeTask.id);

  // Ensure the claim's persistence write has settled before injecting
  // the competing snapshot.
  await persistAutonomousDevelopmentTasks();
  storage.__clear();

  const oldTime = new Date(
    new Date(activeTask.updatedAt).getTime() -
      3_600_000,
  ).toISOString();

  const terminalSnapshot = {
    id: activeTask.id,
    objective:
      "C169.8-D2.1 terminal precedence active fixture",
    repository: "Vivi9max/AIOS-Alpha",
    branch: "main",
    targetPaths: [],
    status: "blocked",
    phase: "BLOCKED",
    reason: "terminal precedence fixture",
    createdAt: oldTime,
    updatedAt: oldTime,
    completedAt: oldTime,
    lastHeartbeatAt: oldTime,
    phaseHistory: [
      {
        phase: "BLOCKED",
        at: oldTime,
        reason: "terminal precedence fixture",
      },
    ],
  };

  await storage.set(TASK_STORAGE_KEY, [
    terminalSnapshot,
  ]);

  const hydrated =
    await listPersistentAutonomousDevelopmentTasks();

  const survivor = hydrated.find(
    (task) => task.id === activeTask.id,
  );

  assert.ok(
    survivor,
    "merged collection must contain the fixture task",
  );

  assert.equal(
    survivor.status,
    "blocked",
    "terminal snapshot must take precedence over newer active snapshot",
  );

  assert.equal(
    survivor.phase,
    "BLOCKED",
    "terminal phase must be preserved",
  );
});

// ---------------------------------------------------------------------------
// TEST 3 — Phase History Version Precedence + Fallback
// ---------------------------------------------------------------------------

await run("3 PHASE HISTORY PRECEDENCE", async () => {
  await resetStorage();

  const localTask =
    createAutonomousDevelopmentTask({
      objective:
        "C169.8-D2.1 phase precedence local fixture",
    });

  claimAutonomousDevelopmentTask(localTask.id);

  await persistAutonomousDevelopmentTasks();
  storage.__clear();

  const oldUpdated = new Date(
    new Date(localTask.updatedAt).getTime() -
      3_600_000,
  ).toISOString();

  const newerPhaseHistory = new Date(
    new Date(localTask.updatedAt).getTime() +
      3_600_000,
  ).toISOString();

  const persistentSnapshot = {
    id: localTask.id,
    objective:
      "C169.8-D2.1 phase precedence local fixture",
    repository: "Vivi9max/AIOS-Alpha",
    branch: "main",
    targetPaths: [],
    status: "running",
    phase: "GENERATING",
    createdAt: oldUpdated,
    updatedAt: oldUpdated,
    lastHeartbeatAt: new Date().toISOString(),
    phaseHistory: [
      {
        phase: "GENERATING",
        at: newerPhaseHistory,
      },
    ],
  };

  await storage.set(TASK_STORAGE_KEY, [
    persistentSnapshot,
  ]);

  const hydrated =
    await listPersistentAutonomousDevelopmentTasks();

  const survivor = hydrated.find(
    (task) => task.id === localTask.id,
  );

  assert.ok(
    survivor,
    "merged collection must contain the phase fixture",
  );

  const lastEvent =
    survivor.phaseHistory[
      survivor.phaseHistory.length - 1
    ];

  assert.equal(
    lastEvent.at,
    newerPhaseHistory,
    "newer phase-history timestamp must beat newer updatedAt",
  );

  // --- Fallback: invalid / missing phase-history timestamp ---

  const fallbackLocal =
    createAutonomousDevelopmentTask({
      objective:
        "C169.8-D2.1 phase fallback local fixture",
    });

  claimAutonomousDevelopmentTask(fallbackLocal.id);

  await persistAutonomousDevelopmentTasks();
  storage.__clear();

  const fallbackOldUpdated = new Date(
    new Date(fallbackLocal.updatedAt).getTime() -
      3_600_000,
  ).toISOString();

  const fallbackSnapshot = {
    id: fallbackLocal.id,
    objective:
      "C169.8-D2.1 phase fallback local fixture",
    repository: "Vivi9max/AIOS-Alpha",
    branch: "main",
    targetPaths: [],
    status: "running",
    phase: "GENERATING",
    createdAt: fallbackOldUpdated,
    updatedAt: fallbackOldUpdated,
    lastHeartbeatAt: new Date().toISOString(),
    phaseHistory: [],
  };

  await storage.set(TASK_STORAGE_KEY, [
    fallbackSnapshot,
  ]);

  const fallbackHydrated =
    await listPersistentAutonomousDevelopmentTasks();

  const fallbackSurvivor =
    fallbackHydrated.find(
      (task) => task.id === fallbackLocal.id,
    );

  assert.ok(
    fallbackSurvivor,
    "fallback fixture must survive hydration",
  );

  assert.equal(
    fallbackSurvivor.updatedAt,
    fallbackLocal.updatedAt,
    "when phase history is missing, newer updatedAt must win",
  );
});

// ---------------------------------------------------------------------------
// TEST 4 — Phase Transition Safety
// ---------------------------------------------------------------------------

await run("4 PHASE TRANSITION SAFETY", async () => {
  await resetStorage();

  const task = createAutonomousDevelopmentTask({
    objective:
      "C169.8-D2.1 phase transition safety fixture",
  });

  claimAutonomousDevelopmentTask(task.id);

  updateAutonomousDevelopmentTask(task.id, {
    phase: "PLANNING",
  });

  updateAutonomousDevelopmentTask(task.id, {
    phase: "READING",
  });

  updateAutonomousDevelopmentTask(task.id, {
    phase: "GENERATING",
  });

  assert.equal(
    task.phase,
    "GENERATING",
    "fixture must reach GENERATING",
  );

  assert.throws(
    () =>
      updateAutonomousDevelopmentTask(task.id, {
        phase: "READBACK",
      }),
    /Invalid autonomous development phase transition: GENERATING -> READBACK/,
    "GENERATING -> READBACK must be rejected",
  );

  updateAutonomousDevelopmentTask(task.id, {
    phase: "WRITING",
  });

  assert.equal(
    task.phase,
    "WRITING",
    "GENERATING -> WRITING must be allowed",
  );

  updateAutonomousDevelopmentTask(task.id, {
    phase: "READBACK",
  });

  assert.equal(
    task.phase,
    "READBACK",
    "WRITING -> READBACK must be allowed",
  );
});

// ---------------------------------------------------------------------------
// Atomic staging executor — real production module
// ---------------------------------------------------------------------------

const atomicExecutorSource = fs.readFileSync(
  path.join(
    REPO_ROOT,
    "lib/github/autonomous-development-atomic-executor.ts",
  ),
  "utf8",
);

const patchedAtomicExecutor = atomicExecutorSource
  .replace(
    /import\s+"server-only";/,
    'import "./server-only-stub.mjs";',
  )
  .replace(
    /"@\/lib\/server-storage"/g,
    '"./server-storage-stub.mjs"',
  );

writeTmp(
  "autonomous-development-atomic-executor.mjs",
  transpile(
    patchedAtomicExecutor,
    "autonomous-development-atomic-executor.ts",
  ),
);

const atomicExecutor = await import(
  pathToFileURL(
    path.join(
      tmpDir,
      "autonomous-development-atomic-executor.mjs",
    ),
  ).href
);

const executeAtomicStaging =
  atomicExecutor.executeAtomicStaging;

assert.equal(
  typeof executeAtomicStaging,
  "function",
  "production executeAtomicStaging must be importable",
);

const BASE_SHA = "8558a632b7c122b9572822b18fc23494cc97f693";
const BASE_TREE_SHA = "base-tree-sha-fixture";
const STAGING_COMMIT_SHA = "staging-commit-sha-fixture";
const STAGING_BRANCH = "aios/staging-r5-fixture";

function encodeBase64Utf8(text) {
  return Buffer.from(text, "utf8").toString("base64");
}

function toBase64Url(text) {
  return Buffer.from(text, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function buildBridgeStub() {
  return [
    "export async function getRepositoryBranchHeadSha() {",
    "  return globalThis.__aiosBridge.getRepositoryBranchHeadSha();",
    "}",
    "export async function createBlob() {",
    "  return globalThis.__aiosBridge.createBlob();",
    "}",
    "export async function createTree() {",
    "  return globalThis.__aiosBridge.createTree();",
    "}",
    "export async function createCommit() {",
    "  return globalThis.__aiosBridge.createCommit();",
    "}",
    "export async function createBranch() {",
    "  return globalThis.__aiosBridge.createBranch();",
    "}",
    "export async function getGitCommit() {",
    "  return globalThis.__aiosBridge.getGitCommit();",
    "}",
    "export async function getFileContents() {",
    "  return globalThis.__aiosBridge.getFileContents();",
    "}",
    "",
  ].join("\n");
}

writeTmp("bridge-stub.mjs", buildBridgeStub());

const patchedAtomicExecutorWithBridge = patchedAtomicExecutor.replace(
  /"@\/lib\/github\/autonomous-development-github-bridge"/g,
  '"./bridge-stub.mjs"',
);

writeTmp(
  "autonomous-development-atomic-executor.mjs",
  transpile(
    patchedAtomicExecutorWithBridge,
    "autonomous-development-atomic-executor.ts",
  ),
);

const atomicExecutor = await import(
  pathToFileURL(
    path.join(
      tmpDir,
      "autonomous-development-atomic-executor.mjs",
    ),
  ).href
);

const executeAtomicStaging =
  atomicExecutor.executeAtomicStaging;

assert.equal(
  typeof executeAtomicStaging,
  "function",
  "production executeAtomicStaging must be importable",
);

// ---------------------------------------------------------------------------
// Atomic staging harness
// ---------------------------------------------------------------------------

function createBridgeState(overrides = {}) {
  const state = {
    headSha: BASE_SHA,
    blobs: [],
    trees: [],
    commits: [],
    branches: [],
    fileContents: [],
    headCalls: 0,
    getCommitCalls: [],
    contentsCalls: [],
    ...overrides,
  };

  state.bridge = {
    async getRepositoryBranchHeadSha() {
      state.headCalls += 1;
      if (
        state.headShaSequence &&
        state.headShaSequence.length > 0
      ) {
        return state.headShaSequence.shift();
      }
      return state.headSha;
    },
    async createBlob(input) {
      state.blobs.push(input);
      return { sha: `blob-sha-${state.blobs.length}` };
    },
    async createTree(input) {
      state.trees.push(input);
      return { sha: `tree-sha-${state.trees.length}` };
    },
    async createCommit(input) {
      state.commits.push(input);
      return { sha: STAGING_COMMIT_SHA };
    },
    async createBranch(input) {
      state.branches.push(input);
      return { ok: true };
    },
    async getGitCommit(input) {
      state.getCommitCalls.push(input);
      return {
        sha: input.sha,
        tree: { sha: BASE_TREE_SHA },
      };
    },
    async getFileContents(input) {
      state.contentsCalls.push(input);
      const match = state.fileContents.find(
        (entry) => entry.path === input.path,
      );
      if (!match) {
        const error = new Error(
          `contents not found for ${input.path}`,
        );
        error.status = 404;
        throw error;
      }
      if (match.error) {
        throw match.error;
      }
      return {
        type: "file",
        encoding: match.encoding ?? "base64",
        content: match.content,
      };
    },
  };

  return state;
}

async function withBridge(state, fn) {
  globalThis.__aiosBridge = state.bridge;
  try {
    return await fn(state);
  } finally {
    delete globalThis.__aiosBridge;
  }
}

function buildFiles() {
  return [
    {
      path: "docs/notes/readme.md",
      content: "# Hello\nUnicode: 你好, мир, 🚀\n",
    },
    {
      path: "lib/github/atomic-fixture.ts",
      content: "export const fixture = 1;\n",
    },
    {
      path: "scripts/fixture-script.mjs",
      content: "console.log('fixture');\n",
    },
  ];
}

function seedFileContents(state, files, transform) {
  state.fileContents = files.map((file) => {
    const base = {
      path: file.path,
      content: encodeBase64Utf8(file.content),
      encoding: "base64",
    };
    return transform ? transform(base, file) : base;
  });
}

function baseArgs(files, overrides = {}) {
  return {
    repository: "Vivi9max/AIOS-Alpha",
    baseSha: BASE_SHA,
    stagingBranch: STAGING_BRANCH,
    objective: "C170.8.8-B-R5 atomic staging fixture",
    files,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Atomic staging — positive test
// ---------------------------------------------------------------------------

await run("5 ATOMIC STAGING POSITIVE", async () => {
  const files = buildFiles();
  const state = createBridgeState({
    headShaSequence: [BASE_SHA, STAGING_COMMIT_SHA, STAGING_COMMIT_SHA],
  });
  seedFileContents(state, files);

  const result = await withBridge(state, () =>
    executeAtomicStaging(baseArgs(files)),
  );

  assert.equal(result.success, true, "positive staging must succeed");
  assert.equal(result.baseSha, BASE_SHA);
  assert.equal(result.stagingCommitSha, STAGING_COMMIT_SHA);
  assert.equal(result.stagingBranch, STAGING_BRANCH);

  assert.equal(state.commits.length, 1, "exactly one commit created");
  const commit = state.commits[0];
  assert.equal(commit.parentSha ?? commit.parent, BASE_SHA);
  assert.equal(commit.treeSha ?? commit.tree, "tree-sha-1");
  assert.equal(commit.message.includes("C170.8.8-B-R5"), true);

  assert.equal(state.blobs.length, files.length);
  files.forEach((file, index) => {
    assert.equal(state.blobs[index].content, file.content);
  });

  assert.equal(state.trees.length, 1);
  const tree = state.trees[0];
  assert.equal(tree.baseTreeSha ?? tree.baseTree, BASE_TREE_SHA);
  const treePaths = tree.paths.map((entry) => entry.path);
  files.forEach((file) => {
    assert.ok(
      treePaths.includes(file.path),
      `tree must include ${file.path}`,
    );
  });

  assert.equal(state.branches.length, 1);
  assert.equal(state.branches[0].branch, STAGING_BRANCH);
  assert.equal(state.branches[0].commitSha, STAGING_COMMIT_SHA);

  assert.equal(
    state.contentsCalls.length,
    files.length,
    "one Contents API read per file",
  );
  state.contentsCalls.forEach((call) => {
    assert.equal(call.ref, STAGING_COMMIT_SHA);
    assert.equal(call.repository, "Vivi9max/AIOS-Alpha");
  });
  const callPaths = state.contentsCalls.map((c) => c.path);
  files.forEach((file) => {
    assert.ok(
      callPaths.includes(file.path),
      `Contents API must read ${file.path}`,
    );
  });

  assert.ok(
    state.headCalls >= 2,
    "staging HEAD verified before and after readback",
  );
});

// ---------------------------------------------------------------------------
// Atomic staging — negative tests
// ---------------------------------------------------------------------------

await run("6 ATOMIC STAGING FILE 404", async () => {
  const files = buildFiles();
  const state = createBridgeState({
    headShaSequence: [BASE_SHA, STAGING_COMMIT_SHA],
  });
  seedFileContents(state, files, (entry, file) => {
    if (file.path === "lib/github/atomic-fixture.ts") {
      return { ...entry, missing: true };
    }
    return entry;
  });
  state.fileContents = state.fileContents.filter(
    (entry) => !entry.missing,
  );

  const result = await withBridge(state, () =>
    executeAtomicStaging(baseArgs(files)),
  );

  assert.equal(result.success, false);
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_FAILED");
  assert.ok(
    String(result.reason).includes("lib/github/atomic-fixture.ts"),
    "failure reason must include affected path",
  );
  assert.equal(
    state.contentsCalls.length,
    files.length,
    "all files attempted before failure",
  );
});

await run("7 ATOMIC STAGING MISSING CONTENT", async () => {
  const files = buildFiles();
  const state = createBridgeState({
    headShaSequence: [BASE_SHA, STAGING_COMMIT_SHA],
  });
  seedFileContents(state, files, (entry, file) => {
    if (file.path === "docs/notes/readme.md") {
      return { ...entry, content: undefined };
    }
    return entry;
  });

  const result = await withBridge(state, () =>
    executeAtomicStaging(baseArgs(files)),
  );

  assert.equal(result.success, false);
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_FAILED");
  assert.ok(
    String(result.reason).includes("docs/notes/readme.md"),
  );
});

await run("8 ATOMIC STAGING MALFORMED BASE64", async () => {
  const files = buildFiles();
  const state = createBridgeState({
    headShaSequence: [BASE_SHA, STAGING_COMMIT_SHA],
  });
  seedFileContents(state, files, (entry, file) => {
    if (file.path === "lib/github/atomic-fixture.ts") {
      return { ...entry, content: "!!!not-base64!!!" };
    }
    return entry;
  });

  const result = await withBridge(state, () =>
    executeAtomicStaging(baseArgs(files)),
  );

  assert.equal(result.success, false);
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_FAILED");
  assert.ok(
    String(result.reason).includes("lib/github/atomic-fixture.ts"),
  );
});

await run("9 ATOMIC STAGING UNSUPPORTED ENCODING", async () => {
  const files = buildFiles();
  const state = createBridgeState({
    headShaSequence: [BASE_SHA, STAGING_COMMIT_SHA],
  });
  seedFileContents(state, files, (entry, file) => {
    if (file.path === "scripts/fixture-script.mjs") {
      return { ...entry, encoding: "utf-16" };
    }
    return entry;
  });

  const result = await withBridge(state, () =>
    executeAtomicStaging(baseArgs(files)),
  );

  assert.equal(result.success, false);
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_FAILED");
  assert.ok(
    String(result.reason).includes("scripts/fixture-script.mjs"),
  );
});

await run("10 ATOMIC STAGING INVALID UTF-8", async () => {
  const files = buildFiles();
  const state = createBridgeState({
    headShaSequence: [BASE_SHA, STAGING_COMMIT_SHA],
  });
  seedFileContents(state, files, (entry, file) => {
    if (file.path === "docs/notes/readme.md") {
      return {
        ...entry,
        content: Buffer.from([0xff, 0xfe, 0xfd]).toString("base64"),
      };
    }
    return entry;
  });

  const result = await withBridge(state, () =>
    executeAtomicStaging(baseArgs(files)),
  );

  assert.equal(result.success, false);
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_FAILED");
  assert.ok(
    String(result.reason).includes("docs/notes/readme.md"),
  );
});

await run("11 ATOMIC STAGING CONTENT MISMATCH", async () => {
  const files = buildFiles();
  const state = createBridgeState({
    headShaSequence: [BASE_SHA, STAGING_COMMIT_SHA],
  });
  seedFileContents(state, files, (entry, file) => {
    if (file.path === "lib/github/atomic-fixture.ts") {
      return {
        ...entry,
        content: encodeBase64Utf8("different content"),
      };
    }
    return entry;
  });

  const result = await withBridge(state, () =>
    executeAtomicStaging(baseArgs(files)),
  );

  assert.equal(result.success, false);
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_FAILED");
  assert.ok(
    String(result.reason).includes("lib/github/atomic-fixture.ts"),
  );
});

await run("12 ATOMIC STAGING HEAD MISMATCH", async () => {
  const files = buildFiles();
  const state = createBridgeState({
    headShaSequence: [BASE_SHA, "unexpected-head-sha"],
  });
  seedFileContents(state, files);

  const result = await withBridge(state, () =>
    executeAtomicStaging(baseArgs(files)),
  );

  assert.equal(result.success, false);
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_FAILED");
  assert.equal(
    state.contentsCalls.length,
    0,
    "Contents readback must not run when HEAD mismatches",
  );
});

await run("13 ATOMIC STAGING GITHUB HTTP ERROR", async () => {
  const files = buildFiles();
  const state = createBridgeState({
    headShaSequence: [BASE_SHA, STAGING_COMMIT_SHA],
  });
  seedFileContents(state, files, (entry, file) => {
    if (file.path === "lib/github/atomic-fixture.ts") {
      const error = new Error("github 500");
      error.status = 500;
      return { ...entry, error };
    }
    return entry;
  });

  const result = await withBridge(state, () =>
    executeAtomicStaging(baseArgs(files)),
  );

  assert.equal(result.success, false);
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_FAILED");
  assert.ok(
    String(result.reason).includes("lib/github/atomic-fixture.ts"),
  );
});

await run("14 ATOMIC STAGING MALFORMED JSON", async () => {
  const files = buildFiles();
  const state = createBridgeState({
    headShaSequence: [BASE_SHA, STAGING_COMMIT_SHA],
  });
  seedFileContents(state, files, (entry, file) => {
    if (file.path === "docs/notes/readme.md") {
      return { ...entry, type: "directory" };
    }
    return entry;
  });

  const result = await withBridge(state, () =>
    executeAtomicStaging(baseArgs(files)),
  );

  assert.equal(result.success, false);
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_FAILED");
  assert.ok(
    String(result.reason).includes("docs/notes/readme.md"),
  );
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(
  "\nC169.8-D2.1 + C170.8.8-B-R5 INDEPENDENT VERIFICATION\n",
);

for (const line of report) {
  console.log(`* ${line}`);
}

console.log(`\nTOTAL TESTS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log(
  `EXIT CODE: ${failed === 0 ? 0 : 1}\n`,
);

try {
  fs.rmSync(tmpDir, {
    recursive: true,
    force: true,
  });
} catch {
  // Best-effort cleanup only.
}

process.exitCode = failed === 0 ? 0 : 1;
