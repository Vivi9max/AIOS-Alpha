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
  )
  .replace(
    /"@\/lib\/github\/github-bridge"/g,
    '"./github-bridge-stub.mjs"',
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
    "const TEST_FIXTURE_ACCESS_TOKEN = \"aios-test-fixture-token\";",
    "const TEST_FIXTURE_API_BASE_URL = \"https://api.github.test.invalid\";",
    "const TEST_FIXTURE_DEFAULT_REPO = \"Vivi9max/AIOS-Alpha\";",
    "const TEST_FIXTURE_DEFAULT_BRANCH = \"main\";",
    "",
    "export function resolveGitHubBridgeAuth() {",
    "  return {",
    "    accessToken: TEST_FIXTURE_ACCESS_TOKEN,",
    "    authMode: \"token\",",
    "  };",
    "}",
    "",
    "export function getGitHubBridgeConfig() {",
    "  return {",
    "    apiBaseUrl: TEST_FIXTURE_API_BASE_URL,",
    "    defaultRepo: TEST_FIXTURE_DEFAULT_REPO,",
    "    defaultBranch: TEST_FIXTURE_DEFAULT_BRANCH,",
    "    authMode: \"token\",",
    "    token: TEST_FIXTURE_ACCESS_TOKEN,",
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
// Atomic executor fixtures
// ---------------------------------------------------------------------------

const ATOMIC_REPOSITORY = "Vivi9max/AIOS-Alpha";
const ATOMIC_BASE_BRANCH = "main";
const ATOMIC_BASE_SHA = "a".repeat(40);
const ATOMIC_BASE_TREE_SHA = "b".repeat(40);
const ATOMIC_STAGING_TREE_SHA = "c".repeat(40);
const ATOMIC_STAGING_COMMIT_SHA = "d".repeat(40);
const ATOMIC_OBJECTIVE =
  "C170.8.8-B R9 atomic executor production contract fixture";
const ATOMIC_TASK_ID = "c170-8-8-b-r9-atomic-fixture";
const ATOMIC_STAGING_BRANCH = `aios/${ATOMIC_TASK_ID}`;

const ATOMIC_FILES = [
  {
    path: "lib/github/autonomous-development-atomic-executor.ts",
    content:
      "export const atomicFixture = \"alpha\";\n",
  },
  {
    path: "scripts/verify-autonomous-development-control-plane.mjs",
    content:
      "console.log(\"atomic fixture beta\");\n",
  },
];

function blobShaFor(index) {
  return `${index}`.padStart(40, "0");
}

function base64Of(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

function buildAtomicInput(overrides = {}) {
  return {
    objective: ATOMIC_OBJECTIVE,
    taskId: ATOMIC_TASK_ID,
    repository: ATOMIC_REPOSITORY,
    baseBranch: ATOMIC_BASE_BRANCH,
    files: ATOMIC_FILES.map((file) => ({ ...file })),
    ...overrides,
  };
}

function createAtomicFetchMock(options = {}) {
  const state = {
    calls: [],
    contentsCalls: [],
    headCalls: [],
    blobCalls: [],
    treeCalls: [],
    commitCalls: [],
    branchCalls: [],
    headSequence: [
      ATOMIC_STAGING_COMMIT_SHA,
      ATOMIC_STAGING_COMMIT_SHA,
    ],
    contentsHandler: null,
  };

  const fetchMock = async (input, init = {}) => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : String(input);
    const method = (
      init.method ?? "GET"
    ).toUpperCase();
    const record = { url, method, init };
    state.calls.push(record);

    const parsed = new URL(url);

    const json = (status, body) => ({
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get(name) {
          return name.toLowerCase() === "content-type"
            ? "application/json"
            : null;
        },
      },
      async json() {
        return body;
      },
      async text() {
        return JSON.stringify(body);
      },
    });

    // Contents API
    const contentsPrefix = `/repos/${ATOMIC_REPOSITORY}/contents/`;
    if (parsed.pathname.startsWith(contentsPrefix)) {
      state.contentsCalls.push(record);
      if (typeof state.contentsHandler === "function") {
        const handled = state.contentsHandler(record, parsed);
        if (handled) {
          return handled;
        }
      }
      const relPath = decodeURIComponent(
        parsed.pathname.slice(contentsPrefix.length),
      );
      const file = ATOMIC_FILES.find(
        (candidate) => candidate.path === relPath,
      );
      if (!file) {
        return json(404, { message: "Not Found" });
      }
      return json(200, {
        type: "file",
        path: file.path,
        encoding: "base64",
        content: base64Of(file.content),
        sha: blobShaFor(
          ATOMIC_FILES.indexOf(file) + 1,
        ),
      });
    }

    // Branch (base SHA) read
    if (
      method === "GET" &&
      parsed.pathname ===
        `/repos/${ATOMIC_REPOSITORY}/branches/${ATOMIC_BASE_BRANCH}`
    ) {
      return json(200, {
        name: ATOMIC_BASE_BRANCH,
        commit: {
          sha: ATOMIC_BASE_SHA,
          commit: {
            tree: { sha: ATOMIC_BASE_TREE_SHA },
          },
        },
      });
    }

    // Commit read (base commit tree)
    if (
      method === "GET" &&
      parsed.pathname ===
        `/repos/${ATOMIC_REPOSITORY}/git/commits/${ATOMIC_BASE_SHA}`
    ) {
      return json(200, {
        sha: ATOMIC_BASE_SHA,
        tree: { sha: ATOMIC_BASE_TREE_SHA },
      });
    }

    // Blob creation
    if (
      method === "POST" &&
      parsed.pathname ===
        `/repos/${ATOMIC_REPOSITORY}/git/blobs`
    ) {
      state.blobCalls.push(record);
      const index = state.blobCalls.length;
      return json(201, {
        sha: blobShaFor(index),
      });
    }

    // Tree creation
    if (
      method === "POST" &&
      parsed.pathname ===
        `/repos/${ATOMIC_REPOSITORY}/git/trees`
    ) {
      state.treeCalls.push(record);
      return json(201, {
        sha: ATOMIC_STAGING_TREE_SHA,
      });
    }

    // Commit creation
    if (
      method === "POST" &&
      parsed.pathname ===
        `/repos/${ATOMIC_REPOSITORY}/git/commits`
    ) {
      state.commitCalls.push(record);
      return json(201, {
        sha: ATOMIC_STAGING_COMMIT_SHA,
      });
    }

    // Staging branch creation
    if (
      method === "POST" &&
      parsed.pathname ===
        `/repos/${ATOMIC_REPOSITORY}/git/refs`
    ) {
      state.branchCalls.push(record);
      return json(201, {
        ref: `refs/heads/${ATOMIC_STAGING_BRANCH}`,
        object: { sha: ATOMIC_STAGING_COMMIT_SHA },
      });
    }

    // Staging HEAD verification (git ref read)
    if (
      method === "GET" &&
      parsed.pathname ===
        `/repos/${ATOMIC_REPOSITORY}/git/ref/heads/${ATOMIC_STAGING_BRANCH}`
    ) {
      state.headCalls.push(record);
      const index = Math.min(
        state.headCalls.length - 1,
        state.headSequence.length - 1,
      );
      return json(200, {
        ref: `refs/heads/${ATOMIC_STAGING_BRANCH}`,
        object: { sha: state.headSequence[index] },
      });
    }

    return json(404, {
      message: `Unexpected request: ${method} ${parsed.pathname}`,
    });
  };

  return { fetchMock, state };
}

function installFetchMock(fetchMock) {
  const previous = globalThis.fetch;
  globalThis.fetch = fetchMock;
  return () => {
    globalThis.fetch = previous;
  };
}

function assertAuthSucceeded(state) {
  assert.ok(
    state.calls.length > 0,
    "executor must have issued GitHub API requests",
  );
  const authHeader = state.calls[0].init?.headers;
  const headerValue =
    authHeader instanceof Headers
      ? authHeader.get("authorization")
      : authHeader &&
          typeof authHeader === "object" &&
          "authorization" in authHeader
        ? authHeader.authorization
        : authHeader &&
            typeof authHeader === "object" &&
            "Authorization" in authHeader
          ? authHeader.Authorization
          : undefined;
  assert.ok(
    typeof headerValue === "string" &&
      headerValue.length > 0,
    "authentication header must be present",
  );
}

// ---------------------------------------------------------------------------
// TEST 5 — Atomic executor positive case
// ---------------------------------------------------------------------------

await run("5 ATOMIC EXECUTOR POSITIVE", async () => {
  const { fetchMock, state } = createAtomicFetchMock();
  const restore = installFetchMock(fetchMock);
  try {
    const result = await executeAtomicStaging(
      buildAtomicInput(),
    );

    assert.equal(result.success, true);
    assert.equal(result.code, "AIOS_ATOMIC_STAGING_READY");
    assert.ok(result.snapshot);
    assert.equal(
      result.snapshot.repository,
      ATOMIC_REPOSITORY,
    );
    assert.equal(
      result.snapshot.baseBranch,
      ATOMIC_BASE_BRANCH,
    );
    assert.equal(
      result.snapshot.baseSha,
      ATOMIC_BASE_SHA,
    );
    assert.equal(
      result.snapshot.stagingBranch,
      ATOMIC_STAGING_BRANCH,
    );
    assert.equal(
      result.snapshot.treeSha,
      ATOMIC_STAGING_TREE_SHA,
    );
    assert.equal(
      result.snapshot.stagingCommitSha,
      ATOMIC_STAGING_COMMIT_SHA,
    );
    assert.deepEqual(
      result.snapshot.changedPaths,
      ATOMIC_FILES.map((file) => file.path),
    );

    assertAuthSucceeded(state);

    assert.ok(
      state.blobCalls.length === ATOMIC_FILES.length,
      "one blob per submitted file",
    );
    assert.ok(
      state.treeCalls.length === 1,
      "exactly one tree creation",
    );
    assert.ok(
      state.commitCalls.length === 1,
      "exactly one commit creation",
    );
    assert.ok(
      state.branchCalls.length === 1,
      "exactly one staging branch creation",
    );
    assert.ok(
      state.headCalls.length === 2,
      "staging HEAD verified before and after readback",
    );
    assert.ok(
      state.contentsCalls.length === ATOMIC_FILES.length,
      "one Contents API read per submitted file",
    );

    for (const call of state.contentsCalls) {
      const parsed = new URL(call.url);
      const ref = parsed.searchParams.get("ref");
      assert.equal(
        ref,
        ATOMIC_STAGING_COMMIT_SHA,
        "Contents API must use immutable staging commit SHA",
      );
      assert.notEqual(ref, ATOMIC_BASE_BRANCH);
      assert.notEqual(ref, ATOMIC_STAGING_BRANCH);
    }
  } finally {
    restore();
  }
});

// ---------------------------------------------------------------------------
// Atomic executor negative cases
// ---------------------------------------------------------------------------

async function runAtomicNegative(
  name,
  setup,
  assertFailure,
) {
  await run(name, async () => {
    const { fetchMock, state } = createAtomicFetchMock();
    if (typeof setup === "function") {
      setup(state);
    }
    const restore = installFetchMock(fetchMock);
    try {
      const result = await executeAtomicStaging(
        buildAtomicInput(),
      );

      assert.notEqual(
        result.success,
        true,
        "negative case must not succeed",
      );
      assertAuthSucceeded(state);
      await assertFailure(result, state);
    } finally {
      restore();
    }
  });
}

await runAtomicNegative(
  "6A CONTENTS API 404",
  (state) => {
    state.contentsHandler = (record, parsed) => {
      if (state.contentsCalls.length === 1) {
        return {
          ok: false,
          status: 404,
          headers: {
            get(name) {
              return name.toLowerCase() === "content-type"
                ? "application/json"
                : null;
            },
          },
          async json() {
            return { message: "Not Found" };
          },
          async text() {
            return "{\"message\":\"Not Found\"}";
          },
        };
      }
      return null;
    };
  },
  async (result, state) => {
    assert.ok(
      state.contentsCalls.length >= 1,
      "Contents API must have been called",
    );
    assert.ok(
      typeof result.code === "string" &&
        result.code.length > 0,
      "failure must carry a code",
    );
    assert.notEqual(
      result.code,
      "AIOS_ATOMIC_STAGING_READY",
    );
  },
);

await runAtomicNegative(
  "6B INVALID RESPONSE TYPE",
  (state) => {
    state.contentsHandler = () => ({
      ok: true,
      status: 200,
      headers: {
        get(name) {
          return name.toLowerCase() === "content-type"
            ? "application/json"
            : null;
        },
      },
      async json() {
        return {
          type: "dir",
          path: ATOMIC_FILES[0].path,
          encoding: "base64",
          content: base64Of(ATOMIC_FILES[0].content),
          sha: blobShaFor(1),
        };
      },
      async text() {
        return "{}";
      },
    });
  },
  async (result, state) => {
    assert.ok(state.contentsCalls.length >= 1);
    assert.notEqual(
      result.code,
      "AIOS_ATOMIC_STAGING_READY",
    );
  },
);

await runAtomicNegative(
  "6C RETURNED PATH MISMATCH",
  (state) => {
    state.contentsHandler = () => ({
      ok: true,
      status: 200,
      headers: {
        get(name) {
          return name.toLowerCase() === "content-type"
            ? "application/json"
            : null;
        },
      },
      async json() {
        return {
          type: "file",
          path: "lib/github/unexpected-path.ts",
          encoding: "base64",
          content: base64Of(ATOMIC_FILES[0].content),
          sha: blobShaFor(1),
        };
      },
      async text() {
        return "{}";
      },
    });
  },
  async (result, state) => {
    assert.ok(state.contentsCalls.length >= 1);
    assert.notEqual(
      result.code,
      "AIOS_ATOMIC_STAGING_READY",
    );
  },
);

await runAtomicNegative(
  "6D INVALID ENCODING",
  (state) => {
    state.contentsHandler = () => ({
      ok: true,
      status: 200,
      headers: {
        get(name) {
          return name.toLowerCase() === "content-type"
            ? "application/json"
            : null;
        },
      },
      async json() {
        return {
          type: "file",
          path: ATOMIC_FILES[0].path,
          encoding: "utf-8",
          content: ATOMIC_FILES[0].content,
          sha: blobShaFor(1),
        };
      },
      async text() {
        return "{}";
      },
    });
  },
  async (result, state) => {
    assert.ok(state.contentsCalls.length >= 1);
    assert.notEqual(
      result.code,
      "AIOS_ATOMIC_STAGING_READY",
    );
  },
);

await runAtomicNegative(
  "6E MALFORMED BASE64",
  (state) => {
    state.contentsHandler = () => ({
      ok: true,
      status: 200,
      headers: {
        get(name) {
          return name.toLowerCase() === "content-type"
            ? "application/json"
            : null;
        },
      },
      async json() {
        return {
          type: "file",
          path: ATOMIC_FILES[0].path,
          encoding: "base64",
          content: "!!!not-base64!!!",
          sha: blobShaFor(1),
        };
      },
      async text() {
        return "{}";
      },
    });
  },
  async (result, state) => {
    assert.ok(state.contentsCalls.length >= 1);
    assert.notEqual(
      result.code,
      "AIOS_ATOMIC_STAGING_READY",
    );
  },
);

await runAtomicNegative(
  "6F INVALID UTF-8",
  (state) => {
    state.contentsHandler = () => ({
      ok: true,
      status: 200,
      headers: {
        get(name) {
          return name.toLowerCase() === "content-type"
            ? "application/json"
            : null;
        },
      },
      async json() {
        return {
          type: "file",
          path: ATOMIC_FILES[0].path,
          encoding: "base64",
          content: Buffer.from([
            0xff, 0xfe, 0xfd,
          ]).toString("base64"),
          sha: blobShaFor(1),
        };
      },
      async text() {
        return "{}";
      },
    });
  },
  async (result, state) => {
    assert.ok(state.contentsCalls.length >= 1);
    assert.notEqual(
      result.code,
      "AIOS_ATOMIC_STAGING_READY",
    );
  },
);

await runAtomicNegative(
  "6G CONTENT MISMATCH",
  (state) => {
    state.contentsHandler = () => ({
      ok: true,
      status: 200,
      headers: {
        get(name) {
          return name.toLowerCase() === "content-type"
            ? "application/json"
            : null;
        },
      },
      async json() {
        return {
          type: "file",
          path: ATOMIC_FILES[0].path,
          encoding: "base64",
          content: base64Of(
            "unexpected mismatched content",
          ),
          sha: blobShaFor(1),
        };
      },
      async text() {
        return "{}";
      },
    });
  },
  async (result, state) => {
    assert.ok(state.contentsCalls.length >= 1);
    assert.notEqual(
      result.code,
      "AIOS_ATOMIC_STAGING_READY",
    );
  },
);

await runAtomicNegative(
  "6H STAGING HEAD CHANGED BEFORE READBACK",
  (state) => {
    state.headSequence = [
      "e".repeat(40),
      "e".repeat(40),
    ];
  },
  async (result, state) => {
    assert.ok(
      state.headCalls.length >= 1,
      "initial staging HEAD must be checked",
    );
    assert.equal(
      state.contentsCalls.length,
      0,
      "Contents API must not be reached when initial HEAD check fails",
    );
    assert.notEqual(
      result.code,
      "AIOS_ATOMIC_STAGING_READY",
    );
  },
);

await runAtomicNegative(
  "6I STAGING HEAD CHANGED AFTER READBACK",
  (state) => {
    state.headSequence = [
      ATOMIC_STAGING_COMMIT_SHA,
      "f".repeat(40),
    ];
  },
  async (result, state) => {
    assert.equal(
      state.headCalls.length,
      2,
      "staging HEAD verified before and after readback",
    );
    assert.equal(
      state.contentsCalls.length,
      ATOMIC_FILES.length,
      "every submitted file must be read before final HEAD check",
    );
    assert.notEqual(
      result.code,
      "AIOS_ATOMIC_STAGING_READY",
    );
  },
);

await run("6J INVALID FILE PATH", async () => {
  const { fetchMock, state } = createAtomicFetchMock();
  const restore = installFetchMock(fetchMock);
  try {
    const result = await executeAtomicStaging(
      buildAtomicInput({
        files: [
          {
            path: "../escape/outside.ts",
            content: "malicious\n",
          },
        ],
      }),
    );

    assert.notEqual(
      result.success,
      true,
      "invalid file path must not succeed",
    );
    assert.equal(
      result.code,
      "AIOS_ATOMIC_INPUT_REJECTED",
    );
    assert.equal(
      state.calls.length,
      0,
      "zero GitHub API requests for invalid input",
    );
  } finally {
    restore();
  }
});

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

if (failed > 0) {
  console.error(
    "One or more required control-plane or atomic executor tests failed.",
  );
}

try {
  fs.rmSync(tmpDir, {
    recursive: true,
    force: true,
  });
} catch {
  // Best-effort cleanup only.
}

process.exitCode = failed === 0 ? 0 : 1;
