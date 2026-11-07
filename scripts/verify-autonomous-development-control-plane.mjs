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
  completePersistentAutonomousDevelopmentTask,
} = await import(
  pathToFileURL(
    path.join(tmpDir, "control-plane.mjs"),
  ).href
);

const { createAutonomousDevelopmentReceipt } =
  await import(
    pathToFileURL(
      path.join(
        tmpDir,
        "autonomous-development-receipt.mjs",
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
// TEST 5 — Completion Boundary: valid evidence
// ---------------------------------------------------------------------------

const VALID_SHA =
  "46700475cfb24a88299d87764381807973567c51";
const OTHER_SHA =
  "0123456789abcdef0123456789abcdef01234567";

function buildCompletionTask(objective) {
  const task = createAutonomousDevelopmentTask({
    objective,
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
  updateAutonomousDevelopmentTask(task.id, {
    phase: "WRITING",
  });
  updateAutonomousDevelopmentTask(task.id, {
    phase: "READBACK",
  });
  updateAutonomousDevelopmentTask(task.id, {
    phase: "VERIFYING",
  });
  return task;
}

function buildEvidence(overrides = {}) {
  return {
    commitSha: VALID_SHA,
    expectedCommitSha: VALID_SHA,
    resultCommitSha: VALID_SHA,
    checkoutRef: VALID_SHA,
    checkoutHeadSha: VALID_SHA,
    githubReadback: true,
    finalVerification: true,
    ...overrides,
  };
}

await run(
  "5 COMPLETION BOUNDARY VALID EVIDENCE",
  async () => {
    await resetStorage();

    const task = buildCompletionTask(
      "C170.6.17 completion valid evidence fixture",
    );

    const result =
      await completePersistentAutonomousDevelopmentTask(
        task.id,
        buildEvidence(),
      );

    assert.ok(result, "completion must return a result");
    assert.equal(
      result.task.status,
      "completed",
      "valid evidence must mark task completed",
    );
    assert.equal(
      result.task.phase,
      "COMPLETED",
      "valid evidence must mark phase COMPLETED",
    );
    assert.ok(
      result.receipt,
      "completion must expose a receipt",
    );
    assert.equal(
      result.receipt.valid,
      true,
      "receipt must be valid",
    );
    assert.equal(
      result.receipt.successful,
      true,
      "receipt must be successful",
    );
    assert.equal(
      result.receipt.commitSha,
      VALID_SHA,
      "receipt must expose commitSha",
    );
    assert.equal(
      result.receipt.expectedCommitSha,
      VALID_SHA,
      "receipt must expose expectedCommitSha",
    );
    assert.equal(
      result.receipt.resultCommitSha,
      VALID_SHA,
      "receipt must expose resultCommitSha",
    );
    assert.equal(
      result.receipt.checkoutRef,
      VALID_SHA,
      "receipt must expose checkoutRef",
    );
    assert.equal(
      result.receipt.checkoutHeadSha,
      VALID_SHA,
      "receipt must expose checkoutHeadSha",
    );
  },
);

// ---------------------------------------------------------------------------
// TEST 6 — Missing resultCommitSha must block
// ---------------------------------------------------------------------------

await run(
  "6 MISSING RESULT COMMIT SHA BLOCKED",
  async () => {
    await resetStorage();

    const task = buildCompletionTask(
      "C170.6.17 missing resultCommitSha fixture",
    );

    const result =
      await completePersistentAutonomousDevelopmentTask(
        task.id,
        buildEvidence({ resultCommitSha: undefined }),
      );

    assert.ok(result, "completion must return a result");
    assert.notEqual(
      result.task.status,
      "completed",
      "missing resultCommitSha must not complete",
    );
    assert.equal(
      result.task.status,
      "blocked",
      "missing resultCommitSha must block",
    );
    assert.equal(
      result.receipt.valid,
      false,
      "receipt must be invalid",
    );
    assert.equal(
      result.receipt.successful,
      false,
      "receipt must not be successful",
    );
    assert.equal(
      result.receipt.resultCommitSha,
      undefined,
      "resultCommitSha must remain missing, not fabricated",
    );
  },
);

// ---------------------------------------------------------------------------
// TEST 7 — Missing expectedCommitSha must block
// ---------------------------------------------------------------------------

await run(
  "7 MISSING EXPECTED COMMIT SHA BLOCKED",
  async () => {
    await resetStorage();

    const task = buildCompletionTask(
      "C170.6.17 missing expectedCommitSha fixture",
    );

    const result =
      await completePersistentAutonomousDevelopmentTask(
        task.id,
        buildEvidence({ expectedCommitSha: undefined }),
      );

    assert.ok(result, "completion must return a result");
    assert.equal(
      result.task.status,
      "blocked",
      "missing expectedCommitSha must block",
    );
    assert.equal(
      result.receipt.valid,
      false,
      "receipt must be invalid",
    );
  },
);

// ---------------------------------------------------------------------------
// TEST 8 — Missing checkoutRef / checkoutHeadSha must block
// ---------------------------------------------------------------------------

await run(
  "8 MISSING CHECKOUT EVIDENCE BLOCKED",
  async () => {
    await resetStorage();

    const taskA = buildCompletionTask(
      "C170.6.17 missing checkoutRef fixture",
    );

    const resultA =
      await completePersistentAutonomousDevelopmentTask(
        taskA.id,
        buildEvidence({ checkoutRef: undefined }),
      );

    assert.equal(
      resultA.task.status,
      "blocked",
      "missing checkoutRef must block",
    );

    const taskB = buildCompletionTask(
      "C170.6.17 missing checkoutHeadSha fixture",
    );

    const resultB =
      await completePersistentAutonomousDevelopmentTask(
        taskB.id,
        buildEvidence({ checkoutHeadSha: undefined }),
      );

    assert.equal(
      resultB.task.status,
      "blocked",
      "missing checkoutHeadSha must block",
    );
  },
);

// ---------------------------------------------------------------------------
// TEST 9 — Mismatched SHA values must block
// ---------------------------------------------------------------------------

await run(
  "9 MISMATCHED SHA VALUES BLOCKED",
  async () => {
    await resetStorage();

    const task = buildCompletionTask(
      "C170.6.17 mismatched SHA fixture",
    );

    const result =
      await completePersistentAutonomousDevelopmentTask(
        task.id,
        buildEvidence({ resultCommitSha: OTHER_SHA }),
      );

    assert.equal(
      result.task.status,
      "blocked",
      "mismatched SHA values must block",
    );
    assert.equal(
      result.receipt.valid,
      false,
      "receipt must be invalid",
    );
    assert.equal(
      result.receipt.successful,
      false,
      "receipt must not be successful",
    );
  },
);

// ---------------------------------------------------------------------------
// TEST 10 — Malformed SHA values must block
// ---------------------------------------------------------------------------

await run(
  "10 MALFORMED SHA VALUES BLOCKED",
  async () => {
    await resetStorage();

    const task = buildCompletionTask(
      "C170.6.17 malformed SHA fixture",
    );

    const result =
      await completePersistentAutonomousDevelopmentTask(
        task.id,
        buildEvidence({ commitSha: "not-a-sha" }),
      );

    assert.equal(
      result.task.status,
      "blocked",
      "malformed SHA values must block",
    );
    assert.equal(
      result.receipt.valid,
      false,
      "receipt must be invalid",
    );
  },
);

// ---------------------------------------------------------------------------
// TEST 11 — Invalid Git branch refs must block
// ---------------------------------------------------------------------------

await run(
  "11 INVALID GIT REFS BLOCKED",
  async () => {
    await resetStorage();

    const invalidRefs = [
      "refs/heads/bad ref",
      "refs/heads/bad..ref",
      "refs/heads/bad~ref",
      "refs/heads/bad^ref",
      "refs/heads/bad:ref",
      "refs/heads/bad?ref",
      "refs/heads/bad*ref",
      "refs/heads/bad[ref",
      "refs/heads/bad\\ref",
      "refs/heads/bad\u0001ref",
      "refs/heads/.hidden",
      "refs/heads/trailing.",
      "refs/heads/trailing.lock",
    ];

    for (const badRef of invalidRefs) {
      const task = buildCompletionTask(
        `C170.6.17 invalid ref fixture ${badRef}`,
      );

      const result =
        await completePersistentAutonomousDevelopmentTask(
          task.id,
          buildEvidence({ checkoutRef: badRef }),
        );

      assert.equal(
        result.task.status,
        "blocked",
        `invalid ref ${badRef} must block`,
      );
    }
  },
);

// ---------------------------------------------------------------------------
// TEST 12 — Valid refs/heads/... remains a branch ref
// ---------------------------------------------------------------------------

await run(
  "12 VALID BRANCH REF PRESERVED",
  async () => {
    await resetStorage();

    const task = buildCompletionTask(
      "C170.6.17 valid branch ref fixture",
    );

    const result =
      await completePersistentAutonomousDevelopmentTask(
        task.id,
        buildEvidence({
          checkoutRef: "refs/heads/c169-8-ad-repair",
        }),
      );

    assert.ok(result, "completion must return a result");
    assert.equal(
      result.task.status,
      "completed",
      "valid branch ref must complete",
    );
    assert.equal(
      result.receipt.checkoutRef,
      "refs/heads/c169-8-ad-repair",
      "checkoutRef must remain a branch ref, never a SHA",
    );
    assert.equal(
      result.receipt.valid,
      true,
      "receipt must be valid",
    );
  },
);

// ---------------------------------------------------------------------------
// TEST 13 — Historical completed record with missing evidence
// ---------------------------------------------------------------------------

await run(
  "13 HISTORICAL RECORD READABLE, RECEIPT INVALID",
  async () => {
    await resetStorage();

    const oldTime = new Date(
      Date.now() - 86_400_000,
    ).toISOString();

    const historical = {
      id: "historical-fixture",
      objective:
        "C170.6.17 historical completed fixture",
      repository: "Vivi9max/AIOS-Alpha",
      branch: "main",
      targetPaths: [],
      status: "completed",
      phase: "COMPLETED",
      reason: "historical completion",
      createdAt: oldTime,
      updatedAt: oldTime,
      completedAt: oldTime,
      lastHeartbeatAt: oldTime,
      phaseHistory: [
        {
          phase: "COMPLETED",
          at: oldTime,
          reason: "historical completion",
        },
      ],
    };

    await storage.set(TASK_STORAGE_KEY, [
      historical,
    ]);

    const hydrated =
      await listPersistentAutonomousDevelopmentTasks();

    const survivor = hydrated.find(
      (task) => task.id === "historical-fixture",
    );

    assert.ok(
      survivor,
      "historical record must remain readable",
    );
    assert.equal(
      survivor.status,
      "completed",
      "historical status preserved",
    );

    const receipt =
      createAutonomousDevelopmentReceipt({
        taskId: survivor.id,
        objective: survivor.objective,
        repository: survivor.repository,
        branch: survivor.branch,
      });

    assert.equal(
      receipt.valid,
      false,
      "missing identity evidence cannot produce a valid receipt",
    );
    assert.equal(
      receipt.successful,
      false,
      "missing identity evidence cannot produce a successful receipt",
    );
  },
);

// ---------------------------------------------------------------------------
// TEST 14 — Repeated completion calls on invalid terminal receipt
// ---------------------------------------------------------------------------

await run(
  "14 REPEATED COMPLETION STAYS INVALID",
  async () => {
    await resetStorage();

    const task = buildCompletionTask(
      "C170.6.17 repeated completion fixture",
    );

    const first =
      await completePersistentAutonomousDevelopmentTask(
        task.id,
        buildEvidence({ resultCommitSha: undefined }),
      );

    assert.equal(
      first.task.status,
      "blocked",
      "first completion with missing evidence must block",
    );

    const second =
      await completePersistentAutonomousDevelopmentTask(
        task.id,
        buildEvidence({ resultCommitSha: undefined }),
      );

    assert.equal(
      second.task.status,
      "blocked",
      "repeated completion must not turn invalid into success",
    );
    assert.equal(
      second.receipt.valid,
      false,
      "repeated completion receipt must remain invalid",
    );
    assert.equal(
      second.receipt.successful,
      false,
      "repeated completion receipt must remain unsuccessful",
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
