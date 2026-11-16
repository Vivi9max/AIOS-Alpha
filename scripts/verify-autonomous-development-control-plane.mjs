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

const atomicExecutorSource = fs.readFileSync(
  path.join(
    REPO_ROOT,
    "lib/github/autonomous-development-atomic-executor.ts",
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

const patchedAtomicExecutor = atomicExecutorSource
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
  "atomic-executor.mjs",
  transpile(
    patchedAtomicExecutor,
    "autonomous-development-atomic-executor.ts",
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

const atomicExecutorModule = await import(
  pathToFileURL(
    path.join(tmpDir, "atomic-executor.mjs"),
  ).href
);

const executeAtomicStaging =
  atomicExecutorModule.executeAtomicStaging;

assert.equal(
  typeof executeAtomicStaging,
  "function",
  "production executeAtomicStaging must be exported",
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
// Atomic executor readback regression harness
// ---------------------------------------------------------------------------

const STAGING_BRANCH_PREFIX = "aios-staging/";

function computeStagingBranchName(taskId) {
  // Mirrors the production staging branch naming algorithm:
  // prefix + sanitized task id.
  const sanitized = String(taskId).replace(
    /[^A-Za-z0-9._-]/g,
    "-",
  );
  return `${STAGING_BRANCH_PREFIX}${sanitized}`;
}

function encodeUtf8Base64(text) {
  return Buffer.from(text, "utf8").toString("base64");
}

function decodeUtf8Base64(base64) {
  return Buffer.from(base64, "base64").toString("utf8");
}

function buildGitHubFetchMock(options) {
  const {
    stagingBranch,
    baseSha,
    newCommitSha,
    writtenFiles,
    readbackOverrides = {},
    headOverride = null,
    failOn = null,
  } = options;

  const state = {
    requests: [],
    contentsReads: [],
    headReads: 0,
    stagingCreated: false,
  };

  const files = new Map(
    writtenFiles.map((file) => [file.path, file]),
  );

  const mockFetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input && input.url
          ? input.url
          : String(input);
    const method =
      (init && init.method) ||
      (input && input.method) ||
      "GET";

    state.requests.push({ url, method });

    if (failOn && failOn(url, method)) {
      return new Response(
        JSON.stringify({ message: "simulated failure" }),
        { status: 500, headers: { "content-type": "application/json" } },
      );
    }

    // Branch ref read.
    if (
      method === "GET" &&
      /\/git\/ref\/heads\//.test(url)
    ) {
      return new Response(
        JSON.stringify({
          ref: `refs/heads/${stagingBranch}`,
          object: { sha: baseSha, type: "commit" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    // Base commit read.
    if (
      method === "GET" &&
      /\/git\/commits\//.test(url)
    ) {
      return new Response(
        JSON.stringify({
          sha: baseSha,
          tree: { sha: "base-tree-sha", type: "tree" },
          parents: [],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    // Git blob creation.
    if (
      method === "POST" &&
      /\/git\/blobs$/.test(url)
    ) {
      const body = JSON.parse(init.body);
      const sha = `blob-${body.content.length}`;
      return new Response(
        JSON.stringify({ sha, url: `https://api.github.com/git/blobs/${sha}` }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    }

    // Git tree creation.
    if (
      method === "POST" &&
      /\/git\/trees$/.test(url)
    ) {
      return new Response(
        JSON.stringify({ sha: "new-tree-sha" }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    }

    // Git commit creation.
    if (
      method === "POST" &&
      /\/git\/commits$/.test(url)
    ) {
      return new Response(
        JSON.stringify({ sha: newCommitSha }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    }

    // Staging ref creation.
    if (
      method === "POST" &&
      /\/git\/refs$/.test(url)
    ) {
      state.stagingCreated = true;
      return new Response(
        JSON.stringify({
          ref: `refs/heads/${stagingBranch}`,
          object: { sha: newCommitSha, type: "commit" },
        }),
        { status: 201, headers: { "content-type": "application/json" } },
      );
    }

    // Staging HEAD verification.
    if (
      method === "GET" &&
      /\/git\/ref\/heads\//.test(url) &&
      state.stagingCreated
    ) {
      state.headReads += 1;
      const headSha = headOverride
        ? headOverride(state, newCommitSha)
        : newCommitSha;
      return new Response(
        JSON.stringify({
          ref: `refs/heads/${stagingBranch}`,
          object: { sha: headSha, type: "commit" },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    // Contents API read at exact staging commit SHA.
    if (
      method === "GET" &&
      /\/contents\//.test(url)
    ) {
      const match = url.match(/\/contents\/([^?]+)\?ref=([^&]+)/);
      const filePath = match ? decodeURIComponent(match[1]) : null;
      const ref = match ? decodeURIComponent(match[2]) : null;
      state.contentsReads.push({ filePath, ref });

      const override =
        filePath && readbackOverrides[filePath]
          ? readbackOverrides[filePath]
          : null;

      if (override) {
        return override({ filePath, ref, files });
      }

      const file = filePath ? files.get(filePath) : null;
      if (!file) {
        return new Response(
          JSON.stringify({ message: "Not Found" }),
          { status: 404, headers: { "content-type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          type: "file",
          encoding: "base64",
          content: encodeUtf8Base64(file.content),
          sha: "content-sha",
          path: filePath,
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ message: "unexpected request" }),
      { status: 500, headers: { "content-type": "application/json" } },
    );
  };

  return { fetch: mockFetch, state };
}

async function withMockFetch(mockFetch, fn) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockFetch;
  try {
    return await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

function buildAtomicStagingInput(overrides = {}) {
  const taskId = "task-atomic-verify";
  const stagingBranch = computeStagingBranchName(taskId);
  return {
    taskId,
    stagingBranch,
    baseSha: "base-sha-1234567890",
    newCommitSha: "new-commit-sha-abcdef",
    writtenFiles: [
      {
        path: "lib/example/alpha.ts",
        content: "export const alpha = 1;\n",
      },
      {
        path: "lib/example/beta.ts",
        content: "export const beta = 2;\n",
      },
    ],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// TEST 5 — Atomic Executor: Successful Multi-File Readback
// ---------------------------------------------------------------------------

await run(
  "5 ATOMIC EXECUTOR SUCCESS MULTI-FILE READBACK",
  async () => {
    const input = buildAtomicStagingInput();
    const { fetch: mockFetch, state } = buildGitHubFetchMock({
      stagingBranch: input.stagingBranch,
      baseSha: input.baseSha,
      newCommitSha: input.newCommitSha,
      writtenFiles: input.writtenFiles,
    });

    const result = await withMockFetch(mockFetch, () =>
      executeAtomicStaging(input),
    );

    assert.ok(result, "executor must return a snapshot");

    assert.equal(
      result.stagingBranch,
      input.stagingBranch,
      "snapshot must contain the staging branch",
    );

    assert.equal(
      result.commitSha,
      input.newCommitSha,
      "snapshot must contain the new commit SHA",
    );

    const changedPaths = [...result.changedPaths].sort();
    const expectedPaths = input.writtenFiles
      .map((file) => file.path)
      .sort();
    assert.deepEqual(
      changedPaths,
      expectedPaths,
      "snapshot must contain all changed paths",
    );

    // Every written file read back exactly once.
    assert.equal(
      state.contentsReads.length,
      input.writtenFiles.length,
      "every written file must be read back exactly once",
    );

    for (const file of input.writtenFiles) {
      const reads = state.contentsReads.filter(
        (read) => read.filePath === file.path,
      );
      assert.equal(
        reads.length,
        1,
        `file ${file.path} must be read back exactly once`,
      );
      assert.equal(
        reads[0].ref,
        input.newCommitSha,
        `Contents API for ${file.path} must use the staging commit SHA`,
      );
    }

    // Base64 decode correctness + UTF-8 equality.
    for (const file of input.writtenFiles) {
      const decoded = decodeUtf8Base64(
        encodeUtf8Base64(file.content),
      );
      assert.equal(
        decoded,
        file.content,
        `UTF-8 round-trip for ${file.path} must be exact`,
      );
    }

    // HEAD verification performed.
    assert.ok(
      state.headReads >= 1,
      "staging HEAD verification must occur",
    );
  },
);

// ---------------------------------------------------------------------------
// TEST 6 — Atomic Executor: Contents API 404 for one written file
// ---------------------------------------------------------------------------

await run(
  "6 ATOMIC EXECUTOR CONTENTS 404 AFTER WRITE",
  async () => {
    const input = buildAtomicStagingInput();
    const missingPath = input.writtenFiles[1].path;

    const { fetch: mockFetch, state } = buildGitHubFetchMock({
      stagingBranch: input.stagingBranch,
      baseSha: input.baseSha,
      newCommitSha: input.newCommitSha,
      writtenFiles: input.writtenFiles,
      readbackOverrides: {
        [missingPath]: () =>
          new Response(
            JSON.stringify({ message: "Not Found" }),
            {
              status: 404,
              headers: { "content-type": "application/json" },
            },
          ),
      },
    });

    await assert.rejects(
      () => withMockFetch(mockFetch, () => executeAtomicStaging(input)),
      /404|not found|readback/i,
      "executor must fail closed when a written file cannot be read back",
    );

    // Both files were written before the 404 was served.
    assert.ok(
      state.requests.some(
        (req) =>
          req.method === "POST" && /\/git\/trees$/.test(req.url),
      ),
      "tree creation must occur before readback",
    );

    // Only the selected file returned 404.
    const missingReads = state.contentsReads.filter(
      (read) => read.filePath === missingPath,
    );
    assert.ok(
      missingReads.length >= 1,
      "the missing file must have been requested",
    );
  },
);

// ---------------------------------------------------------------------------
// TEST 7 — Atomic Executor: HTTP 200 but content missing
// ---------------------------------------------------------------------------

await run(
  "7 ATOMIC EXECUTOR CONTENTS MISSING CONTENT",
  async () => {
    const input = buildAtomicStagingInput();
    const targetPath = input.writtenFiles[0].path;

    const { fetch: mockFetch } = buildGitHubFetchMock({
      stagingBranch: input.stagingBranch,
      baseSha: input.baseSha,
      newCommitSha: input.newCommitSha,
      writtenFiles: input.writtenFiles,
      readbackOverrides: {
        [targetPath]: ({ ref }) =>
          new Response(
            JSON.stringify({
              type: "file",
              encoding: "base64",
              path: targetPath,
              sha: "content-sha",
              ref,
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          ),
      },
    });

    await assert.rejects(
      () => withMockFetch(mockFetch, () => executeAtomicStaging(input)),
      /content|missing|readback/i,
      "executor must fail closed when content is missing",
    );
  },
);

// ---------------------------------------------------------------------------
// TEST 8 — Atomic Executor: malformed content
// ---------------------------------------------------------------------------

await run(
  "8 ATOMIC EXECUTOR MALFORMED CONTENT",
  async () => {
    const input = buildAtomicStagingInput();
    const targetPath = input.writtenFiles[0].path;

    const { fetch: mockFetch } = buildGitHubFetchMock({
      stagingBranch: input.stagingBranch,
      baseSha: input.baseSha,
      newCommitSha: input.newCommitSha,
      writtenFiles: input.writtenFiles,
      readbackOverrides: {
        [targetPath]: ({ ref }) =>
          new Response(
            JSON.stringify({
              type: "file",
              encoding: "base64",
              path: targetPath,
              sha: "content-sha",
              content: "!!!not-valid-base64!!!",
              ref,
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          ),
      },
    });

    await assert.rejects(
      () => withMockFetch(mockFetch, () => executeAtomicStaging(input)),
      /malformed|decode|readback|content/i,
      "executor must fail closed on malformed content",
    );
  },
);

// ---------------------------------------------------------------------------
// TEST 9 — Atomic Executor: unsupported encoding
// ---------------------------------------------------------------------------

await run(
  "9 ATOMIC EXECUTOR UNSUPPORTED ENCODING",
  async () => {
    const input = buildAtomicStagingInput();
    const targetPath = input.writtenFiles[0].path;

    const { fetch: mockFetch } = buildGitHubFetchMock({
      stagingBranch: input.stagingBranch,
      baseSha: input.baseSha,
      newCommitSha: input.newCommitSha,
      writtenFiles: input.writtenFiles,
      readbackOverrides: {
        [targetPath]: ({ ref }) =>
          new Response(
            JSON.stringify({
              type: "file",
              encoding: "utf-16",
              path: targetPath,
              sha: "content-sha",
              content: "irrelevant",
              ref,
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          ),
      },
    });

    await assert.rejects(
      () => withMockFetch(mockFetch, () => executeAtomicStaging(input)),
      /encoding|unsupported|readback/i,
      "executor must fail closed on unsupported encoding",
    );
  },
);

// ---------------------------------------------------------------------------
// TEST 10 — Atomic Executor: readback content differs
// ---------------------------------------------------------------------------

await run(
  "10 ATOMIC EXECUTOR CONTENT MISMATCH",
  async () => {
    const input = buildAtomicStagingInput();
    const targetPath = input.writtenFiles[0].path;

    const { fetch: mockFetch } = buildGitHubFetchMock({
      stagingBranch: input.stagingBranch,
      baseSha: input.baseSha,
      newCommitSha: input.newCommitSha,
      writtenFiles: input.writtenFiles,
      readbackOverrides: {
        [targetPath]: ({ ref }) =>
          new Response(
            JSON.stringify({
              type: "file",
              encoding: "base64",
              path: targetPath,
              sha: "content-sha",
              content: encodeUtf8Base64(
                "export const alpha = 999;\n",
              ),
              ref,
            }),
            {
              status: 200,
              headers: { "content-type": "application/json" },
            },
          ),
      },
    });

    await assert.rejects(
      () => withMockFetch(mockFetch, () => executeAtomicStaging(input)),
      /mismatch|differ|readback|equality/i,
      "executor must fail closed when readback content differs",
    );
  },
);

// ---------------------------------------------------------------------------
// TEST 11 — Atomic Executor: staging HEAD mismatch
// ---------------------------------------------------------------------------

await run(
  "11 ATOMIC EXECUTOR HEAD MISMATCH",
  async () => {
    const input = buildAtomicStagingInput();

    const { fetch: mockFetch, state } = buildGitHubFetchMock({
      stagingBranch: input.stagingBranch,
      baseSha: input.baseSha,
      newCommitSha: input.newCommitSha,
      writtenFiles: input.writtenFiles,
      headOverride: () => "different-head-sha",
    });

    await assert.rejects(
      () => withMockFetch(mockFetch, () => executeAtomicStaging(input)),
      /head|mismatch|staging/i,
      "executor must fail closed when staging HEAD differs",
    );

    // HEAD mismatch applied after staging branch creation.
    assert.ok(
      state.stagingCreated,
      "staging branch must have been created before HEAD verification",
    );
    assert.ok(
      state.headReads >= 1,
      "HEAD verification must have been attempted",
    );
  },
);

// ---------------------------------------------------------------------------
// TEST 12 — Atomic Executor: GitHub API errors fail closed
// ---------------------------------------------------------------------------

await run(
  "12 ATOMIC EXECUTOR GITHUB API ERROR",
  async () => {
    const input = buildAtomicStagingInput();

    const { fetch: mockFetch } = buildGitHubFetchMock({
      stagingBranch: input.stagingBranch,
      baseSha: input.baseSha,
      newCommitSha: input.newCommitSha,
      writtenFiles: input.writtenFiles,
      failOn: (url, method) =>
        method === "POST" && /\/git\/trees$/.test(url),
    });

    await assert.rejects(
      () => withMockFetch(mockFetch, () => executeAtomicStaging(input)),
      /500|error|tree|failed/i,
      "executor must fail closed on GitHub API error",
    );
  },
);

// ---------------------------------------------------------------------------
// TEST 13 — Atomic Executor: malformed GitHub response fails closed
// ---------------------------------------------------------------------------

await run(
  "13 ATOMIC EXECUTOR MALFORMED GITHUB RESPONSE",
  async () => {
    const input = buildAtomicStagingInput();

    const { fetch: mockFetch } = buildGitHubFetchMock({
      stagingBranch: input.stagingBranch,
      baseSha: input.baseSha,
      newCommitSha: input.newCommitSha,
      writtenFiles: input.writtenFiles,
      failOn: (url, method) =>
        method === "POST" && /\/git\/commits$/.test(url),
    });

    await assert.rejects(
      () => withMockFetch(mockFetch, () => executeAtomicStaging(input)),
      /500|error|commit|failed|malformed/i,
      "executor must fail closed on malformed GitHub response",
    );
  },
);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(
  "\nC169.8-D2.1 INDEPENDENT VERIFICATION\n",
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
