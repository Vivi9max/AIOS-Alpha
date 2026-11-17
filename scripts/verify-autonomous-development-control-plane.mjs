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
// Atomic executor fixture constants
// ---------------------------------------------------------------------------

const ATOMIC_REPOSITORY = "Vivi9max/AIOS-Alpha";
const ATOMIC_BASE_BRANCH = "main";
const ATOMIC_BASE_SHA = "0123456789abcdef0123456789abcdef01234567";
const ATOMIC_BASE_TREE_SHA =
  "1111111111111111111111111111111111111111";
const ATOMIC_TREE_SHA =
  "2222222222222222222222222222222222222222";
const ATOMIC_STAGING_COMMIT_SHA =
  "3333333333333333333333333333333333333333";
const ATOMIC_FIXTURE_TOKEN = "fixture-access-token";
const ATOMIC_TASK_ID = "r13-atomic-verification";
const ATOMIC_STAGING_BRANCH =
  `c169-8-ad-${ATOMIC_TASK_ID}`;

const ATOMIC_FILES = [
  {
    path: "lib/github/r13-fixture-ascii.ts",
    content:
      'export const R13_FIXTURE_ASCII = "hello-r13";\n',
  },
  {
    path: "lib/github/r13-fixture-utf8.ts",
    content:
      'export const R13_FIXTURE_UTF8 = "中文 emoji 🚀 r13";\n',
  },
];

function buildAtomicInput(overrides = {}) {
  return {
    objective: "C170.8.8-B R13 atomic verification fixture",
    taskId: ATOMIC_TASK_ID,
    repository: ATOMIC_REPOSITORY,
    baseBranch: ATOMIC_BASE_BRANCH,
    files: ATOMIC_FILES.map((file) => ({
      path: file.path,
      content: file.content,
    })),
    accessToken: ATOMIC_FIXTURE_TOKEN,
    commitMessage: "R13 atomic verification fixture",
    ...overrides,
  };
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

let patchedAtomicExecutor = atomicExecutorSource;

patchedAtomicExecutor = patchedAtomicExecutor.replace(
  /import\s+"server-only";/,
  'import "./server-only-stub.mjs";',
);

patchedAtomicExecutor = patchedAtomicExecutor.replace(
  /"@\/lib\/github\/bridge"/g,
  '"./github-bridge-stub.mjs"',
);

if (
  patchedAtomicExecutor.includes('"@/lib/github/bridge"')
) {
  console.error(
    "FATAL: failed to redirect @/lib/github/bridge import in atomic executor.",
  );
  process.exit(1);
}

if (/import\s+"server-only";/.test(patchedAtomicExecutor)) {
  console.error(
    "FATAL: failed to redirect server-only import in atomic executor.",
  );
  process.exit(1);
}

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
  "autonomous-development-atomic-executor.mjs",
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
  "github-bridge-stub.mjs",
  [
    "export function getGitHubBridgeConfig() {",
    "  return {",
    '    apiBaseUrl: "https://api.github.com",',
    '    token: "",',
    "  };",
    "}",
    "",
    "export function resolveGitHubBridgeAuth() {",
    "  return {",
    '    accessToken: "",',
    '    authMode: "test",',
    "  };",
    "}",
    "",
  ].join("\n"),
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

const { executeAtomicStaging } = await import(
  pathToFileURL(
    path.join(
      tmpDir,
      "autonomous-development-atomic-executor.mjs",
    ),
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
// Atomic executor mock harness
// ---------------------------------------------------------------------------

function encodeBase64(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

function createAtomicMockFetch(scenario) {
  const state = {
    blobRequests: 0,
    treeRequests: 0,
    commitRequests: 0,
    refCreateRequests: 0,
    stagingHeadRequests: 0,
    contentsRequests: 0,
    unexpectedRequests: [],
    contentsRefs: [],
    blobShas: new Map(),
  };

  const blobShaFor = (index) =>
    `blob${String(index).padStart(36, "0")}`;

  const jsonResponse = (body, status = 200) => ({
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  });

  const mockFetch = async (input, init = {}) => {
    const rawUrl =
      typeof input === "string"
        ? input
        : input && typeof input.url === "string"
          ? input.url
          : String(input);

    const method = (
      init.method ||
      (input && typeof input.method === "string"
        ? input.method
        : "GET")
    ).toUpperCase();

    const url = new URL(rawUrl);
    const pathname = url.pathname;
    const search = url.searchParams;

    const baseRefPath = `/repos/${ATOMIC_REPOSITORY}/git/ref/heads/${ATOMIC_BASE_BRANCH}`;
    const stagingRefPath = `/repos/${ATOMIC_REPOSITORY}/git/ref/heads/${ATOMIC_STAGING_BRANCH}`;
    const baseCommitPath = `/repos/${ATOMIC_REPOSITORY}/git/commits/${ATOMIC_BASE_SHA}`;
    const blobPath = `/repos/${ATOMIC_REPOSITORY}/git/blobs`;
    const treePath = `/repos/${ATOMIC_REPOSITORY}/git/trees`;
    const commitPath = `/repos/${ATOMIC_REPOSITORY}/git/commits`;
    const refsPath = `/repos/${ATOMIC_REPOSITORY}/git/refs`;
    const contentsPrefix = `/repos/${ATOMIC_REPOSITORY}/contents/`;

    // 1. GET base ref
    if (
      method === "GET" &&
      pathname === baseRefPath
    ) {
      return jsonResponse({
        object: {
          sha: ATOMIC_BASE_SHA,
          type: "commit",
        },
      });
    }

    // 2. GET base commit
    if (
      method === "GET" &&
      pathname === baseCommitPath
    ) {
      return jsonResponse({
        sha: ATOMIC_BASE_SHA,
        tree: { sha: ATOMIC_BASE_TREE_SHA },
      });
    }

    // 3. POST blobs
    if (method === "POST" && pathname === blobPath) {
      state.blobRequests += 1;
      const index = state.blobRequests - 1;
      const sha = blobShaFor(index);
      state.blobShas.set(index, sha);
      return jsonResponse({ sha }, 201);
    }

    // 4. POST tree
    if (method === "POST" && pathname === treePath) {
      state.treeRequests += 1;
      return jsonResponse({ sha: ATOMIC_TREE_SHA }, 201);
    }

    // 5. POST commit
    if (method === "POST" && pathname === commitPath) {
      state.commitRequests += 1;
      return jsonResponse(
        { sha: ATOMIC_STAGING_COMMIT_SHA },
        201,
      );
    }

    // 6. POST refs (create staging branch)
    if (method === "POST" && pathname === refsPath) {
      state.refCreateRequests += 1;
      return jsonResponse(
        {
          ref: `refs/heads/${ATOMIC_STAGING_BRANCH}`,
          object: {
            sha: ATOMIC_STAGING_COMMIT_SHA,
            type: "commit",
          },
        },
        201,
      );
    }

    // 7 / 9. GET staging HEAD (before & after readback)
    if (
      method === "GET" &&
      pathname === stagingRefPath
    ) {
      state.stagingHeadRequests += 1;
      const index = state.stagingHeadRequests;

      if (
        scenario.headBeforeMismatch &&
        index === 1
      ) {
        return jsonResponse({
          object: {
            sha: "ffffffffffffffffffffffffffffffffffffffff",
            type: "commit",
          },
        });
      }

      if (
        scenario.headAfterMismatch &&
        index === 2
      ) {
        return jsonResponse({
          object: {
            sha: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
            type: "commit",
          },
        });
      }

      return jsonResponse({
        object: {
          sha: ATOMIC_STAGING_COMMIT_SHA,
          type: "commit",
        },
      });
    }

    // 8. GET contents
    if (
      method === "GET" &&
      pathname.startsWith(contentsPrefix)
    ) {
      state.contentsRequests += 1;
      state.contentsRefs.push(search.get("ref"));

      const requestedPath = decodeURIComponent(
        pathname.slice(contentsPrefix.length),
      );

      if (scenario.contentsNotFound) {
        return jsonResponse(
          { message: "Not Found" },
          404,
        );
      }

      const fileIndex = ATOMIC_FILES.findIndex(
        (file) => file.path === requestedPath,
      );

      if (fileIndex === -1) {
        state.unexpectedRequests.push(
          `${method} ${pathname}`,
        );
        return jsonResponse(
          { message: "Unexpected contents path" },
          500,
        );
      }

      const file = ATOMIC_FILES[fileIndex];
      const blobSha =
        state.blobShas.get(fileIndex) ??
        blobShaFor(fileIndex);

      const body = {
        type: "file",
        path: file.path,
        encoding: "base64",
        content: encodeBase64(file.content),
        sha: blobSha,
      };

      if (scenario.contentsType) {
        body.type = scenario.contentsType;
      }
      if (scenario.contentsPath) {
        body.path = scenario.contentsPath;
      }
      if (scenario.contentsEncoding) {
        body.encoding = scenario.contentsEncoding;
      }
      if (scenario.contentsBase64) {
        body.content = scenario.contentsBase64;
      }
      if (scenario.contentsContent !== undefined) {
        body.content = scenario.contentsContent;
      }
      if (scenario.contentsMissingContent) {
        delete body.content;
      }
      if (scenario.contentsMissingSha) {
        delete body.sha;
      }

      if (scenario.contentsBlobShaOverride) {
        body.sha = scenario.contentsBlobShaOverride;
      }

      return jsonResponse(body);
    }

    state.unexpectedRequests.push(
      `${method} ${pathname}`,
    );
    throw new Error(
      `Unexpected mock request: ${method} ${pathname}`,
    );
  };

  return { mockFetch, state };
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

// ---------------------------------------------------------------------------
// TEST 5 — Positive Atomic Execution
// ---------------------------------------------------------------------------

await run("5 ATOMIC EXECUTION POSITIVE", async () => {
  const scenario = {};
  const { mockFetch, state } =
    createAtomicMockFetch(scenario);

  const result = await withMockFetch(
    mockFetch,
    () => executeAtomicStaging(buildAtomicInput()),
  );

  assert.equal(result.success, true);
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_READY");

  const snapshot = result.snapshot;
  assert.ok(snapshot, "snapshot must be present");

  assert.equal(snapshot.repository, ATOMIC_REPOSITORY);
  assert.equal(snapshot.baseBranch, ATOMIC_BASE_BRANCH);
  assert.equal(snapshot.baseSha, ATOMIC_BASE_SHA);
  assert.equal(
    snapshot.stagingBranch,
    ATOMIC_STAGING_BRANCH,
  );
  assert.equal(snapshot.treeSha, ATOMIC_TREE_SHA);
  assert.equal(
    snapshot.stagingCommitSha,
    ATOMIC_STAGING_COMMIT_SHA,
  );
  assert.deepEqual(
    snapshot.changedPaths,
    ATOMIC_FILES.map((file) => file.path),
  );

  assert.equal(state.blobRequests, ATOMIC_FILES.length);
  assert.equal(state.treeRequests, 1);
  assert.equal(state.commitRequests, 1);
  assert.equal(state.refCreateRequests, 1);
  assert.equal(state.stagingHeadRequests, 2);
  assert.equal(
    state.contentsRequests,
    ATOMIC_FILES.length,
  );
  for (const ref of state.contentsRefs) {
    assert.equal(ref, ATOMIC_STAGING_COMMIT_SHA);
  }
  assert.deepEqual(state.unexpectedRequests, []);
});

// ---------------------------------------------------------------------------
// Negative atomic execution scenarios
// ---------------------------------------------------------------------------

async function runAtomicNegative(
  label,
  scenario,
  expectedCode,
  expectedReason,
) {
  await run(label, async () => {
    const { mockFetch, state } =
      createAtomicMockFetch(scenario);

    const result = await withMockFetch(
      mockFetch,
      () => executeAtomicStaging(buildAtomicInput()),
    );

    assert.equal(result.success, false);
    assert.equal(result.code, expectedCode);
    assert.equal(result.reason, expectedReason);

    if (scenario.expectedContentsRequests !== undefined) {
      assert.equal(
        state.contentsRequests,
        scenario.expectedContentsRequests,
      );
    }
    if (scenario.expectedStagingHeadRequests !== undefined) {
      assert.equal(
        state.stagingHeadRequests,
        scenario.expectedStagingHeadRequests,
      );
    }
    assert.deepEqual(state.unexpectedRequests, []);
  });
}

await runAtomicNegative(
  "6 ATOMIC NEGATIVE CONTENTS 404",
  {
    contentsNotFound: true,
    expectedContentsRequests: 1,
    expectedStagingHeadRequests: 1,
  },
  "AIOS_ATOMIC_STAGING_FAILED",
  "AIOS_ATOMIC_CONTENTS_READ_FAILED",
);

await runAtomicNegative(
  "7 ATOMIC NEGATIVE CONTENTS TYPE",
  {
    contentsType: "dir",
    expectedContentsRequests: 1,
    expectedStagingHeadRequests: 1,
  },
  "AIOS_ATOMIC_STAGING_FAILED",
  "AIOS_ATOMIC_CONTENTS_TYPE_INVALID",
);

await runAtomicNegative(
  "8 ATOMIC NEGATIVE CONTENTS PATH",
  {
    contentsPath: "lib/github/wrong-path.ts",
    expectedContentsRequests: 1,
    expectedStagingHeadRequests: 1,
  },
  "AIOS_ATOMIC_STAGING_FAILED",
  "AIOS_ATOMIC_CONTENTS_PATH_MISMATCH",
);

await runAtomicNegative(
  "9 ATOMIC NEGATIVE CONTENTS ENCODING",
  {
    contentsEncoding: "utf-8",
    expectedContentsRequests: 1,
    expectedStagingHeadRequests: 1,
  },
  "AIOS_ATOMIC_STAGING_FAILED",
  "AIOS_ATOMIC_CONTENTS_ENCODING_INVALID",
);

await runAtomicNegative(
  "10 ATOMIC NEGATIVE CONTENTS BASE64",
  {
    contentsBase64: "not-valid-base64-@@@",
    expectedContentsRequests: 1,
    expectedStagingHeadRequests: 1,
  },
  "AIOS_ATOMIC_STAGING_FAILED",
  "AIOS_ATOMIC_CONTENTS_BASE64_INVALID",
);

await runAtomicNegative(
  "11 ATOMIC NEGATIVE CONTENTS UTF8",
  {
    contentsContent: Buffer.from([
      0xff, 0xfe, 0xfd,
    ]).toString("base64"),
    expectedContentsRequests: 1,
    expectedStagingHeadRequests: 1,
  },
  "AIOS_ATOMIC_STAGING_FAILED",
  "AIOS_ATOMIC_CONTENTS_UTF8_INVALID",
);

await runAtomicNegative(
  "12 ATOMIC NEGATIVE CONTENTS MISMATCH",
  {
    contentsContent: encodeBase64("mismatched-content"),
    expectedContentsRequests: 1,
    expectedStagingHeadRequests: 1,
  },
  "AIOS_ATOMIC_STAGING_FAILED",
  "AIOS_ATOMIC_CONTENTS_CONTENT_MISMATCH",
);

await runAtomicNegative(
  "13 ATOMIC NEGATIVE CONTENTS MISSING",
  {
    contentsMissingContent: true,
    expectedContentsRequests: 1,
    expectedStagingHeadRequests: 1,
  },
  "AIOS_ATOMIC_STAGING_FAILED",
  "AIOS_ATOMIC_CONTENTS_CONTENT_MISSING",
);

await runAtomicNegative(
  "14 ATOMIC NEGATIVE BLOB SHA MISSING",
  {
    contentsMissingSha: true,
    expectedContentsRequests: 1,
    expectedStagingHeadRequests: 1,
  },
  "AIOS_ATOMIC_STAGING_FAILED",
  "AIOS_ATOMIC_CONTENTS_BLOB_SHA_MISSING",
);

await runAtomicNegative(
  "15 ATOMIC NEGATIVE HEAD BEFORE",
  {
    headBeforeMismatch: true,
    expectedContentsRequests: 0,
    expectedStagingHeadRequests: 1,
  },
  "AIOS_ATOMIC_STAGING_FAILED",
  "AIOS_ATOMIC_STAGING_HEAD_BEFORE_CONTENTS_FAILED",
);

await runAtomicNegative(
  "16 ATOMIC NEGATIVE HEAD AFTER",
  {
    headAfterMismatch: true,
    expectedContentsRequests: ATOMIC_FILES.length,
    expectedStagingHeadRequests: 2,
  },
  "AIOS_ATOMIC_STAGING_FAILED",
  "AIOS_ATOMIC_STAGING_HEAD_AFTER_CONTENTS_FAILED",
);

await run("17 ATOMIC NEGATIVE INVALID PATH", async () => {
  const scenario = {};
  const { mockFetch, state } =
    createAtomicMockFetch(scenario);

  const result = await withMockFetch(
    mockFetch,
    () =>
      executeAtomicStaging(
        buildAtomicInput({
          files: [
            {
              path: "../escape.ts",
              content: "export const x = 1;\n",
            },
          ],
        }),
      ),
  );

  assert.equal(result.success, false);
  assert.equal(result.code, "AIOS_ATOMIC_INPUT_REJECTED");
  assert.equal(
    result.reason,
    "AIOS_ATOMIC_PATH_REJECTED: ../escape.ts",
  );

  assert.equal(state.blobRequests, 0);
  assert.equal(state.treeRequests, 0);
  assert.equal(state.commitRequests, 0);
  assert.equal(state.refCreateRequests, 0);
  assert.equal(state.stagingHeadRequests, 0);
  assert.equal(state.contentsRequests, 0);
  assert.deepEqual(state.unexpectedRequests, []);
});

// ---------------------------------------------------------------------------
// Adaptive Patch Engine — real production module harness
// ---------------------------------------------------------------------------

const adaptiveAgentSource = fs.readFileSync(
  path.join(
    REPO_ROOT,
    "lib/github/autonomous-development-agent.ts",
  ),
  "utf8",
);

const adaptiveTmpDir = fs.mkdtempSync(
  path.join(os.tmpdir(), "aios-r3-adaptive-verify-"),
);

function writeAdaptiveTmp(name, content) {
  fs.writeFileSync(
    path.join(adaptiveTmpDir, name),
    content,
    "utf8",
  );
}

function redirectAdaptiveImports(source) {
  let out = source;
  out = out.replace(
    /import\s+"server-only";/g,
    'import "./server-only-stub.mjs";',
  );
  out = out.replace(
    /"@\/lib\/autonomous-development-objective-contract"/g,
    '"./objective-contract-stub.mjs"',
  );
  out = out.replace(
    /"@\/lib\/ai"/g,
    '"./ai-stub.mjs"',
  );
  out = out.replace(
    /"@\/lib\/github\/bridge"/g,
    '"./github-bridge-stub.mjs"',
  );
  out = out.replace(
    /"@\/lib\/github\/autonomous-development-control-plane"/g,
    '"./control-plane-stub.mjs"',
  );
  out = out.replace(
    /"@\/lib\/github\/autonomous-development-atomic-executor"/g,
    '"./atomic-executor-stub.mjs"',
  );
  out = out.replace(
    /"@\/lib\/github\/autonomous-build-verification"/g,
    '"./build-verification-stub.mjs"',
  );
  out = out.replace(
    /"@\/lib\/github\/autonomous-development-prompt"/g,
    '"./development-prompt-stub.mjs"',
  );
  out = out.replace(
    /"@\/lib\/github\/autonomous-development-safety-gate"/g,
    '"./safety-gate-stub.mjs"',
  );
  return out;
}

const patchedAdaptiveAgent = redirectAdaptiveImports(
  adaptiveAgentSource,
);

if (/import\s+"server-only";/.test(patchedAdaptiveAgent)) {
  console.error(
    "FATAL: failed to redirect server-only import in autonomous development agent.",
  );
  process.exit(1);
}

for (const spec of [
  '"@/lib/autonomous-development-objective-contract"',
  '"@/lib/ai"',
  '"@/lib/github/bridge"',
  '"@/lib/github/autonomous-development-control-plane"',
  '"@/lib/github/autonomous-development-atomic-executor"',
  '"@/lib/github/autonomous-build-verification"',
  '"@/lib/github/autonomous-development-prompt"',
  '"@/lib/github/autonomous-development-safety-gate"',
]) {
  if (patchedAdaptiveAgent.includes(spec)) {
    console.error(
      `FATAL: failed to redirect ${spec} import in autonomous development agent.`,
    );
    process.exit(1);
  }
}

writeAdaptiveTmp(
  "adaptive-agent.mjs",
  transpile(
    patchedAdaptiveAgent,
    "autonomous-development-agent.ts",
  ),
);

writeAdaptiveTmp(
  "server-only-stub.mjs",
  "export {};\n",
);

writeAdaptiveTmp(
  "objective-contract-stub.mjs",
  [
    "export function validateAutonomousDevelopmentObjectiveContract(objective) {",
    "  return { ok: true, objective };",
    "}",
    "",
    "export function buildAutonomousDevelopmentObjectiveContract(objective) {",
    "  return { objective };",
    "}",
    "",
  ].join("\n"),
);

writeAdaptiveTmp(
  "ai-stub.mjs",
  [
    "export async function generateText() {",
    '  throw new Error("AI stub must not be invoked directly in verification.");',
    "}",
    "",
    "export async function generateObject() {",
    '  throw new Error("AI stub must not be invoked directly in verification.");',
    "}",
    "",
    "export function getModel() {",
    '  throw new Error("AI stub must not be invoked directly in verification.");',
    "}",
    "",
  ].join("\n"),
);

writeAdaptiveTmp(
  "github-bridge-stub.mjs",
  [
    "export function getGitHubBridgeConfig() {",
    "  return {",
    '    apiBaseUrl: "https://api.github.com",',
    '    token: "",',
    "  };",
    "}",
    "",
    "export function resolveGitHubBridgeAuth() {",
    "  return {",
    '    accessToken: "",',
    '    authMode: "test",',
    "  };",
    "}",
    "",
    "export async function readGitHubFile() {",
    '  throw new Error("GitHub bridge stub must not perform real reads.");',
    "}",
    "",
    "export async function writeGitHubFile() {",
    '  throw new Error("GitHub bridge stub must not perform real writes.");',
    "}",
    "",
  ].join("\n"),
);

writeAdaptiveTmp(
  "control-plane-stub.mjs",
  [
    "export function createAutonomousDevelopmentTask(input) {",
    "  return { id: 'stub-task', ...input };",
    "}",
    "",
    "export function claimAutonomousDevelopmentTask() {}",
    "",
    "export function heartbeatAutonomousDevelopmentTask() {}",
    "",
    "export function updateAutonomousDevelopmentTask() {}",
    "",
    "export async function listPersistentAutonomousDevelopmentTasks() {",
    "  return [];",
    "}",
    "",
    "export async function persistAutonomousDevelopmentTasks() {}",
    "",
  ].join("\n"),
);

writeAdaptiveTmp(
  "atomic-executor-stub.mjs",
  [
    "export async function executeAtomicStaging() {",
    '  throw new Error("Atomic executor stub must not perform real writes.");',
    "}",
    "",
  ].join("\n"),
);

writeAdaptiveTmp(
  "build-verification-stub.mjs",
  [
    "export async function verifyAutonomousBuild() {",
    "  return { ok: true };",
    "}",
    "",
  ].join("\n"),
);

writeAdaptiveTmp(
  "development-prompt-stub.mjs",
  [
    "export function buildAutonomousDevelopmentPrompt() {",
    '  return "stub-prompt";',
    "}",
    "",
  ].join("\n"),
);

writeAdaptiveTmp(
  "safety-gate-stub.mjs",
  [
    "export function evaluateAutonomousDevelopmentSafetyGate() {",
    "  return { ok: true };",
    "}",
    "",
  ].join("\n"),
);

const adaptiveAgentModule = await import(
  pathToFileURL(
    path.join(adaptiveTmpDir, "adaptive-agent.mjs"),
  ).href
);

const adaptiveTest = adaptiveAgentModule.__test;

if (!adaptiveTest) {
  console.error(
    "FATAL: autonomous-development-agent.ts must export __test for adaptive engine verification.",
  );
  process.exit(1);
}

const {
  MAX_PATCH_CHARS,
  MAX_PATCH_BATCHES,
  MAX_PATCH_OPERATIONS_PER_BATCH,
  MAX_PATCH_OPERATIONS_TOTAL,
  MAX_PATCH_ATTEMPTS,
  AIOS_PATCH_BATCH_CONTINUE,
  AIOS_PATCH_BATCH_COMPLETE,
  executeAdaptivePatchEngine,
} = adaptiveTest;

assert.equal(MAX_PATCH_CHARS, 30000);
assert.equal(MAX_PATCH_BATCHES, 4);
assert.equal(MAX_PATCH_OPERATIONS_PER_BATCH, 8);
assert.equal(MAX_PATCH_OPERATIONS_TOTAL, 32);
assert.equal(MAX_PATCH_ATTEMPTS, 3);
assert.equal(AIOS_PATCH_BATCH_CONTINUE, "AIOS_PATCH_BATCH_CONTINUE");
assert.equal(AIOS_PATCH_BATCH_COMPLETE, "AIOS_PATCH_BATCH_COMPLETE");

const AD_BASE_SOURCE = [
  "export const A = 'alpha';",
  "export const B = 'beta';",
  "export const C = 'gamma';",
  "export const D = 'delta';",
  "export const E = 'epsilon';",
  "export const F = 'zeta';",
  "export const G = 'eta';",
  "export const H = 'theta';",
  "",
].join("\n");

function buildPatchBlock(search, replace) {
  return [
    "AIOS_PATCH_BEGIN",
    "PATH: lib/github/fixture.ts",
    "OPERATION: replace",
    "AIOS_SB_TEST",
    search,
    "AIOS_SE_TEST",
    "AIOS_RB_TEST",
    replace,
    "AIOS_RE_TEST",
    "AIOS_PATCH_END",
  ].join("\n");
}

function buildResponse(marker, blocks) {
  const parts = [];
  for (const block of blocks) {
    parts.push(block);
  }
  parts.push(marker);
  return parts.join("\n\n");
}

function singleOpResponse(marker, search, replace) {
  return buildResponse(marker, [buildPatchBlock(search, replace)]);
}

function buildEmptyResponse(marker) {
  return marker;
}

function makeResponder(responses) {
  const calls = [];
  let index = 0;
  const responder = async (context) => {
    calls.push(context);
    if (index >= responses.length) {
      throw new Error(
        `Unexpected extra batch call at index ${index}.`,
      );
    }
    const entry = responses[index];
    index += 1;
    if (typeof entry === "function") {
      return entry(context);
    }
    return entry;
  };
  responder.calls = calls;
  return responder;
}

async function runAdaptive(name, fn) {
  await run(name, fn);
}

// 1. Single batch, single operation success
await runAdaptive("18 ADAPTIVE SINGLE OP SUCCESS", async () => {
  const responder = makeResponder([
    singleOpResponse(
      AIOS_PATCH_BATCH_COMPLETE,
      "export const A = 'alpha';",
      "export const A = 'ALPHA';",
    ),
  ]);
  const result = await executeAdaptivePatchEngine({
    baseSource: AD_BASE_SOURCE,
    targetPath: "lib/github/fixture.ts",
    respond: responder,
  });
  assert.ok(result.content.includes("export const A = 'ALPHA';"));
  assert.equal(result.batchCount, 1);
  assert.equal(result.operationCount, 1);
  assert.equal(responder.calls.length, 1);
});

// 2. Single batch, eight operations success
await runAdaptive("19 ADAPTIVE EIGHT OPS SUCCESS", async () => {
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const blocks = letters.map((letter) =>
    buildPatchBlock(
      `export const ${letter} = `,
      `export const ${letter}_X = `,
    ),
  );
  const responder = makeResponder([
    buildResponse(AIOS_PATCH_BATCH_COMPLETE, blocks),
  ]);
  const result = await executeAdaptivePatchEngine({
    baseSource: AD_BASE_SOURCE,
    targetPath: "lib/github/fixture.ts",
    respond: responder,
  });
  for (const letter of letters) {
    assert.ok(
      result.content.includes(`export const ${letter}_X = `),
    );
  }
  assert.equal(result.batchCount, 1);
  assert.equal(result.operationCount, 8);
});

// 3. Two batches sequential success
await runAdaptive("20 ADAPTIVE TWO BATCHES SUCCESS", async () => {
  const responder = makeResponder([
    singleOpResponse(
      AIOS_PATCH_BATCH_CONTINUE,
      "export const A = 'alpha';",
      "export const A = 'ALPHA';",
    ),
    singleOpResponse(
      AIOS_PATCH_BATCH_COMPLETE,
      "export const B = 'beta';",
      "export const B = 'BETA';",
    ),
  ]);
  const result = await executeAdaptivePatchEngine({
    baseSource: AD_BASE_SOURCE,
    targetPath: "lib/github/fixture.ts",
    respond: responder,
  });
  assert.ok(result.content.includes("export const A = 'ALPHA';"));
  assert.ok(result.content.includes("export const B = 'BETA';"));
  assert.equal(result.batchCount, 2);
  assert.equal(result.operationCount, 2);
});

// 4. Second batch receives first batch's mutated source
await runAdaptive("21 ADAPTIVE SECOND BATCH RECEIVES UPDATED SOURCE", async () => {
  const responder = makeResponder([
    singleOpResponse(
      AIOS_PATCH_BATCH_CONTINUE,
      "export const A = 'alpha';",
      "export const A = 'ALPHA';",
    ),
    async (context) => {
      assert.ok(
        context.currentSource.includes("export const A = 'ALPHA';"),
        "second batch must observe first batch mutation",
      );
      assert.ok(
        !context.currentSource.includes("export const A = 'alpha';"),
        "second batch must not observe pre-mutation source",
      );
      return singleOpResponse(
        AIOS_PATCH_BATCH_COMPLETE,
        "export const B = 'beta';",
        "export const B = 'BETA';",
      );
    },
  ]);
  const result = await executeAdaptivePatchEngine({
    baseSource: AD_BASE_SOURCE,
    targetPath: "lib/github/fixture.ts",
    respond: responder,
  });
  assert.equal(result.batchCount, 2);
});

// 5. Four batches success
await runAdaptive("22 ADAPTIVE FOUR BATCHES SUCCESS", async () => {
  const responder = makeResponder([
    singleOpResponse(
      AIOS_PATCH_BATCH_CONTINUE,
      "export const A = 'alpha';",
      "export const A = 'A1';",
    ),
    singleOpResponse(
      AIOS_PATCH_BATCH_CONTINUE,
      "export const B = 'beta';",
      "export const B = 'B1';",
    ),
    singleOpResponse(
      AIOS_PATCH_BATCH_CONTINUE,
      "export const C = 'gamma';",
      "export const C = 'C1';",
    ),
    singleOpResponse(
      AIOS_PATCH_BATCH_COMPLETE,
      "export const D = 'delta';",
      "export const D = 'D1';",
    ),
  ]);
  const result = await executeAdaptivePatchEngine({
    baseSource: AD_BASE_SOURCE,
    targetPath: "lib/github/fixture.ts",
    respond: responder,
  });
  assert.equal(result.batchCount, 4);
  assert.equal(result.operationCount, 4);
});

// 6. Fewer than 8 ops but CONTINUE continues
await runAdaptive("23 ADAPTIVE CONTINUE WITH FEW OPS", async () => {
  const responder = makeResponder([
    singleOpResponse(
      AIOS_PATCH_BATCH_CONTINUE,
      "export const A = 'alpha';",
      "export const A = 'A1';",
    ),
    singleOpResponse(
      AIOS_PATCH_BATCH_COMPLETE,
      "export const B = 'beta';",
      "export const B = 'B1';",
    ),
  ]);
  const result = await executeAdaptivePatchEngine({
    baseSource: AD_BASE_SOURCE,
    targetPath: "lib/github/fixture.ts",
    respond: responder,
  });
  assert.equal(result.batchCount, 2);
});

// 7. First batch COMPLETE ends correctly
await runAdaptive("24 ADAPTIVE FIRST BATCH COMPLETE ENDS", async () => {
  const responder = makeResponder([
    singleOpResponse(
      AIOS_PATCH_BATCH_COMPLETE,
      "export const A = 'alpha';",
      "export const A = 'A1';",
    ),
  ]);
  const result = await executeAdaptivePatchEngine({
    baseSource: AD_BASE_SOURCE,
    targetPath: "lib/github/fixture.ts",
    respond: responder,
  });
  assert.equal(result.batchCount, 1);
  assert.equal(responder.calls.length, 1);
});

// 8. COMPLETE-only allowed after prior changes
await runAdaptive("25 ADAPTIVE COMPLETE ONLY AFTER PRIOR CHANGES", async () => {
  const responder = makeResponder([
    singleOpResponse(
      AIOS_PATCH_BATCH_CONTINUE,
      "export const A = 'alpha';",
      "export const A = 'A1';",
    ),
    buildEmptyResponse(AIOS_PATCH_BATCH_COMPLETE),
  ]);
  const result = await executeAdaptivePatchEngine({
    baseSource: AD_BASE_SOURCE,
    targetPath: "lib/github/fixture.ts",
    respond: responder,
  });
  assert.equal(result.batchCount, 2);
  assert.equal(result.operationCount, 1);
});

// 9. First batch zero ops COMPLETE rejected
await runAdaptive("26 ADAPTIVE ZERO OP COMPLETE REJECTED", async () => {
  const responder = makeResponder([
    buildEmptyResponse(AIOS_PATCH_BATCH_COMPLETE),
  ]);
  await assert.rejects(
    () =>
      executeAdaptivePatchEngine({
        baseSource: AD_BASE_SOURCE,
        targetPath: "lib/github/fixture.ts",
        respond: responder,
      }),
    /AIOS_PATCH_NO_CHANGE/,
  );
});

// 10. Zero ops CONTINUE rejected
await runAdaptive("27 ADAPTIVE ZERO OP CONTINUE REJECTED", async () => {
  const responder = makeResponder([
    buildEmptyResponse(AIOS_PATCH_BATCH_CONTINUE),
    buildEmptyResponse(AIOS_PATCH_BATCH_CONTINUE),
    buildEmptyResponse(AIOS_PATCH_BATCH_CONTINUE),
  ]);
  await assert.rejects(
    () =>
      executeAdaptivePatchEngine({
        baseSource: AD_BASE_SOURCE,
        targetPath: "lib/github/fixture.ts",
        respond: responder,
      }),
    /AIOS_PATCH_(NO_CHANGE|BATCH_INVALID)/,
  );
});

// 11. Missing marker rejected
await runAdaptive("28 ADAPTIVE MISSING MARKER REJECTED", async () => {
  const responder = makeResponder([
    buildPatchBlock(
      "export const A = 'alpha';",
      "export const A = 'A1';",
    ),
  ]);
  await assert.rejects(
    () =>
      executeAdaptivePatchEngine({
        baseSource: AD_BASE_SOURCE,
        targetPath: "lib/github/fixture.ts",
        respond: responder,
      }),
    /AIOS_PATCH_BATCH_MARKER/,
  );
});

// 12. Duplicate marker rejected
await runAdaptive("29 ADAPTIVE DUPLICATE MARKER REJECTED", async () => {
  const block = buildPatchBlock(
    "export const A = 'alpha';",
    "export const A = 'A1';",
  );
  const responder = makeResponder([
    `${block}\n\n${AIOS_PATCH_BATCH_CONTINUE}\n\n${AIOS_PATCH_BATCH_CONTINUE}`,
  ]);
  await assert.rejects(
    () =>
      executeAdaptivePatchEngine({
        baseSource: AD_BASE_SOURCE,
        targetPath: "lib/github/fixture.ts",
        respond: responder,
      }),
    /AIOS_PATCH_BATCH_MARKER/,
  );
});

// 13. Unknown marker rejected
await runAdaptive("30 ADAPTIVE UNKNOWN MARKER REJECTED", async () => {
  const responder = makeResponder([
    singleOpResponse(
      "AIOS_PATCH_BATCH_UNKNOWN",
      "export const A = 'alpha';",
      "export const A = 'A1';",
    ),
  ]);
  await assert.rejects(
    () =>
      executeAdaptivePatchEngine({
        baseSource: AD_BASE_SOURCE,
        targetPath: "lib/github/fixture.ts",
        respond: responder,
      }),
    /AIOS_PATCH_BATCH_MARKER/,
  );
});

// 14. Marker inside patch block rejected
await runAdaptive("31 ADAPTIVE MARKER INSIDE BLOCK REJECTED", async () => {
  const block = [
    "AIOS_PATCH_BEGIN",
    "PATH: lib/github/fixture.ts",
    "OPERATION: replace",
    "AIOS_SB_TEST",
    "export const A = 'alpha';",
    "AIOS_SE_TEST",
    "AIOS_RB_TEST",
    "export const A = 'A1';",
    AIOS_PATCH_BATCH_CONTINUE,
    "AIOS_RE_TEST",
    "AIOS_PATCH_END",
  ].join("\n");
  const responder = makeResponder([block]);
  await assert.rejects(
    () =>
      executeAdaptivePatchEngine({
        baseSource: AD_BASE_SOURCE,
        targetPath: "lib/github/fixture.ts",
        respond: responder,
      }),
    /AIOS_PATCH_BATCH_MARKER/,
  );
});

// 15. Marker inside replacement source rejected
await runAdaptive("32 ADAPTIVE MARKER IN REPLACE REJECTED", async () => {
  const block = buildPatchBlock(
    "export const A = 'alpha';",
    `export const A = 'A1';\n${AIOS_PATCH_BATCH_COMPLETE}`,
  );
  const responder = makeResponder([
    `${block}\n\n${AIOS_PATCH_BATCH_COMPLETE}`,
  ]);
  await assert.rejects(
    () =>
      executeAdaptivePatchEngine({
        baseSource: AD_BASE_SOURCE,
        targetPath: "lib/github/fixture.ts",
        respond: responder,
      }),
    /AIOS_PATCH_BATCH_MARKER/,
  );
});

// 16. Single batch over eight ops rejected
await runAdaptive("33 ADAPTIVE SINGLE BATCH OVER LIMIT REJECTED", async () => {
  const blocks = [];
  for (let i = 0; i < 9; i += 1) {
    blocks.push(
      buildPatchBlock(
        `export const A = 'alpha';`,
        `export const A = 'A${i}';`,
      ),
    );
  }
  const responder = makeResponder([
    buildResponse(AIOS_PATCH_BATCH_COMPLETE, blocks),
  ]);
  await assert.rejects(
    () =>
      executeAdaptivePatchEngine({
        baseSource: AD_BASE_SOURCE,
        targetPath: "lib/github/fixture.ts",
        respond: responder,
      }),
    /AIOS_PATCH_(OPERATION_LIMIT|BATCH_OPERATION_LIMIT|BATCH_INVALID)/,
  );
});

// 17. Cumulative 32 ops success
await runAdaptive("34 ADAPTIVE CUMULATIVE 32 OPS SUCCESS", async () => {
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const batches = [];
  for (let b = 0; b < 4; b += 1) {
    const blocks = letters.map((letter) =>
      buildPatchBlock(
        `export const ${letter} = `,
        `export const ${letter}${b}_X = `,
      ),
    );
    const marker =
      b === 3
        ? AIOS_PATCH_BATCH_COMPLETE
        : AIOS_PATCH_BATCH_CONTINUE;
    batches.push(buildResponse(marker, blocks));
  }
  const responder = makeResponder(batches);
  const result = await executeAdaptivePatchEngine({
    baseSource: AD_BASE_SOURCE,
    targetPath: "lib/github/fixture.ts",
    respond: responder,
  });
  assert.equal(result.batchCount, 4);
  assert.equal(result.operationCount, 32);
});

// 18. Cumulative over 32 ops rejected
await runAdaptive("35 ADAPTIVE CUMULATIVE OVER 32 REJECTED", async () => {
  const letters = ["A", "B", "C", "D", "E", "F", "G", "H"];
  const responder = makeResponder([
    buildResponse(
      AIOS_PATCH_BATCH_CONTINUE,
      letters.map((letter) =>
        buildPatchBlock(
          `export const ${letter} = `,
          `export const ${letter}1_X = `,
        ),
      ),
    ),
    buildResponse(
      AIOS_PATCH_BATCH_CONTINUE,
      letters.map((letter) =>
        buildPatchBlock(
          `export const ${letter}1_X = `,
          `export const ${letter}2_X = `,
        ),
      ),
    ),
    buildResponse(
      AIOS_PATCH_BATCH_CONTINUE,
      letters.map((letter) =>
        buildPatchBlock(
          `export const ${letter}2_X = `,
          `export const ${letter}3_X = `,
        ),
      ),
    ),
    buildResponse(
      AIOS_PATCH_BATCH_CONTINUE,
      letters.map((letter) =>
        buildPatchBlock(
          `export const ${letter}3_X = `,
          `export const ${letter}4_X = `,
        ),
      ),
    ),
    buildResponse(
      AIOS_PATCH_BATCH_COMPLETE,
      letters.map((letter) =>
        buildPatchBlock(
          `export const ${letter}4_X = `,
          `export const ${letter}5_X = `,
        ),
      ),
    ),
  ]);
  await assert.rejects(
    () =>
      executeAdaptivePatchEngine({
        baseSource: AD_BASE_SOURCE,
        targetPath: "lib/github/fixture.ts",
        respond: responder,
      }),
    /AIOS_PATCH_(OPERATION_LIMIT|BATCH_LIMIT_EXCEEDED|BATCH_INVALID)/,
  );
});

// 19. Four CONTINUE batches trigger batch limit error
await runAdaptive("36 ADAPTIVE BATCH LIMIT EXCEEDED", async () => {
  const responder = makeResponder([
    singleOpResponse(
      AIOS_PATCH_BATCH_CONTINUE,
      "export const A = 'alpha';",
      "export const A = 'A1';",
    ),
    singleOpResponse(
      AIOS_PATCH_BATCH_CONTINUE,
      "export const B = 'beta';",
      "export const B = 'B1';",
    ),
    singleOpResponse(
      AIOS_PATCH_BATCH_CONTINUE,
      "export const C = 'gamma';",
      "export const C = 'C1';",
    ),
    singleOpResponse(
      AIOS_PATCH_BATCH_CONTINUE,
      "export const D = 'delta';",
      "export const D = 'D1';",
    ),
  ]);
  await assert.rejects(
    () =>
      executeAdaptivePatchEngine({
        baseSource: AD_BASE_SOURCE,
        targetPath: "lib/github/fixture.ts",
        respond: responder,
      }),
    /AIOS_PATCH_BATCH_LIMIT_EXCEEDED/,
  );
});

// 20. Missing SEARCH rejected
await runAdaptive("37 ADAPTIVE MISSING SEARCH REJECTED", async () => {
  const responder = makeResponder([
    singleOpResponse(
      AIOS_PATCH_BATCH_COMPLETE,
      "export const Z = 'never';",
      "export const Z = 'Z1';",
    ),
  ]);
  await assert.rejects(
    () =>
      executeAdaptivePatchEngine({
        baseSource: AD_BASE_SOURCE,
        targetPath: "lib/github/fixture.ts",
        respond: responder,
      }),
    /AIOS_PATCH_SEARCH/,
  );
});

// 21. Non-unique SEARCH rejected
await runAdaptive("38 ADAPTIVE NON UNIQUE SEARCH REJECTED", async () => {
  const duplicated = [
    "export const A = 'alpha';",
    "export const A = 'alpha';",
    "",
  ].join("\n");
  const responder = makeResponder([
    singleOpResponse(
      AIOS_PATCH_BATCH_COMPLETE,
      "export const A = 'alpha';",
      "export const A = 'A1';",
    ),
  ]);
  await assert.rejects(
    () =>
      executeAdaptivePatchEngine({
        baseSource: duplicated,
        targetPath: "lib/github/fixture.ts",
        respond: responder,
      }),
    /AIOS_PATCH_SEARCH/,
  );
});

// 22. Second SEARCH depends on first operation's mutation
await runAdaptive("39 ADAPTIVE SEQUENTIAL SEARCH DEPENDENCY", async () => {
  const responder = makeResponder([
    buildResponse(AIOS_PATCH_BATCH_COMPLETE, [
      buildPatchBlock(
        "export const A = 'alpha';",
        "export const A = 'ALPHA_NEW';",
      ),
      buildPatchBlock(
        "export const A = 'ALPHA_NEW';",
        "export const A = 'ALPHA_FINAL';",
      ),
    ]),
  ]);
  const result = await executeAdaptivePatchEngine({
    baseSource: AD_BASE_SOURCE,
    targetPath: "lib/github/fixture.ts",
    respond: responder,
  });
  assert.ok(
    result.content.includes("export const A = 'ALPHA_FINAL';"),
  );
  assert.equal(result.operationCount, 2);
});

// 23. Failed attempt does not pollute; successful retry yields correct result
await runAdaptive("40 ADAPTIVE RETRY RECOVERS WORKING SOURCE", async () => {
  const responder = makeResponder([
    singleOpResponse(
      AIOS_PATCH_BATCH_COMPLETE,
      "export const Z = 'never';",
      "export const Z = 'Z1';",
    ),
    singleOpResponse(
      AIOS_PATCH_BATCH_COMPLETE,
      "export const A = 'alpha';",
      "export const A = 'A1';",
    ),
  ]);
  const result = await executeAdaptivePatchEngine({
    baseSource: AD_BASE_SOURCE,
    targetPath: "lib/github/fixture.ts",
    respond: responder,
  });
  assert.ok(result.content.includes("export const A = 'A1';"));
  assert.ok(!result.content.includes("export const Z = 'Z1';"));
  assert.equal(result.batchCount, 1);
  assert.equal(result.operationCount, 1);
});

// 24. Three failed retries block the whole file
await runAdaptive("41 ADAPTIVE THREE FAILED RETRIES BLOCK", async () => {
  const responder = makeResponder([
    singleOpResponse(
      AIOS_PATCH_BATCH_COMPLETE,
      "export const Z = 'never';",
      "export const Z = 'Z1';",
    ),
    singleOpResponse(
      AIOS_PATCH_BATCH_COMPLETE,
      "export const Z = 'never';",
      "export const Z = 'Z1';",
    ),
    singleOpResponse(
      AIOS_PATCH_BATCH_COMPLETE,
      "export const Z = 'never';",
      "export const Z = 'Z1';",
    ),
  ]);
  let captured;
  await assert.rejects(
    async () => {
      captured = await executeAdaptivePatchEngine({
        baseSource: AD_BASE_SOURCE,
        targetPath: "lib/github/fixture.ts",
        respond: responder,
      });
    },
    /AIOS_PATCH_SEARCH/,
  );
  assert.equal(captured, undefined);
  assert.equal(responder.calls.length, 3);
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(
  "\nC171.0.2-R3 ADAPTIVE PATCH ENGINE VERIFICATION\n",
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

try {
  fs.rmSync(adaptiveTmpDir, {
    recursive: true,
    force: true,
  });
} catch {
  // Best-effort cleanup only.
}

process.exitCode = failed === 0 ? 0 : 1;
