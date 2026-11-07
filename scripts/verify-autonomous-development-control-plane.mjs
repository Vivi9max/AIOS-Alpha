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
} = await import(
  pathToFileURL(
    path.join(tmpDir, "control-plane.mjs"),
  ).href
);

const receiptModule = await import(
  pathToFileURL(
    path.join(tmpDir, "autonomous-development-receipt.mjs"),
  ).href
);

const buildAutonomousDevelopmentReceipt =
  receiptModule.buildAutonomousDevelopmentReceipt ??
  receiptModule.createAutonomousDevelopmentReceipt ??
  receiptModule.createReceipt ??
  null;

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
// TEST 5 — Receipt Identity Consistency (C170.6.16)
// ---------------------------------------------------------------------------

const VALID_A =
  "1111111111111111111111111111111111111111";
const VALID_B =
  "2222222222222222222222222222222222222222";
const VALID_C =
  "3333333333333333333333333333333333333333";
const SHORT_SHA = "abc123";

function identityFixture(overrides = {}) {
  return {
    commitSha: VALID_A,
    expectedCommitSha: VALID_A,
    resultCommitSha: VALID_A,
    checkoutRef: VALID_A,
    checkoutHeadSha: VALID_A,
    ...overrides,
  };
}

function buildReceipt(overrides) {
  assert.ok(
    typeof buildAutonomousDevelopmentReceipt ===
      "function",
    "canonical receipt builder must be exported",
  );
  return buildAutonomousDevelopmentReceipt(
    identityFixture(overrides),
  );
}

function isCompletedSuccessful(receipt) {
  return (
    receipt?.status === "completed" &&
    receipt?.successful === true &&
    receipt?.valid === true
  );
}

await run("5.1 RECEIPT ALL FIELDS CONSISTENT", async () => {
  const receipt = buildReceipt();
  assert.equal(receipt.commitSha, VALID_A);
  assert.equal(receipt.expectedCommitSha, VALID_A);
  assert.equal(receipt.resultCommitSha, VALID_A);
  assert.equal(receipt.checkoutRef, VALID_A);
  assert.equal(receipt.checkoutHeadSha, VALID_A);
  assert.equal(receipt.valid, true);
  assert.equal(receipt.successful, true);
  assert.equal(receipt.status, "completed");
});

await run("5.2 RECEIPT MISSING expectedCommitSha", async () => {
  const receipt = buildReceipt({
    expectedCommitSha: undefined,
  });
  assert.notEqual(receipt.valid, true);
  assert.equal(isCompletedSuccessful(receipt), false);
});

await run("5.3 RECEIPT MISSING checkoutRef", async () => {
  const receipt = buildReceipt({ checkoutRef: undefined });
  assert.notEqual(receipt.valid, true);
  assert.equal(isCompletedSuccessful(receipt), false);
});

await run("5.4 RECEIPT MISSING checkoutHeadSha", async () => {
  const receipt = buildReceipt({
    checkoutHeadSha: undefined,
  });
  assert.notEqual(receipt.valid, true);
  assert.equal(isCompletedSuccessful(receipt), false);
});

await run("5.5 RECEIPT SHORT OR MALFORMED SHA", async () => {
  const shortReceipt = buildReceipt({
    commitSha: SHORT_SHA,
    expectedCommitSha: SHORT_SHA,
    resultCommitSha: SHORT_SHA,
    checkoutHeadSha: SHORT_SHA,
  });
  assert.notEqual(shortReceipt.valid, true);
  assert.equal(isCompletedSuccessful(shortReceipt), false);

  const malformedReceipt = buildReceipt({
    commitSha: "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
    expectedCommitSha:
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
    resultCommitSha:
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
    checkoutHeadSha:
      "zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz",
  });
  assert.notEqual(malformedReceipt.valid, true);
  assert.equal(
    isCompletedSuccessful(malformedReceipt),
    false,
  );
});

await run("5.6 RECEIPT MISMATCHED expectedCommitSha", async () => {
  const receipt = buildReceipt({
    expectedCommitSha: VALID_B,
  });
  assert.notEqual(receipt.valid, true);
  assert.equal(isCompletedSuccessful(receipt), false);
});

await run("5.7 RECEIPT MISMATCHED resultCommitSha", async () => {
  const receipt = buildReceipt({
    resultCommitSha: VALID_B,
  });
  assert.notEqual(receipt.valid, true);
  assert.equal(isCompletedSuccessful(receipt), false);
});

await run("5.8 RECEIPT MISMATCHED checkoutHeadSha", async () => {
  const receipt = buildReceipt({
    checkoutHeadSha: VALID_B,
  });
  assert.notEqual(receipt.valid, true);
  assert.equal(isCompletedSuccessful(receipt), false);
});

await run("5.9 RECEIPT TASK/RESULT EVIDENCE CONFLICT", async () => {
  const receipt = buildReceipt({
    expectedCommitSha: VALID_B,
    resultCommitSha: VALID_C,
    checkoutHeadSha: VALID_B,
  });
  assert.notEqual(receipt.valid, true);
  assert.equal(isCompletedSuccessful(receipt), false);
});

await run("5.10 RECEIPT INVALID BRANCH REFERENCE", async () => {
  const receipt = buildReceipt({
    checkoutRef: "not-a-valid-ref",
  });
  assert.notEqual(receipt.valid, true);
  assert.equal(isCompletedSuccessful(receipt), false);

  const branchReceipt = buildReceipt({
    checkoutRef: "refs/heads/c170.6.15-r9-repair-identity-module",
  });
  assert.equal(
    branchReceipt.checkoutRef,
    "refs/heads/c170.6.15-r9-repair-identity-module",
    "branch reference must not be normalized into a commit SHA",
  );
  assert.notEqual(
    branchReceipt.commitSha,
    branchReceipt.checkoutRef,
    "branch reference must never be treated as a commit SHA",
  );
});

await run("5.11 HISTORICAL COMPLETED TASK WITHOUT EVIDENCE", async () => {
  await resetStorage();

  const historicalId = "c170-6-16-historical-fixture";
  const oldTime = new Date(
    Date.now() - 86_400_000,
  ).toISOString();

  await storage.set(TASK_STORAGE_KEY, [
    {
      id: historicalId,
      objective:
        "C170.6.16 historical completed fixture",
      repository: "Vivi9max/AIOS-Alpha",
      branch: "main",
      targetPaths: [],
      status: "completed",
      phase: "COMPLETE",
      reason: "historical fixture",
      createdAt: oldTime,
      updatedAt: oldTime,
      completedAt: oldTime,
      lastHeartbeatAt: oldTime,
      phaseHistory: [
        {
          phase: "COMPLETE",
          at: oldTime,
          reason: "historical fixture",
        },
      ],
    },
  ]);

  const hydrated =
    await listPersistentAutonomousDevelopmentTasks();

  const historical = hydrated.find(
    (task) => task.id === historicalId,
  );

  assert.ok(
    historical,
    "historical record must remain readable",
  );

  assert.equal(
    historical.status,
    "completed",
    "historical status must be preserved for reading",
  );

  const receipt = buildReceipt({
    commitSha: undefined,
    expectedCommitSha: undefined,
    resultCommitSha: undefined,
    checkoutRef: undefined,
    checkoutHeadSha: undefined,
  });

  assert.notEqual(receipt.valid, true);
  assert.equal(isCompletedSuccessful(receipt), false);
});

await run("5.12 INCOMPLETE COMPLETED RECEIPT CANNOT SUCCEED", async () => {
  const variants = [
    { expectedCommitSha: undefined },
    { checkoutRef: undefined },
    { checkoutHeadSha: undefined },
    { resultCommitSha: undefined },
    { commitSha: SHORT_SHA },
    { expectedCommitSha: VALID_B },
    { resultCommitSha: VALID_B },
    { checkoutHeadSha: VALID_B },
    { checkoutRef: "refs/heads/invalid ref" },
  ];

  for (const overrides of variants) {
    const receipt = buildReceipt(overrides);
    assert.equal(
      isCompletedSuccessful(receipt),
      false,
      `invalid evidence must not yield completed/successful/valid: ${JSON.stringify(
        overrides,
      )}`,
    );
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
