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
// Atomic Executor — real production module import
// ---------------------------------------------------------------------------

const atomicExecutorSource = fs.readFileSync(
  path.join(
    REPO_ROOT,
    "lib/github/autonomous-development-atomic-executor.ts",
  ),
  "utf8",
);

const bridgeSource = fs.readFileSync(
  path.join(REPO_ROOT, "lib/github/bridge.ts"),
  "utf8",
);

// The production executor must import the real bridge module exactly once.
const bridgeImportPattern =
  /from\s+"@\/lib\/github\/bridge"/g;
const bridgeImportMatches =
  atomicExecutorSource.match(bridgeImportPattern) ?? [];

if (bridgeImportMatches.length !== 1) {
  console.error(
    `Atomic executor must import @/lib/github/bridge exactly once; found ${bridgeImportMatches.length}.`,
  );
  process.exit(1);
}

const patchedAtomicExecutor = atomicExecutorSource
  .replace(
    /import\s+"server-only";/,
    'import "./server-only-stub.mjs";',
  )
  .replace(
    /from\s+"@\/lib\/github\/bridge"/g,
    'from "./bridge-stub.mjs"',
  );

writeTmp(
  "atomic-executor.mjs",
  transpile(
    patchedAtomicExecutor,
    "autonomous-development-atomic-executor.ts",
  ),
);

// Bridge stub — mirrors the actual exports consumed by the executor.
// The executor uses its own githubRequest()/global fetch for GitHub REST
// calls, so the bridge stub only needs to satisfy the import binding.
writeTmp(
  "bridge-stub.mjs",
  [
    "export const bridgeMarker = 'aios-bridge-stub';",
    "",
  ].join("\n"),
);

const { executeAtomicStaging } = await import(
  pathToFileURL(
    path.join(tmpDir, "atomic-executor.mjs"),
  ).href
);

// ---------------------------------------------------------------------------
// GitHub API mock harness
// ---------------------------------------------------------------------------

const BASE_SHA = "1111111111111111111111111111111111111111";
const BASE_TREE_SHA = "2222222222222222222222222222222222222222";
const STAGING_COMMIT_SHA = "3333333333333333333333333333333333333333";
const STAGING_BRANCH_PREFIX = "c169-8-ad-";
const FIXTURE_TOKEN = "fixture-token-deterministic";
const FIXTURE_REPO = "Vivi9max/AIOS-Alpha";

function makeJsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return typeof body === "string" ? body : JSON.stringify(body);
    },
  };
}

function encodeBase64Utf8(text) {
  return Buffer.from(text, "utf8").toString("base64");
}

function createGitHubMock(options) {
  const requests = [];
  const contentsRequests = [];
  const blobRequests = [];
  const treeRequests = [];
  const commitRequests = [];
  const stagingRefRequests = [];
  const branchRefRequests = [];

  const state = {
    contentsCallCount: 0,
    preReadbackHeadChecks: 0,
    postReadbackHeadChecks: 0,
    contentsPhaseStarted: false,
    contentsPhaseFinished: false,
    mainRefModified: false,
  };

  const files = options.files;
  const overrides = options.overrides ?? {};

  async function mockFetch(input, init) {
    const url =
      typeof input === "string" ? input : input.url;
    const method = (init?.method ?? "GET").toUpperCase();
    const bodyText =
      typeof init?.body === "string" ? init.body : undefined;

    requests.push({ method, url });

    // GET base branch ref
    if (
      method === "GET" &&
      url ===
        `https://api.github.com/repos/${FIXTURE_REPO}/git/ref/heads/main`
    ) {
      branchRefRequests.push({ method, url });
      if (overrides.baseBranchRefError) {
        return makeJsonResponse(
          overrides.baseBranchRefError.status,
          { message: "base ref error" },
        );
      }
      return makeJsonResponse(200, {
        ref: "refs/heads/main",
        object: {
          sha: BASE_SHA,
          type: "commit",
        },
      });
    }

    // GET base commit object
    if (
      method === "GET" &&
      url ===
        `https://api.github.com/repos/${FIXTURE_REPO}/git/commits/${BASE_SHA}`
    ) {
      if (overrides.baseCommitError) {
        return makeJsonResponse(
          overrides.baseCommitError.status,
          { message: "base commit error" },
        );
      }
      return makeJsonResponse(200, {
        sha: BASE_SHA,
        tree: { sha: BASE_TREE_SHA },
      });
    }

    // POST Git blob
    if (
      method === "POST" &&
      url ===
        `https://api.github.com/repos/${FIXTURE_REPO}/git/blobs`
    ) {
      blobRequests.push({ method, url, body: bodyText });
      if (overrides.blobError) {
        return makeJsonResponse(
          overrides.blobError.status,
          { message: "blob error" },
        );
      }
      return makeJsonResponse(201, {
        sha: "4444444444444444444444444444444444444444",
      });
    }

    // POST Git tree
    if (
      method === "POST" &&
      url ===
        `https://api.github.com/repos/${FIXTURE_REPO}/git/trees`
    ) {
      treeRequests.push({ method, url, body: bodyText });
      if (overrides.treeError) {
        return makeJsonResponse(
          overrides.treeError.status,
          { message: "tree error" },
        );
      }
      return makeJsonResponse(201, {
        sha: "5555555555555555555555555555555555555555",
      });
    }

    // POST Git commit
    if (
      method === "POST" &&
      url ===
        `https://api.github.com/repos/${FIXTURE_REPO}/git/commits`
    ) {
      commitRequests.push({ method, url, body: bodyText });
      if (overrides.commitError) {
        return makeJsonResponse(
          overrides.commitError.status,
          { message: "commit error" },
        );
      }
      return makeJsonResponse(201, {
        sha: STAGING_COMMIT_SHA,
      });
    }

    // POST staging branch ref
    if (
      method === "POST" &&
      url ===
        `https://api.github.com/repos/${FIXTURE_REPO}/git/refs` &&
      typeof bodyText === "string" &&
      bodyText.includes(`"refs/heads/${STAGING_BRANCH_PREFIX}`)
    ) {
      stagingRefRequests.push({ method, url, body: bodyText });
      if (overrides.stagingRefError) {
        return makeJsonResponse(
          overrides.stagingRefError.status,
          { message: "staging ref error" },
        );
      }
      return makeJsonResponse(201, {
        ref: `refs/heads/${STAGING_BRANCH_PREFIX}fixture`,
        object: { sha: STAGING_COMMIT_SHA },
      });
    }

    // GET staging branch ref (pre/post readback HEAD checks)
    if (
      method === "GET" &&
      url.startsWith(
        `https://api.github.com/repos/${FIXTURE_REPO}/git/ref/heads/${STAGING_BRANCH_PREFIX}`,
      )
    ) {
      stagingRefRequests.push({ method, url });
      if (state.contentsPhaseFinished) {
        state.postReadbackHeadChecks += 1;
        if (overrides.postReadbackHeadMismatch) {
          return makeJsonResponse(200, {
            ref: `refs/heads/${STAGING_BRANCH_PREFIX}fixture`,
            object: {
              sha: "9999999999999999999999999999999999999999",
            },
          });
        }
        return makeJsonResponse(200, {
          ref: `refs/heads/${STAGING_BRANCH_PREFIX}fixture`,
          object: { sha: STAGING_COMMIT_SHA },
        });
      }
      state.preReadbackHeadChecks += 1;
      if (overrides.preReadbackHeadMismatch) {
        return makeJsonResponse(200, {
          ref: `refs/heads/${STAGING_BRANCH_PREFIX}fixture`,
          object: {
            sha: "9999999999999999999999999999999999999999",
          },
        });
      }
      return makeJsonResponse(200, {
        ref: `refs/heads/${STAGING_BRANCH_PREFIX}fixture`,
        object: { sha: STAGING_COMMIT_SHA },
      });
    }

    // GET Contents API
    if (
      method === "GET" &&
      url.startsWith(
        `https://api.github.com/repos/${FIXTURE_REPO}/contents/`,
      )
    ) {
      state.contentsPhaseStarted = true;
      const parsed = new URL(url);
      const ref = parsed.searchParams.get("ref");
      const pathPart = decodeURIComponent(
        parsed.pathname.replace(
          `/repos/${FIXTURE_REPO}/contents/`,
          "",
        ),
      );
      contentsRequests.push({
        method,
        url,
        ref,
        path: pathPart,
      });
      state.contentsCallCount += 1;

      if (overrides.contentsHttpError) {
        return makeJsonResponse(
          overrides.contentsHttpError.status,
          { message: "contents http error" },
        );
      }
      if (overrides.contentsNotFound) {
        return makeJsonResponse(404, {
          message: "Not Found",
        });
      }

      const submitted = files.find(
        (file) => file.path === pathPart,
      );
      if (!submitted) {
        return makeJsonResponse(404, {
          message: "Not Found",
        });
      }

      if (overrides.malformedContentsResponse) {
        return makeJsonResponse(200, {
          type: "file",
          name: "not-an-object",
        });
      }

      let content = encodeBase64Utf8(submitted.content);

      if (overrides.missingContent) {
        return makeJsonResponse(200, {
          type: "file",
          encoding: "base64",
          name: pathPart,
        });
      }
      if (overrides.unsupportedEncoding) {
        return makeJsonResponse(200, {
          type: "file",
          encoding: "utf-8",
          content,
          name: pathPart,
        });
      }
      if (overrides.malformedBase64) {
        content = "!!!not-base64!!!";
      }
      if (overrides.invalidUtf8) {
        // Base64 of bytes that are invalid UTF-8 (0xff 0xfe).
        content = Buffer.from([0xff, 0xfe]).toString("base64");
      }
      if (overrides.contentMismatch) {
        content = encodeBase64Utf8(
          submitted.content + "::mismatch",
        );
      }

      return makeJsonResponse(200, {
        type: "file",
        encoding: "base64",
        name: pathPart,
        path: pathPart,
        content,
      });
    }

    // Any POST to main ref would be a violation.
    if (
      method === "POST" &&
      url ===
        `https://api.github.com/repos/${FIXTURE_REPO}/git/refs/heads/main`
    ) {
      state.mainRefModified = true;
      return makeJsonResponse(422, {
        message: "main ref must not be modified",
      });
    }

    return makeJsonResponse(404, {
      message: `unexpected request: ${method} ${url}`,
    });
  }

  return {
    mockFetch,
    requests,
    contentsRequests,
    blobRequests,
    treeRequests,
    commitRequests,
    stagingRefRequests,
    branchRefRequests,
    state,
  };
}

const FIXTURE_FILES = [
  {
    path: "docs/aios-verify-fixture.md",
    content:
      "AIOS fixture — 中文内容 — emoji 🚀🔒 — line2\n",
  },
  {
    path: "lib/aios-verify-fixture.ts",
    content:
      "export const fixture = '中文 🚀';\n",
  },
  {
    path: "scripts/aios-verify-fixture.mjs",
    content:
      "console.log('中文 🚀');\n",
  },
];

function createAtomicFixtureInput(taskId) {
  return {
    objective: "C170.8.8-B-R6 atomic executor readback fixture",
    taskId,
    repository: FIXTURE_REPO,
    baseBranch: "main",
    files: FIXTURE_FILES.map((file) => ({
      path: file.path,
      content: file.content,
    })),
    accessToken: FIXTURE_TOKEN,
  };
}

async function withMockedFetch(options, fn) {
  const originalFetch = globalThis.fetch;
  const mock = createGitHubMock(options);
  globalThis.fetch = mock.mockFetch;
  try {
    const result = await fn(mock);
    return { result, mock };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// ---------------------------------------------------------------------------
// Atomic Executor — Positive Test
// ---------------------------------------------------------------------------

await run("5 ATOMIC EXECUTOR POSITIVE READBACK", async () => {
  const input = createAtomicFixtureInput(
    "task-atomic-positive",
  );

  const { result, mock } = await withMockedFetch(
    { files: FIXTURE_FILES },
    async () => executeAtomicStaging(input),
  );

  assert.equal(
    result.success,
    true,
    `atomic executor must succeed; got ${JSON.stringify(result)}`,
  );

  assert.ok(
    typeof result.code === "string" && result.code.length > 0,
    "result.code must be a non-empty string",
  );

  assert.ok(
    result.snapshot,
    "result.snapshot must be present",
  );

  assert.equal(
    result.snapshot.baseSha,
    BASE_SHA,
    "snapshot.baseSha must equal mocked base SHA",
  );

  assert.equal(
    result.snapshot.stagingCommitSha,
    STAGING_COMMIT_SHA,
    "snapshot.stagingCommitSha must equal mocked staging commit SHA",
  );

  assert.ok(
    typeof result.snapshot.stagingBranch === "string" &&
      result.snapshot.stagingBranch.startsWith(
        STAGING_BRANCH_PREFIX,
      ),
    `snapshot.stagingBranch must start with ${STAGING_BRANCH_PREFIX}; got ${result.snapshot.stagingBranch}`,
  );

  assert.equal(
    mock.blobRequests.length,
    FIXTURE_FILES.length,
    "one blob POST per submitted file",
  );

  assert.equal(
    mock.treeRequests.length,
    1,
    "exactly one tree POST",
  );

  assert.equal(
    mock.commitRequests.length,
    1,
    "exactly one commit POST",
  );

  assert.equal(
    mock.stagingRefRequests.filter(
      (r) => r.method === "POST",
    ).length,
    1,
    "exactly one staging ref POST",
  );

  assert.equal(
    mock.contentsRequests.length,
    FIXTURE_FILES.length,
    "exactly one Contents GET per submitted file",
  );

  for (const request of mock.contentsRequests) {
    assert.equal(
      request.ref,
      STAGING_COMMIT_SHA,
      "Contents GET must use the exact staging commit SHA as ref",
    );
  }

  assert.equal(
    mock.state.preReadbackHeadChecks,
    1,
    "staging HEAD must be checked once before readback",
  );

  assert.equal(
    mock.state.postReadbackHeadChecks,
    1,
    "staging HEAD must be checked once after readback",
  );

  assert.equal(
    mock.state.mainRefModified,
    false,
    "main ref must not be modified",
  );
});

// ---------------------------------------------------------------------------
// Atomic Executor — Negative Tests
// ---------------------------------------------------------------------------

async function runAtomicNegative(
  name,
  overrides,
  expectedCodeFragment,
) {
  await run(name, async () => {
    const input = createAtomicFixtureInput(
      `task-atomic-${name.replace(/\s+/g, "-").toLowerCase()}`,
    );

    const { result, mock } = await withMockedFetch(
      { files: FIXTURE_FILES, overrides },
      async () => executeAtomicStaging(input),
    );

    assert.equal(
      result.success,
      false,
      `expected failure; got ${JSON.stringify(result)}`,
    );

    assert.ok(
      typeof result.code === "string" && result.code.length > 0,
      "failure must include a code",
    );

    if (expectedCodeFragment) {
      assert.ok(
        result.code
          .toLowerCase()
          .includes(expectedCodeFragment.toLowerCase()),
        `expected code containing ${expectedCodeFragment}; got ${result.code}`,
      );
    }

    assert.ok(
      typeof result.reason === "string" &&
        result.reason.length > 0,
      "failure must include a meaningful reason",
    );

    assert.ok(
      mock.requests.length > 0,
      "at least one mocked API request must have been reached",
    );

    assert.equal(
      mock.state.mainRefModified,
      false,
      "main ref must not be modified",
    );
  });
}

await runAtomicNegative(
  "6 CONTENTS API 404",
  { contentsNotFound: true },
  "contents",
);

await runAtomicNegative(
  "7 CONTENTS MISSING CONTENT",
  { missingContent: true },
  "content",
);

await runAtomicNegative(
  "8 CONTENTS UNSUPPORTED ENCODING",
  { unsupportedEncoding: true },
  "encoding",
);

await runAtomicNegative(
  "9 CONTENTS MALFORMED BASE64",
  { malformedBase64: true },
  "base64",
);

await runAtomicNegative(
  "10 CONTENTS INVALID UTF8",
  { invalidUtf8: true },
  "utf",
);

await runAtomicNegative(
  "11 CONTENTS DECODED MISMATCH",
  { contentMismatch: true },
  "mismatch",
);

await runAtomicNegative(
  "12 CONTENTS MALFORMED RESPONSE",
  { malformedContentsResponse: true },
  "contents",
);

await runAtomicNegative(
  "13 CONTENTS HTTP ERROR",
  { contentsHttpError: { status: 500 } },
  "contents",
);

await runAtomicNegative(
  "14 STAGING HEAD MISMATCH BEFORE READBACK",
  { preReadbackHeadMismatch: true },
  "head",
);

await runAtomicNegative(
  "15 STAGING HEAD MISMATCH AFTER READBACK",
  { postReadbackHeadMismatch: true },
  "head",
);

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(
  "\nC170.8.8-B-R6 INDEPENDENT VERIFICATION\n",
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
