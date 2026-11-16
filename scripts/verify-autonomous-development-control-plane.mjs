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
// Atomic staging executor regression harness
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
    /"@\/lib\/github\/bridge"/g,
    '"./bridge-stub.mjs"',
  )
  .replace(
    /import\s+"server-only";/,
    'import "./server-only-stub.mjs";',
  );

writeTmp(
  "bridge-stub.mjs",
  [
    "export function getGitHubBridgeConfig() {",
    "  return {",
    '    owner: "Vivi9max",',
    '    repo: "AIOS-Alpha",',
    '    token: "test-token",',
    "  };",
    "}",
    "",
    "export async function resolveGitHubBridgeAuth() {",
    "  return {",
    '    token: "test-token",',
    '    source: "stub",',
    "  };",
    "}",
    "",
  ].join("\n"),
);

writeTmp(
  "atomic-executor.mjs",
  transpile(
    patchedAtomicExecutor,
    "autonomous-development-atomic-executor.ts",
  ),
);

const { executeAtomicStaging } = await import(
  pathToFileURL(
    path.join(tmpDir, "atomic-executor.mjs"),
  ).href
);

function buildStagingBranchForTest(taskId) {
  const prefix = "c169-8-ad-";
  const trimmed = String(taskId ?? "").trim();
  const normalized = trimmed
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "")
    .slice(0, 48);
  const suffix =
    normalized.length > 0 ? normalized : "task";
  return `${prefix}${suffix}`;
}

function encodeBase64Utf8(value) {
  return Buffer.from(value, "utf8").toString("base64");
}

function decodeBase64Utf8(value) {
  return Buffer.from(value, "base64").toString("utf8");
}

function createMockGitHub(options) {
  const opts = options ?? {};
  const baseSha =
    opts.baseSha ?? "1111111111111111111111111111111111111111";
  const newCommitSha =
    opts.newCommitSha ??
    "2222222222222222222222222222222222222222";
  const treeSha =
    opts.treeSha ?? "3333333333333333333333333333333333333333";

  const requests = [];
  const fileContents = new Map();
  const fileReadCounts = new Map();
  let stagingRefCreated = false;
  let createdStagingBranch = null;
  let createdCommitSha = null;
  let createdTreePaths = [];
  let createdCommitParent = null;
  let blobCount = 0;

  for (const file of opts.files ?? []) {
    fileContents.set(file.path, file.content);
  }

  const failures = opts.failures ?? {};

  async function mockFetch(input, init) {
    const url =
      typeof input === "string" ? input : input.url;
    const method = (
      init?.method ??
      (typeof input === "string" ? "GET" : input.method) ??
      "GET"
    ).toUpperCase();
    let body = null;
    if (init?.body) {
      try {
        body = JSON.parse(String(init.body));
      } catch {
        body = String(init.body);
      }
    }
    requests.push({ method, url, body });

    // POST /git/refs — staging branch creation
    if (
      method === "POST" &&
      /\/git\/refs$/.test(url)
    ) {
      if (failures.createRef) {
        return new Response(
          JSON.stringify({ message: "create ref failed" }),
          { status: 500 },
        );
      }
      createdStagingBranch = body?.ref?.replace(
        /^refs\/heads\//,
        "",
      );
      stagingRefCreated = true;
      return new Response(
        JSON.stringify({
          ref: body?.ref,
          object: { sha: body?.sha },
        }),
        { status: 201 },
      );
    }

    // GET /git/ref/heads/<branch> — branch ref lookup
    const refMatch = url.match(
      /\/git\/ref\/heads\/([^/?]+)$/,
    );
    if (method === "GET" && refMatch) {
      const branch = decodeURIComponent(refMatch[1]);
      if (stagingRefCreated && branch === createdStagingBranch) {
        if (failures.headMismatch) {
          return new Response(
            JSON.stringify({
              ref: `refs/heads/${branch}`,
              object: {
                sha: "9999999999999999999999999999999999999999",
              },
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            ref: `refs/heads/${branch}`,
            object: { sha: newCommitSha },
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          ref: `refs/heads/${branch}`,
          object: { sha: baseSha },
        }),
        { status: 200 },
      );
    }

    // POST /git/blobs
    if (method === "POST" && /\/git\/blobs$/.test(url)) {
      blobCount += 1;
      return new Response(
        JSON.stringify({
          sha: `blob-${blobCount}-${newCommitSha.slice(0, 8)}`,
        }),
        { status: 201 },
      );
    }

    // POST /git/trees
    if (method === "POST" && /\/git\/trees$/.test(url)) {
      if (failures.createTree) {
        return new Response(
          JSON.stringify({ message: "tree failed" }),
          { status: 500 },
        );
      }
      createdTreePaths = (body?.tree ?? []).map(
        (entry) => entry.path,
      );
      return new Response(
        JSON.stringify({ sha: treeSha }),
        { status: 201 },
      );
    }

    // POST /git/commits
    if (method === "POST" && /\/git\/commits$/.test(url)) {
      if (failures.createCommit) {
        return new Response(
          JSON.stringify({ message: "commit failed" }),
          { status: 500 },
        );
      }
      createdCommitParent = body?.parents?.[0] ?? null;
      createdCommitSha = newCommitSha;
      return new Response(
        JSON.stringify({ sha: newCommitSha }),
        { status: 201 },
      );
    }

    // GET /contents/<path>?ref=<sha>
    const contentsMatch = url.match(
      /\/contents\/([^?]+)\?ref=([^&]+)/,
    );
    if (method === "GET" && contentsMatch) {
      const filePath = decodeURIComponent(
        contentsMatch[1],
      );
      const ref = decodeURIComponent(contentsMatch[2]);
      const readCount =
        (fileReadCounts.get(filePath) ?? 0) + 1;
      fileReadCounts.set(filePath, readCount);

      if (failures.httpError) {
        return new Response(
          JSON.stringify({ message: "server error" }),
          { status: 500 },
        );
      }
      if (failures.malformedResponse) {
        return new Response("not-json", {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (
        failures.missingFile &&
        failures.missingFile === filePath
      ) {
        return new Response(
          JSON.stringify({ message: "Not Found" }),
          { status: 404 },
        );
      }
      if (!fileContents.has(filePath)) {
        return new Response(
          JSON.stringify({ message: "Not Found" }),
          { status: 404 },
        );
      }

      const original = fileContents.get(filePath);
      let encoded = encodeBase64Utf8(original);
      let encoding = "base64";
      let content = encoded;

      if (
        failures.missingContent &&
        failures.missingContent === filePath
      ) {
        content = "";
      } else if (
        failures.malformedBase64 &&
        failures.malformedBase64 === filePath
      ) {
        content = "!!!not-base64!!!";
      } else if (
        failures.unsupportedEncoding &&
        failures.unsupportedEncoding === filePath
      ) {
        encoding = "utf-16";
      } else if (
        failures.contentMismatch &&
        failures.contentMismatch === filePath
      ) {
        content = encodeBase64Utf8(
          `${original}__tampered__`,
        );
      }

      return new Response(
        JSON.stringify({
          type: "file",
          encoding,
          content,
          sha: `content-sha-${filePath}`,
          path: filePath,
        }),
        { status: 200 },
      );
    }

    return new Response(
      JSON.stringify({
        message: `unexpected request ${method} ${url}`,
      }),
      { status: 500 },
    );
  }

  return {
    fetch: mockFetch,
    requests,
    fileReadCounts,
    getCreatedStagingBranch: () => createdStagingBranch,
    getCreatedCommitSha: () => createdCommitSha,
    getCreatedTreePaths: () => createdTreePaths,
    getCreatedCommitParent: () => createdCommitParent,
    getBlobCount: () => blobCount,
    baseSha,
    newCommitSha,
    treeSha,
  };
}

async function withMockFetch(mock, fn) {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock.fetch;
  try {
    return await fn();
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// ---------------------------------------------------------------------------
// TEST 5 — Successful multi-file atomic staging (Unicode)
// ---------------------------------------------------------------------------

await run("5 ATOMIC STAGING SUCCESS MULTI-FILE", async () => {
  const taskId = "C170.8.8-R4-success-fixture";
  const files = [
    {
      path: "docs/readme-ü.md",
      content: "# Ünïcödé テスト 内容\n",
    },
    {
      path: "src/example.ts",
      content: "export const value = 42;\n",
    },
  ];

  const mock = createMockGitHub({ files });

  const result = await withMockFetch(mock, async () =>
    executeAtomicStaging({
      taskId,
      repository: "Vivi9max/AIOS-Alpha",
      baseBranch: "main",
      files,
    }),
  );

  assert.equal(
    result.success,
    true,
    `expected success, got ${JSON.stringify(result)}`,
  );
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_READY");

  const snapshot = result.snapshot;
  assert.ok(snapshot, "snapshot must be present");

  assert.equal(
    snapshot.baseSha,
    mock.baseSha,
    "snapshot.baseSha must equal base branch HEAD",
  );

  assert.equal(
    snapshot.stagingBranch,
    buildStagingBranchForTest(taskId),
    "snapshot.stagingBranch must match production naming",
  );

  assert.equal(
    snapshot.stagingCommitSha,
    mock.newCommitSha,
    "snapshot.stagingCommitSha must equal mock commit sha",
  );

  assert.deepEqual(
    snapshot.changedPaths.slice().sort(),
    files.map((f) => f.path).sort(),
    "snapshot.changedPaths must equal submitted paths",
  );

  assert.equal(
    mock.getBlobCount(),
    files.length,
    "each input file must produce a Git blob",
  );

  assert.deepEqual(
    mock.getCreatedTreePaths().slice().sort(),
    files.map((f) => f.path).sort(),
    "tree creation must include all expected paths",
  );

  assert.equal(
    mock.getCreatedCommitParent(),
    mock.baseSha,
    "commit parent must be the base SHA",
  );

  const contentsRequests = mock.requests.filter(
    (r) =>
      r.method === "GET" &&
      /\/contents\//.test(r.url),
  );
  assert.equal(
    contentsRequests.length,
    files.length,
    "each file must be read exactly once",
  );
  for (const req of contentsRequests) {
    assert.ok(
      req.url.includes(`?ref=${mock.newCommitSha}`),
      `Contents request must use commit sha: ${req.url}`,
    );
  }

  for (const file of files) {
    assert.equal(
      mock.fileReadCounts.get(file.path),
      1,
      `file ${file.path} must be read exactly once`,
    );
  }

  const unexpected = mock.requests.filter((r) => {
    if (/\/git\/ref\/heads\//.test(r.url)) return false;
    if (/\/git\/refs$/.test(r.url)) return false;
    if (/\/git\/blobs$/.test(r.url)) return false;
    if (/\/git\/trees$/.test(r.url)) return false;
    if (/\/git\/commits$/.test(r.url)) return false;
    if (/\/contents\//.test(r.url)) return false;
    return true;
  });
  assert.equal(
    unexpected.length,
    0,
    `unexpected requests: ${unexpected
      .map((r) => `${r.method} ${r.url}`)
      .join(", ")}`,
  );
});

// ---------------------------------------------------------------------------
// TEST 6 — Negative: 404 for one file after both written
// ---------------------------------------------------------------------------

await run("6 ATOMIC STAGING NEGATIVE 404 FILE", async () => {
  const files = [
    { path: "a.txt", content: "alpha\n" },
    { path: "b.txt", content: "beta\n" },
  ];
  const mock = createMockGitHub({
    files,
    failures: { missingFile: "b.txt" },
  });

  const result = await withMockFetch(mock, async () =>
    executeAtomicStaging({
      taskId: "C170.8.8-R4-neg-404",
      repository: "Vivi9max/AIOS-Alpha",
      baseBranch: "main",
      files,
    }),
  );

  assert.equal(result.success, false);
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_FAILED");
  assert.ok(
    typeof result.reason === "string" &&
      result.reason.includes("b.txt"),
    `reason must identify affected path: ${result.reason}`,
  );
});

// ---------------------------------------------------------------------------
// TEST 7 — Negative: HTTP 200 with missing content
// ---------------------------------------------------------------------------

await run("7 ATOMIC STAGING NEGATIVE MISSING CONTENT", async () => {
  const files = [{ path: "c.txt", content: "gamma\n" }];
  const mock = createMockGitHub({
    files,
    failures: { missingContent: "c.txt" },
  });

  const result = await withMockFetch(mock, async () =>
    executeAtomicStaging({
      taskId: "C170.8.8-R4-neg-missing-content",
      repository: "Vivi9max/AIOS-Alpha",
      baseBranch: "main",
      files,
    }),
  );

  assert.equal(result.success, false);
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_FAILED");
  assert.ok(
    typeof result.reason === "string" &&
      result.reason.length > 0,
  );
});

// ---------------------------------------------------------------------------
// TEST 8 — Negative: malformed Base64
// ---------------------------------------------------------------------------

await run("8 ATOMIC STAGING NEGATIVE MALFORMED BASE64", async () => {
  const files = [{ path: "d.txt", content: "delta\n" }];
  const mock = createMockGitHub({
    files,
    failures: { malformedBase64: "d.txt" },
  });

  const result = await withMockFetch(mock, async () =>
    executeAtomicStaging({
      taskId: "C170.8.8-R4-neg-b64",
      repository: "Vivi9max/AIOS-Alpha",
      baseBranch: "main",
      files,
    }),
  );

  assert.equal(result.success, false);
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_FAILED");
});

// ---------------------------------------------------------------------------
// TEST 9 — Negative: unsupported encoding
// ---------------------------------------------------------------------------

await run("9 ATOMIC STAGING NEGATIVE UNSUPPORTED ENCODING", async () => {
  const files = [{ path: "e.txt", content: "epsilon\n" }];
  const mock = createMockGitHub({
    files,
    failures: { unsupportedEncoding: "e.txt" },
  });

  const result = await withMockFetch(mock, async () =>
    executeAtomicStaging({
      taskId: "C170.8.8-R4-neg-encoding",
      repository: "Vivi9max/AIOS-Alpha",
      baseBranch: "main",
      files,
    }),
  );

  assert.equal(result.success, false);
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_FAILED");
});

// ---------------------------------------------------------------------------
// TEST 10 — Negative: content mismatch
// ---------------------------------------------------------------------------

await run("10 ATOMIC STAGING NEGATIVE CONTENT MISMATCH", async () => {
  const files = [{ path: "f.txt", content: "zeta\n" }];
  const mock = createMockGitHub({
    files,
    failures: { contentMismatch: "f.txt" },
  });

  const result = await withMockFetch(mock, async () =>
    executeAtomicStaging({
      taskId: "C170.8.8-R4-neg-mismatch",
      repository: "Vivi9max/AIOS-Alpha",
      baseBranch: "main",
      files,
    }),
  );

  assert.equal(result.success, false);
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_FAILED");
});

// ---------------------------------------------------------------------------
// TEST 11 — Negative: staging HEAD mismatch
// ---------------------------------------------------------------------------

await run("11 ATOMIC STAGING NEGATIVE HEAD MISMATCH", async () => {
  const files = [{ path: "g.txt", content: "eta\n" }];
  const mock = createMockGitHub({
    files,
    failures: { headMismatch: true },
  });

  const result = await withMockFetch(mock, async () =>
    executeAtomicStaging({
      taskId: "C170.8.8-R4-neg-head",
      repository: "Vivi9max/AIOS-Alpha",
      baseBranch: "main",
      files,
    }),
  );

  assert.equal(result.success, false);
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_FAILED");
});

// ---------------------------------------------------------------------------
// TEST 12 — Negative: GitHub API HTTP error
// ---------------------------------------------------------------------------

await run("12 ATOMIC STAGING NEGATIVE HTTP ERROR", async () => {
  const files = [{ path: "h.txt", content: "theta\n" }];
  const mock = createMockGitHub({
    files,
    failures: { httpError: true },
  });

  const result = await withMockFetch(mock, async () =>
    executeAtomicStaging({
      taskId: "C170.8.8-R4-neg-http",
      repository: "Vivi9max/AIOS-Alpha",
      baseBranch: "main",
      files,
    }),
  );

  assert.equal(result.success, false);
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_FAILED");
});

// ---------------------------------------------------------------------------
// TEST 13 — Negative: malformed GitHub API response
// ---------------------------------------------------------------------------

await run("13 ATOMIC STAGING NEGATIVE MALFORMED RESPONSE", async () => {
  const files = [{ path: "i.txt", content: "iota\n" }];
  const mock = createMockGitHub({
    files,
    failures: { malformedResponse: true },
  });

  const result = await withMockFetch(mock, async () =>
    executeAtomicStaging({
      taskId: "C170.8.8-R4-neg-malformed",
      repository: "Vivi9max/AIOS-Alpha",
      baseBranch: "main",
      files,
    }),
  );

  assert.equal(result.success, false);
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_FAILED");
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
