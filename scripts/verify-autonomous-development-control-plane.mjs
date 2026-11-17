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
    /"@\/lib\/github\/bridge"/g,
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
  "server-only-stub.mjs",
  "export {};\n",
);

writeTmp(
  "atomic-executor.mjs",
  transpile(
    patchedAtomicExecutor,
    "autonomous-development-atomic-executor.ts",
  ),
);

writeTmp(
  "github-bridge-stub.mjs",
  [
    "export function getGitHubBridgeConfig() {",
    "  return {",
    "    apiBaseUrl: \"https://api.github.invalid\",",
    "    token: \"fixture-bridge-token\",",
    "  };",
    "}",
    "",
    "export function resolveGitHubBridgeAuth() {",
    "  return {",
    "    accessToken: \"fixture-bridge-token\",",
    "    authMode: \"token\",",
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
    path.join(tmpDir, "atomic-executor.mjs"),
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
// Atomic Executor — Real Execution Harness
// ---------------------------------------------------------------------------

const ATOMIC_FIXTURE_REPOSITORY = "Vivi9max/AIOS-Alpha";
const ATOMIC_FIXTURE_BASE_BRANCH = "main";
const ATOMIC_FIXTURE_BASE_SHA = "8558a632b7c122b9572822b18fc23494cc97f693";
const ATOMIC_FIXTURE_TASK_ID = "c169-8-ad-ad-1794917117879-r11exec";
const ATOMIC_FIXTURE_TOKEN = "fixture-access-token-r11";
const ATOMIC_FIXTURE_TREE_SHA = "1111111111111111111111111111111111111111";
const ATOMIC_FIXTURE_COMMIT_SHA = "2222222222222222222222222222222222222222";
const ATOMIC_FIXTURE_BLOB_SHA_A = "3333333333333333333333333333333333333333";
const ATOMIC_FIXTURE_BLOB_SHA_B = "4444444444444444444444444444444444444444";
const ATOMIC_FIXTURE_OBJECTIVE =
  "C170.8.8-B R11 atomic executor verification fixture";

const ATOMIC_FIXTURE_FILES = [
  {
    path: "lib/github/verify-fixture-ascii.ts",
    content: "export const fixture = \"ascii-ok\";\n",
  },
  {
    path: "lib/github/verify-fixture-utf8.ts",
    content: "export const greeting = \"héllo-世界-🚀\";\n",
  },
];

function atomicStagingBranchFor(taskId) {
  // Mirror production buildStagingBranch() contract: prefix + sanitized task id.
  const sanitized = String(taskId)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `c169-8-ad-${sanitized}`;
}

function encodeBase64Utf8(text) {
  return Buffer.from(text, "utf8").toString("base64");
}

function decodeBase64Utf8Strict(base64) {
  const buffer = Buffer.from(base64, "base64");
  const decoded = buffer.toString("utf8");
  // Reject invalid UTF-8 by round-tripping.
  if (Buffer.from(decoded, "utf8").toString("base64") !== base64) {
    throw new Error("invalid utf-8");
  }
  return decoded;
}

function buildAtomicMock(options) {
  const opts = options ?? {};
  const expectedStagingBranch = atomicStagingBranchFor(
    ATOMIC_FIXTURE_TASK_ID,
  );

  const requests = [];
  const contentsRequests = [];
  let stagingHeadCount = 0;

  const overrides = {
    contentsStatus: opts.contentsStatus ?? 200,
    contentsType: opts.contentsType ?? "file",
    contentsPathOverride: opts.contentsPathOverride ?? null,
    contentsEncoding: opts.contentsEncoding ?? "base64",
    contentsContentOverride: opts.contentsContentOverride ?? null,
    contentsContentMissing: opts.contentsContentMissing ?? false,
    contentsBlobShaOverride: opts.contentsBlobShaOverride ?? null,
    contentsBlobShaMissing: opts.contentsBlobShaMissing ?? false,
    headMismatchBefore: opts.headMismatchBefore ?? false,
    headMismatchAfter: opts.headMismatchAfter ?? false,
    rejectUnexpected: opts.rejectUnexpected ?? true,
  };

  const blobShasByPath = new Map();
  ATOMIC_FIXTURE_FILES.forEach((file, index) => {
    blobShasByPath.set(
      file.path,
      index === 0 ? ATOMIC_FIXTURE_BLOB_SHA_A : ATOMIC_FIXTURE_BLOB_SHA_B,
    );
  });

  function jsonResponse(status, body) {
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get(name) {
          return String(name).toLowerCase() === "content-type"
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
    };
  }

  function emptyResponse(status) {
    return {
      ok: status >= 200 && status < 300,
      status,
      headers: {
        get() {
          return null;
        },
      },
      async json() {
        return {};
      },
      async text() {
        return "";
      },
    };
  }

  function parseUrl(input) {
    const raw = typeof input === "string" ? input : input.url;
    return new URL(raw);
  }

  function record(method, url) {
    requests.push({ method, url });
  }

  async function handler(input, init) {
    const method = (init && init.method) || "GET";
    const url = parseUrl(input);
    const pathname = url.pathname;
    record(method, url.toString());

    const contentsPrefix = `/repos/${ATOMIC_FIXTURE_REPOSITORY}/contents/`;

    // --- Base branch ref ---
    if (
      method === "GET" &&
      pathname ===
        `/repos/${ATOMIC_FIXTURE_REPOSITORY}/git/ref/heads/${ATOMIC_FIXTURE_BASE_BRANCH}`
    ) {
      return jsonResponse(200, {
        ref: `refs/heads/${ATOMIC_FIXTURE_BASE_BRANCH}`,
        object: {
          sha: ATOMIC_FIXTURE_BASE_SHA,
          type: "commit",
        },
      });
    }

    // --- Base commit tree ---
    if (
      method === "GET" &&
      pathname ===
        `/repos/${ATOMIC_FIXTURE_REPOSITORY}/git/commits/${ATOMIC_FIXTURE_BASE_SHA}`
    ) {
      return jsonResponse(200, {
        sha: ATOMIC_FIXTURE_BASE_SHA,
        tree: {
          sha: "0000000000000000000000000000000000000000",
        },
      });
    }

    // --- Staging branch ref creation (POST) ---
    if (
      method === "POST" &&
      pathname === `/repos/${ATOMIC_FIXTURE_REPOSITORY}/git/refs`
    ) {
      return jsonResponse(201, {
        ref: `refs/heads/${expectedStagingBranch}`,
        object: {
          sha: ATOMIC_FIXTURE_COMMIT_SHA,
          type: "commit",
        },
      });
    }

    // --- Blob creation ---
    if (
      method === "POST" &&
      pathname === `/repos/${ATOMIC_FIXTURE_REPOSITORY}/git/blobs`
    ) {
      const body = init && init.body ? JSON.parse(init.body) : {};
      const content = String(body.content ?? "");
      const sha = content.includes("ascii-ok")
        ? ATOMIC_FIXTURE_BLOB_SHA_A
        : ATOMIC_FIXTURE_BLOB_SHA_B;
      return jsonResponse(201, { sha });
    }

    // --- Tree creation ---
    if (
      method === "POST" &&
      pathname === `/repos/${ATOMIC_FIXTURE_REPOSITORY}/git/trees`
    ) {
      return jsonResponse(201, { sha: ATOMIC_FIXTURE_TREE_SHA });
    }

    // --- Commit creation ---
    if (
      method === "POST" &&
      pathname === `/repos/${ATOMIC_FIXTURE_REPOSITORY}/git/commits`
    ) {
      return jsonResponse(201, {
        sha: ATOMIC_FIXTURE_COMMIT_SHA,
        tree: { sha: ATOMIC_FIXTURE_TREE_SHA },
      });
    }

    // --- Staging branch HEAD (before + after Contents readback) ---
    if (
      method === "GET" &&
      pathname ===
        `/repos/${ATOMIC_FIXTURE_REPOSITORY}/git/ref/heads/${expectedStagingBranch}`
    ) {
      stagingHeadCount += 1;
      const mismatch =
        (stagingHeadCount === 1 && overrides.headMismatchBefore) ||
        (stagingHeadCount === 2 && overrides.headMismatchAfter);
      const sha = mismatch
        ? "9999999999999999999999999999999999999999"
        : ATOMIC_FIXTURE_COMMIT_SHA;
      return jsonResponse(200, {
        ref: `refs/heads/${expectedStagingBranch}`,
        object: {
          sha,
          type: "commit",
        },
      });
    }

    // --- Contents API readback ---
    if (method === "GET" && pathname.startsWith(contentsPrefix)) {
      const requestedPath = decodeURIComponent(
        pathname.slice(contentsPrefix.length),
      );
      contentsRequests.push({
        path: requestedPath,
        ref: url.searchParams.get("ref"),
      });

      if (overrides.contentsStatus !== 200) {
        return jsonResponse(overrides.contentsStatus, {
          message: "Not Found",
        });
      }

      const file = ATOMIC_FIXTURE_FILES.find(
        (candidate) => candidate.path === requestedPath,
      );
      if (!file) {
        if (overrides.rejectUnexpected) {
          throw new Error(
            `mock: unexpected contents path ${requestedPath}`,
          );
        }
        return jsonResponse(404, { message: "Not Found" });
      }

      const returnedPath =
        overrides.contentsPathOverride ?? requestedPath;
      const returnedContent = overrides.contentsContentMissing
        ? undefined
        : overrides.contentsContentOverride !== null
          ? overrides.contentsContentOverride
          : encodeBase64Utf8(file.content);
      const returnedBlobSha = overrides.contentsBlobShaMissing
        ? ""
        : overrides.contentsBlobShaOverride !== null
          ? overrides.contentsBlobShaOverride
          : blobShasByPath.get(file.path);

      const body = {
        type: overrides.contentsType,
        path: returnedPath,
        encoding: overrides.contentsEncoding,
        sha: returnedBlobSha,
        size: file.content.length,
      };
      if (returnedContent !== undefined) {
        body.content = returnedContent;
      }
      return jsonResponse(200, body);
    }

    if (overrides.rejectUnexpected) {
      throw new Error(
        `mock: unexpected request ${method} ${url.toString()}`,
      );
    }
    return emptyResponse(404);
  }

  return {
    handler,
    requests,
    contentsRequests,
    get stagingHeadCount() {
      return stagingHeadCount;
    },
    expectedStagingBranch,
  };
}

function installAtomicFetch(mock) {
  const previous = globalThis.fetch;
  globalThis.fetch = mock.handler;
  return () => {
    globalThis.fetch = previous;
  };
}

function atomicInput(overrides) {
  return {
    objective: ATOMIC_FIXTURE_OBJECTIVE,
    taskId: ATOMIC_FIXTURE_TASK_ID,
    repository: ATOMIC_FIXTURE_REPOSITORY,
    baseBranch: ATOMIC_FIXTURE_BASE_BRANCH,
    files: ATOMIC_FIXTURE_FILES.map((file) => ({
      path: file.path,
      content: file.content,
    })),
    accessToken: ATOMIC_FIXTURE_TOKEN,
    ...(overrides ?? {}),
  };
}

function assertAtomicFailure(result, expectedCode, expectedReasonPrefix) {
  assert.equal(
    result && result.success,
    false,
    "result.success must be false",
  );
  assert.equal(
    result.code,
    expectedCode,
    `expected code ${expectedCode}, received ${result.code}`,
  );
  if (expectedReasonPrefix) {
    assert.ok(
      typeof result.reason === "string" &&
        result.reason.startsWith(expectedReasonPrefix),
      `expected reason to start with "${expectedReasonPrefix}", received "${result.reason}"`,
    );
  }
}

// ---------------------------------------------------------------------------
// TEST 5 — Atomic Executor Positive End-to-End
// ---------------------------------------------------------------------------

await run("5 ATOMIC EXECUTOR POSITIVE", async () => {
  const mock = buildAtomicMock({});
  const restoreFetch = installAtomicFetch(mock);
  try {
    const result = await executeAtomicStaging(atomicInput());

    assert.equal(
      result.success,
      true,
      `expected success, received code=${result.code} reason=${result.reason}`,
    );
    assert.equal(result.code, "AIOS_ATOMIC_STAGING_READY");

    const snapshot = result.snapshot;
    assert.ok(snapshot, "snapshot must be present");
    assert.equal(snapshot.repository, ATOMIC_FIXTURE_REPOSITORY);
    assert.equal(snapshot.baseBranch, ATOMIC_FIXTURE_BASE_BRANCH);
    assert.equal(snapshot.baseSha, ATOMIC_FIXTURE_BASE_SHA);
    assert.equal(
      snapshot.stagingBranch,
      mock.expectedStagingBranch,
      "staging branch must be derived from real taskId",
    );
    assert.equal(snapshot.treeSha, ATOMIC_FIXTURE_TREE_SHA);
    assert.equal(snapshot.stagingCommitSha, ATOMIC_FIXTURE_COMMIT_SHA);
    assert.deepEqual(
      [...snapshot.changedPaths].sort(),
      ATOMIC_FIXTURE_FILES.map((file) => file.path).sort(),
    );

    // Contents readback: one per file, always ref=stagingCommitSha.
    assert.equal(
      mock.contentsRequests.length,
      ATOMIC_FIXTURE_FILES.length,
      "exactly one Contents read per submitted file",
    );
    for (const read of mock.contentsRequests) {
      assert.equal(
        read.ref,
        ATOMIC_FIXTURE_COMMIT_SHA,
        "Contents read must use ref=stagingCommitSha",
      );
      assert.notEqual(read.ref, ATOMIC_FIXTURE_BASE_BRANCH);
      assert.notEqual(read.ref, mock.expectedStagingBranch);
    }

    // Two staging HEAD checks.
    assert.equal(
      mock.stagingHeadCount,
      2,
      "staging HEAD must be read before and after Contents readback",
    );

    // Each returned file must match submitted UTF-8 content.
    for (const file of ATOMIC_FIXTURE_FILES) {
      const read = mock.contentsRequests.find(
        (candidate) => candidate.path === file.path,
      );
      assert.ok(read, `missing Contents read for ${file.path}`);
      const decoded = decodeBase64Utf8Strict(
        encodeBase64Utf8(file.content),
      );
      assert.equal(decoded, file.content);
    }
  } finally {
    restoreFetch();
  }
});

// ---------------------------------------------------------------------------
// TEST 6 — Atomic Executor Negative Cases
// ---------------------------------------------------------------------------

await run("6A ATOMIC CONTENTS 404", async () => {
  const mock = buildAtomicMock({ contentsStatus: 404 });
  const restoreFetch = installAtomicFetch(mock);
  try {
    const result = await executeAtomicStaging(atomicInput());
    assertAtomicFailure(
      result,
      "AIOS_ATOMIC_STAGING_FAILED",
      "contents",
    );
    assert.equal(mock.contentsRequests.length, 1);
  } finally {
    restoreFetch();
  }
});

await run("6B ATOMIC CONTENTS TYPE NOT FILE", async () => {
  const mock = buildAtomicMock({ contentsType: "dir" });
  const restoreFetch = installAtomicFetch(mock);
  try {
    const result = await executeAtomicStaging(atomicInput());
    assertAtomicFailure(
      result,
      "AIOS_ATOMIC_STAGING_FAILED",
      "contents",
    );
    assert.equal(mock.contentsRequests.length, 1);
  } finally {
    restoreFetch();
  }
});

await run("6C ATOMIC CONTENTS PATH MISMATCH", async () => {
  const mock = buildAtomicMock({
    contentsPathOverride: "lib/github/other-file.ts",
  });
  const restoreFetch = installAtomicFetch(mock);
  try {
    const result = await executeAtomicStaging(atomicInput());
    assertAtomicFailure(
      result,
      "AIOS_ATOMIC_STAGING_FAILED",
      "contents",
    );
    assert.equal(mock.contentsRequests.length, 1);
  } finally {
    restoreFetch();
  }
});

await run("6D ATOMIC CONTENTS ENCODING NOT BASE64", async () => {
  const mock = buildAtomicMock({ contentsEncoding: "utf-8" });
  const restoreFetch = installAtomicFetch(mock);
  try {
    const result = await executeAtomicStaging(atomicInput());
    assertAtomicFailure(
      result,
      "AIOS_ATOMIC_STAGING_FAILED",
      "contents",
    );
    assert.equal(mock.contentsRequests.length, 1);
  } finally {
    restoreFetch();
  }
});

await run("6E ATOMIC CONTENTS MALFORMED BASE64", async () => {
  const mock = buildAtomicMock({
    contentsContentOverride: "!!!not-base64!!!",
  });
  const restoreFetch = installAtomicFetch(mock);
  try {
    const result = await executeAtomicStaging(atomicInput());
    assertAtomicFailure(
      result,
      "AIOS_ATOMIC_STAGING_FAILED",
      "contents",
    );
    assert.equal(mock.contentsRequests.length, 1);
  } finally {
    restoreFetch();
  }
});

await run("6F ATOMIC CONTENTS INVALID UTF-8", async () => {
  const invalidUtf8 = Buffer.from([0xff, 0xfe, 0xfd]).toString("base64");
  const mock = buildAtomicMock({
    contentsContentOverride: invalidUtf8,
  });
  const restoreFetch = installAtomicFetch(mock);
  try {
    const result = await executeAtomicStaging(atomicInput());
    assertAtomicFailure(
      result,
      "AIOS_ATOMIC_STAGING_FAILED",
      "contents",
    );
    assert.equal(mock.contentsRequests.length, 1);
  } finally {
    restoreFetch();
  }
});

await run("6G ATOMIC CONTENTS CONTENT MISMATCH", async () => {
  const mock = buildAtomicMock({
    contentsContentOverride: encodeBase64Utf8(
      "export const fixture = \"different\";\n",
    ),
  });
  const restoreFetch = installAtomicFetch(mock);
  try {
    const result = await executeAtomicStaging(atomicInput());
    assertAtomicFailure(
      result,
      "AIOS_ATOMIC_STAGING_FAILED",
      "contents",
    );
    assert.equal(mock.contentsRequests.length, 1);
  } finally {
    restoreFetch();
  }
});

await run("6H ATOMIC CONTENTS CONTENT MISSING", async () => {
  const mock = buildAtomicMock({ contentsContentMissing: true });
  const restoreFetch = installAtomicFetch(mock);
  try {
    const result = await executeAtomicStaging(atomicInput());
    assertAtomicFailure(
      result,
      "AIOS_ATOMIC_STAGING_FAILED",
      "contents",
    );
    assert.equal(mock.contentsRequests.length, 1);
  } finally {
    restoreFetch();
  }
});

await run("6I ATOMIC CONTENTS BLOB SHA MISSING", async () => {
  const mock = buildAtomicMock({ contentsBlobShaMissing: true });
  const restoreFetch = installAtomicFetch(mock);
  try {
    const result = await executeAtomicStaging(atomicInput());
    assertAtomicFailure(
      result,
      "AIOS_ATOMIC_STAGING_FAILED",
      "contents",
    );
    assert.equal(mock.contentsRequests.length, 1);
  } finally {
    restoreFetch();
  }
});

await run("6J ATOMIC HEAD MISMATCH BEFORE CONTENTS", async () => {
  const mock = buildAtomicMock({ headMismatchBefore: true });
  const restoreFetch = installAtomicFetch(mock);
  try {
    const result = await executeAtomicStaging(atomicInput());
    assertAtomicFailure(
      result,
      "AIOS_ATOMIC_STAGING_FAILED",
      "staging",
    );
    assert.equal(
      mock.contentsRequests.length,
      0,
      "no Contents read may occur when pre-readback HEAD mismatches",
    );
    assert.equal(mock.stagingHeadCount, 1);
  } finally {
    restoreFetch();
  }
});

await run("6K ATOMIC HEAD MISMATCH AFTER CONTENTS", async () => {
  const mock = buildAtomicMock({ headMismatchAfter: true });
  const restoreFetch = installAtomicFetch(mock);
  try {
    const result = await executeAtomicStaging(atomicInput());
    assertAtomicFailure(
      result,
      "AIOS_ATOMIC_STAGING_FAILED",
      "staging",
    );
    assert.equal(
      mock.contentsRequests.length,
      ATOMIC_FIXTURE_FILES.length,
    );
    assert.equal(mock.stagingHeadCount, 2);
  } finally {
    restoreFetch();
  }
});

await run("6L ATOMIC INVALID PATH REJECTED", async () => {
  const mock = buildAtomicMock({});
  const restoreFetch = installAtomicFetch(mock);
  try {
    const result = await executeAtomicStaging(
      atomicInput({
        files: [
          {
            path: "../etc/passwd",
            content: "blocked\n",
          },
        ],
      }),
    );
    assertAtomicFailure(
      result,
      "AIOS_ATOMIC_INPUT_REJECTED",
    );
    assert.equal(
      mock.requests.length,
      0,
      "invalid path must not reach GitHub API",
    );
  } finally {
    restoreFetch();
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

try {
  fs.rmSync(tmpDir, {
    recursive: true,
    force: true,
  });
} catch {
  // Best-effort cleanup only.
}

process.exitCode = failed === 0 ? 0 : 1;
