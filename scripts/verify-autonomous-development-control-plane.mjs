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
// C170.8.8-B — Exact GitHub File Readback Gate
// ---------------------------------------------------------------------------

const ATOMIC_REPOSITORY = "Vivi9max/AIOS-Alpha";
const ATOMIC_BASE_BRANCH = "main";
const ATOMIC_BASE_SHA = "8558a632b7c122b9572822b18fc23494cc97f693";
const ATOMIC_TREE_SHA = "1111111111111111111111111111111111111111";
const ATOMIC_COMMIT_SHA = "2222222222222222222222222222222222222222";
const ATOMIC_STAGING_BRANCH = "aios-c170-8-8-b-staging";

function encodeContent(content) {
  return Buffer.from(content, "utf8").toString("base64");
}

function buildFile(pathname, content) {
  return {
    path: pathname,
    content,
    mode: "100644",
  };
}

function makeJsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return JSON.stringify(body);
    },
  };
}

function makeContentsResponse(pathname, content, encoding) {
  const encoded = encoding === undefined ? "base64" : encoding;
  const body = {
    type: "file",
    path: pathname,
    sha: ATOMIC_COMMIT_SHA,
  };
  if (encoded !== null) {
    body.encoding = encoded;
  }
  if (content !== null) {
    body.content = content;
  }
  return makeJsonResponse(200, body);
}

function installFetchStub(handler) {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : String(input);
    calls.push({ url, init });
    return handler(url, init, calls);
  };
  return {
    calls,
    restore() {
      globalThis.fetch = originalFetch;
    },
  };
}

function installBridgeConfigStub() {
  const key = "AIOS_GITHUB_BRIDGE_CONFIG";
  const previous = globalThis[key];
  globalThis[key] = {
    token: "test-token",
    owner: "Vivi9max",
    repo: "AIOS-Alpha",
    branch: ATOMIC_BASE_BRANCH,
  };
  return {
    restore() {
      if (previous === undefined) {
        delete globalThis[key];
      } else {
        globalThis[key] = previous;
      }
    },
  };
}

async function withAtomicHarness(fn) {
  const bridgeStub = installBridgeConfigStub();
  try {
    await fn();
  } finally {
    bridgeStub.restore();
  }
}

function baseHandler({ stagingHead, fileResponses }) {
  return (url) => {
    if (url.includes("/git/ref/heads/")) {
      return makeJsonResponse(200, {
        object: { sha: ATOMIC_BASE_SHA },
      });
    }
    if (url.includes("/git/commits/")) {
      return makeJsonResponse(200, {
        sha: ATOMIC_BASE_SHA,
        tree: { sha: ATOMIC_TREE_SHA },
      });
    }
    if (url.includes("/git/trees")) {
      return makeJsonResponse(200, {
        sha: ATOMIC_TREE_SHA,
      });
    }
    if (url.includes("/git/commits") && !url.includes("/git/commits/")) {
      return makeJsonResponse(201, {
        sha: ATOMIC_COMMIT_SHA,
        tree: { sha: ATOMIC_TREE_SHA },
      });
    }
    if (url.includes("/git/refs")) {
      return makeJsonResponse(201, {
        ref: `refs/heads/${ATOMIC_STAGING_BRANCH}`,
        object: { sha: ATOMIC_COMMIT_SHA },
      });
    }
    if (url.includes(`/git/ref/heads/${ATOMIC_STAGING_BRANCH}`)) {
      return makeJsonResponse(200, {
        object: { sha: stagingHead },
      });
    }
    if (url.includes("/contents/")) {
      const decoded = decodeURIComponent(
        url.split("/contents/")[1].split("?")[0],
      );
      const response = fileResponses[decoded];
      if (response) {
        return response;
      }
      return makeJsonResponse(404, { message: "Not Found" });
    }
    return makeJsonResponse(400, { message: `unexpected url ${url}` });
  };
}

await run("5 EXACT MULTI-FILE READBACK SUCCEEDS", async () => {
  await withAtomicHarness(async () => {
    const files = [
      buildFile("lib/a.ts", "export const a = 1;\n"),
      buildFile("lib/b.ts", "export const b = 2;\n"),
    ];
    const stub = installFetchStub(
      baseHandler({
        stagingHead: ATOMIC_COMMIT_SHA,
        fileResponses: {
          "lib/a.ts": makeContentsResponse(
            "lib/a.ts",
            encodeContent(files[0].content),
          ),
          "lib/b.ts": makeContentsResponse(
            "lib/b.ts",
            encodeContent(files[1].content),
          ),
        },
      }),
    );
    try {
      const result = await executeAtomicStaging({
        repository: ATOMIC_REPOSITORY,
        baseBranch: ATOMIC_BASE_BRANCH,
        expectedBaseSha: ATOMIC_BASE_SHA,
        stagingBranch: ATOMIC_STAGING_BRANCH,
        files,
      });
      assert.equal(result.success, true, "expected success");
      assert.equal(result.stagingCommitSha, ATOMIC_COMMIT_SHA);
      assert.ok(result.snapshot, "expected snapshot");
    } finally {
      stub.restore();
    }
  });
});

await run("6 CONTENT MISMATCH BLOCKS OPERATION", async () => {
  await withAtomicHarness(async () => {
    const files = [
      buildFile("lib/a.ts", "export const a = 1;\n"),
      buildFile("lib/b.ts", "export const b = 2;\n"),
    ];
    const stub = installFetchStub(
      baseHandler({
        stagingHead: ATOMIC_COMMIT_SHA,
        fileResponses: {
          "lib/a.ts": makeContentsResponse(
            "lib/a.ts",
            encodeContent(files[0].content),
          ),
          "lib/b.ts": makeContentsResponse(
            "lib/b.ts",
            encodeContent("export const b = 999;\n"),
          ),
        },
      }),
    );
    try {
      const result = await executeAtomicStaging({
        repository: ATOMIC_REPOSITORY,
        baseBranch: ATOMIC_BASE_BRANCH,
        expectedBaseSha: ATOMIC_BASE_SHA,
        stagingBranch: ATOMIC_STAGING_BRANCH,
        files,
      });
      assert.equal(result.success, false, "expected failure");
      assert.equal(result.snapshot, undefined, "no snapshot on failure");
      assert.match(
        String(result.reason || ""),
        /lib\/b\.ts/,
        "reason must reference affected path",
      );
    } finally {
      stub.restore();
    }
  });
});

await run("7 MISSING FILE 404 BLOCKS OPERATION", async () => {
  await withAtomicHarness(async () => {
    const files = [
      buildFile("lib/a.ts", "export const a = 1;\n"),
      buildFile("lib/b.ts", "export const b = 2;\n"),
    ];
    const stub = installFetchStub(
      baseHandler({
        stagingHead: ATOMIC_COMMIT_SHA,
        fileResponses: {
          "lib/a.ts": makeContentsResponse(
            "lib/a.ts",
            encodeContent(files[0].content),
          ),
        },
      }),
    );
    try {
      const result = await executeAtomicStaging({
        repository: ATOMIC_REPOSITORY,
        baseBranch: ATOMIC_BASE_BRANCH,
        expectedBaseSha: ATOMIC_BASE_SHA,
        stagingBranch: ATOMIC_STAGING_BRANCH,
        files,
      });
      assert.equal(result.success, false, "expected failure");
      assert.equal(result.snapshot, undefined, "no snapshot on failure");
      assert.match(
        String(result.reason || ""),
        /lib\/b\.ts/,
        "reason must reference affected path",
      );
    } finally {
      stub.restore();
    }
  });
});

await run("8 MALFORMED RESPONSE BLOCKS OPERATION", async () => {
  await withAtomicHarness(async () => {
    const files = [
      buildFile("lib/a.ts", "export const a = 1;\n"),
    ];
    const stub = installFetchStub(
      baseHandler({
        stagingHead: ATOMIC_COMMIT_SHA,
        fileResponses: {
          "lib/a.ts": makeContentsResponse("lib/a.ts", null),
        },
      }),
    );
    try {
      const result = await executeAtomicStaging({
        repository: ATOMIC_REPOSITORY,
        baseBranch: ATOMIC_BASE_BRANCH,
        expectedBaseSha: ATOMIC_BASE_SHA,
        stagingBranch: ATOMIC_STAGING_BRANCH,
        files,
      });
      assert.equal(result.success, false, "expected failure");
      assert.equal(result.snapshot, undefined, "no snapshot on failure");
      assert.match(
        String(result.reason || ""),
        /lib\/a\.ts/,
        "reason must reference affected path",
      );
    } finally {
      stub.restore();
    }
  });
});

await run("9 STAGING HEAD MISMATCH BLOCKS OPERATION", async () => {
  await withAtomicHarness(async () => {
    const files = [
      buildFile("lib/a.ts", "export const a = 1;\n"),
    ];
    const stub = installFetchStub(
      baseHandler({
        stagingHead: "ffffffffffffffffffffffffffffffffffffffff",
        fileResponses: {
          "lib/a.ts": makeContentsResponse(
            "lib/a.ts",
            encodeContent(files[0].content),
          ),
        },
      }),
    );
    try {
      const result = await executeAtomicStaging({
        repository: ATOMIC_REPOSITORY,
        baseBranch: ATOMIC_BASE_BRANCH,
        expectedBaseSha: ATOMIC_BASE_SHA,
        stagingBranch: ATOMIC_STAGING_BRANCH,
        files,
      });
      assert.equal(result.success, false, "expected failure");
      assert.equal(result.snapshot, undefined, "no snapshot on failure");
      assert.match(
        String(result.reason || ""),
        /HEAD|head|mismatch/i,
        "reason must reference HEAD verification failure",
      );
    } finally {
      stub.restore();
    }
  });
});

await run("10 EVERY CHANGED FILE IS INDEPENDENTLY REQUESTED", async () => {
  await withAtomicHarness(async () => {
    const files = [
      buildFile("lib/a.ts", "export const a = 1;\n"),
      buildFile("lib/b.ts", "export const b = 2;\n"),
      buildFile("lib/c.ts", "export const c = 3;\n"),
    ];
    const stub = installFetchStub(
      baseHandler({
        stagingHead: ATOMIC_COMMIT_SHA,
        fileResponses: {
          "lib/a.ts": makeContentsResponse(
            "lib/a.ts",
            encodeContent(files[0].content),
          ),
          "lib/b.ts": makeContentsResponse(
            "lib/b.ts",
            encodeContent(files[1].content),
          ),
          "lib/c.ts": makeContentsResponse(
            "lib/c.ts",
            encodeContent(files[2].content),
          ),
        },
      }),
    );
    try {
      const result = await executeAtomicStaging({
        repository: ATOMIC_REPOSITORY,
        baseBranch: ATOMIC_BASE_BRANCH,
        expectedBaseSha: ATOMIC_BASE_SHA,
        stagingBranch: ATOMIC_STAGING_BRANCH,
        files,
      });
      assert.equal(result.success, true, "expected success");
      for (const file of files) {
        const requested = stub.calls.some((call) =>
          call.url.includes(
            `/contents/${encodeURIComponent(file.path).replace(/%2F/g, "/")}`,
          ),
        );
        assert.ok(
          requested,
          `expected independent readback for ${file.path}`,
        );
      }
    } finally {
      stub.restore();
    }
  });
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(
  "\nC170.8.8-B INDEPENDENT VERIFICATION\n",
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
