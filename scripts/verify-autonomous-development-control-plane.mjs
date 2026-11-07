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
  completeAutonomousDevelopmentTask,
} = await import(
  pathToFileURL(
    path.join(tmpDir, "control-plane.mjs"),
  ).href
);

const { buildAutonomousDevelopmentReceipt } = await import(
  pathToFileURL(
    path.join(tmpDir, "autonomous-development-receipt.mjs"),
  ).href
);

const VALID_COMMIT_SHA =
  "46700475cfb24a88299d87764381807973567c51";
const VALID_EXPECTED_SHA =
  "46700475CFB24A88299D87764381807973567C51";
const VALID_RESULT_SHA =
  "0123456789abcdef0123456789abcdef01234567";
const VALID_CHECKOUT_HEAD_SHA =
  "89abcdef0123456789abcdef0123456789abcdef";
const VALID_CHECKOUT_REF = "staging/c170.6.19";

function validEvidence(overrides = {}) {
  return {
    commitSha: VALID_COMMIT_SHA,
    expectedCommitSha: VALID_EXPECTED_SHA,
    resultCommitSha: VALID_RESULT_SHA,
    checkoutRef: VALID_CHECKOUT_REF,
    checkoutHeadSha: VALID_CHECKOUT_HEAD_SHA,
    readbackVerified: true,
    verificationPassed: true,
    ...overrides,
  };
}

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
// TEST 5 — Identity Evidence: Valid Evidence Completes
// ---------------------------------------------------------------------------

await run("5 IDENTITY EVIDENCE VALID COMPLETES", async () => {
  await resetStorage();

  const task = createAutonomousDevelopmentTask({
    objective:
      "C170.6.19 identity evidence valid fixture",
  });

  claimAutonomousDevelopmentTask(task.id);

  const evidence = validEvidence();

  completeAutonomousDevelopmentTask(task.id, evidence);

  assert.equal(
    task.status,
    "completed",
    "valid identity evidence must complete the task",
  );

  assert.equal(
    task.phase,
    "COMPLETED",
    "valid identity evidence must reach COMPLETED phase",
  );

  assert.equal(
    task.commitSha,
    VALID_COMMIT_SHA,
    "commitSha must be preserved",
  );

  assert.equal(
    task.expectedCommitSha,
    VALID_EXPECTED_SHA,
    "expectedCommitSha must be preserved",
  );

  assert.equal(
    task.resultCommitSha,
    VALID_RESULT_SHA,
    "resultCommitSha must be preserved",
  );

  assert.equal(
    task.checkoutRef,
    VALID_CHECKOUT_REF,
    "checkoutRef must be preserved",
  );

  assert.equal(
    task.checkoutHeadSha,
    VALID_CHECKOUT_HEAD_SHA,
    "checkoutHeadSha must be preserved",
  );
});

// ---------------------------------------------------------------------------
// TEST 6 — Identity Evidence: Each Missing Field Blocks
// ---------------------------------------------------------------------------

const MISSING_FIELD_CASES = [
  "commitSha",
  "expectedCommitSha",
  "resultCommitSha",
  "checkoutRef",
  "checkoutHeadSha",
];

for (const missingField of MISSING_FIELD_CASES) {
  await run(
    `6 IDENTITY EVIDENCE MISSING ${missingField.toUpperCase()} BLOCKS`,
    async () => {
      await resetStorage();

      const task = createAutonomousDevelopmentTask({
        objective: `C170.6.19 missing ${missingField} fixture`,
      });

      claimAutonomousDevelopmentTask(task.id);

      const evidence = validEvidence();
      delete evidence[missingField];

      completeAutonomousDevelopmentTask(task.id, evidence);

      assert.equal(
        task.status,
        "blocked",
        `missing ${missingField} must block completion`,
      );

      assert.equal(
        task.phase,
        "BLOCKED",
        `missing ${missingField} must reach BLOCKED phase`,
      );

      assert.ok(
        Array.isArray(task.missingEvidence),
        "missingEvidence must be an array",
      );

      assert.ok(
        task.missingEvidence.includes(missingField),
        `missingEvidence must include ${missingField}`,
      );
    },
  );
}

// ---------------------------------------------------------------------------
// TEST 7 — Identity Evidence: SHA Mismatches Block
// ---------------------------------------------------------------------------

const SHA_MISMATCH_CASES = [
  {
    name: "commitSha vs expectedCommitSha",
    overrides: {
      commitSha: VALID_RESULT_SHA,
      expectedCommitSha: VALID_COMMIT_SHA,
    },
  },
  {
    name: "commitSha vs resultCommitSha",
    overrides: {
      commitSha: VALID_COMMIT_SHA,
      resultCommitSha: VALID_EXPECTED_SHA,
    },
  },
  {
    name: "checkoutRef SHA vs checkoutHeadSha",
    overrides: {
      checkoutRef: VALID_RESULT_SHA,
      checkoutHeadSha: VALID_CHECKOUT_HEAD_SHA,
    },
  },
];

for (const mismatch of SHA_MISMATCH_CASES) {
  await run(
    `7 IDENTITY EVIDENCE MISMATCH ${mismatch.name.toUpperCase()} BLOCKS`,
    async () => {
      await resetStorage();

      const task = createAutonomousDevelopmentTask({
        objective: `C170.6.19 mismatch ${mismatch.name} fixture`,
      });

      claimAutonomousDevelopmentTask(task.id);

      completeAutonomousDevelopmentTask(
        task.id,
        validEvidence(mismatch.overrides),
      );

      assert.equal(
        task.status,
        "blocked",
        `mismatch ${mismatch.name} must block completion`,
      );

      assert.equal(
        task.phase,
        "BLOCKED",
        `mismatch ${mismatch.name} must reach BLOCKED phase`,
      );
    },
  );
}

// ---------------------------------------------------------------------------
// TEST 8 — Identity Evidence: Invalid checkoutRef Blocks
// ---------------------------------------------------------------------------

await run("8 IDENTITY EVIDENCE INVALID CHECKOUT REF BLOCKS", async () => {
  await resetStorage();

  const task = createAutonomousDevelopmentTask({
    objective:
      "C170.6.19 invalid checkoutRef fixture",
  });

  claimAutonomousDevelopmentTask(task.id);

  completeAutonomousDevelopmentTask(
    task.id,
    validEvidence({ checkoutRef: "not a valid ref!!" }),
  );

  assert.equal(
    task.status,
    "blocked",
    "invalid checkoutRef must block completion",
  );

  assert.equal(
    task.phase,
    "BLOCKED",
    "invalid checkoutRef must reach BLOCKED phase",
  );

  assert.ok(
    Array.isArray(task.missingEvidence) &&
      task.missingEvidence.includes("checkoutRef"),
    "missingEvidence must include checkoutRef",
  );
});

// ---------------------------------------------------------------------------
// TEST 9 — Missing Readback / Final Verification Blocks
// ---------------------------------------------------------------------------

await run("9 IDENTITY EVIDENCE MISSING READBACK BLOCKS", async () => {
  await resetStorage();

  const task = createAutonomousDevelopmentTask({
    objective:
      "C170.6.19 missing readback fixture",
  });

  claimAutonomousDevelopmentTask(task.id);

  completeAutonomousDevelopmentTask(
    task.id,
    validEvidence({ readbackVerified: false }),
  );

  assert.equal(
    task.status,
    "blocked",
    "readbackVerified=false must block completion",
  );

  assert.equal(
    task.phase,
    "BLOCKED",
    "readbackVerified=false must reach BLOCKED phase",
  );
});

await run("9 IDENTITY EVIDENCE MISSING FINAL VERIFICATION BLOCKS", async () => {
  await resetStorage();

  const task = createAutonomousDevelopmentTask({
    objective:
      "C170.6.19 missing final verification fixture",
  });

  claimAutonomousDevelopmentTask(task.id);

  completeAutonomousDevelopmentTask(
    task.id,
    validEvidence({ verificationPassed: false }),
  );

  assert.equal(
    task.status,
    "blocked",
    "verificationPassed=false must block completion",
  );

  assert.equal(
    task.phase,
    "BLOCKED",
    "verificationPassed=false must reach BLOCKED phase",
  );
});

// ---------------------------------------------------------------------------
// TEST 10 — Undefined / Non-String Values Do Not Throw
// ---------------------------------------------------------------------------

await run("10 IDENTITY EVIDENCE UNDEFINED VALUES DO NOT THROW", async () => {
  await resetStorage();

  const task = createAutonomousDevelopmentTask({
    objective:
      "C170.6.19 undefined evidence fixture",
  });

  claimAutonomousDevelopmentTask(task.id);

  assert.doesNotThrow(() => {
    completeAutonomousDevelopmentTask(task.id, {
      commitSha: undefined,
      expectedCommitSha: undefined,
      resultCommitSha: undefined,
      checkoutRef: undefined,
      checkoutHeadSha: undefined,
      readbackVerified: true,
      verificationPassed: true,
    });
  }, "undefined evidence values must not throw");

  assert.equal(
    task.status,
    "blocked",
    "undefined evidence must block completion",
  );

  assert.equal(
    task.phase,
    "BLOCKED",
    "undefined evidence must reach BLOCKED phase",
  );
});

await run("10 IDENTITY EVIDENCE NON-STRING VALUES DO NOT THROW", async () => {
  await resetStorage();

  const task = createAutonomousDevelopmentTask({
    objective:
      "C170.6.19 non-string evidence fixture",
  });

  claimAutonomousDevelopmentTask(task.id);

  assert.doesNotThrow(() => {
    completeAutonomousDevelopmentTask(task.id, {
      commitSha: 12345,
      expectedCommitSha: null,
      resultCommitSha: {},
      checkoutRef: [],
      checkoutHeadSha: true,
      readbackVerified: true,
      verificationPassed: true,
    });
  }, "non-string evidence values must not throw");

  assert.equal(
    task.status,
    "blocked",
    "non-string evidence must block completion",
  );

  assert.equal(
    task.phase,
    "BLOCKED",
    "non-string evidence must reach BLOCKED phase",
  );
});

// ---------------------------------------------------------------------------
// TEST 11 — Repeated Blocked Completion Remains Blocked
// ---------------------------------------------------------------------------

await run("11 IDENTITY EVIDENCE REPEATED BLOCKED STAYS BLOCKED", async () => {
  await resetStorage();

  const task = createAutonomousDevelopmentTask({
    objective:
      "C170.6.19 repeated blocked fixture",
  });

  claimAutonomousDevelopmentTask(task.id);

  completeAutonomousDevelopmentTask(task.id, {
    commitSha: VALID_COMMIT_SHA,
    expectedCommitSha: VALID_COMMIT_SHA,
    resultCommitSha: VALID_RESULT_SHA,
    checkoutRef: VALID_CHECKOUT_REF,
    checkoutHeadSha: VALID_CHECKOUT_HEAD_SHA,
    readbackVerified: true,
    verificationPassed: true,
  });

  assert.equal(
    task.status,
    "completed",
    "first valid completion must succeed",
  );

  // Now simulate a repeated completion with missing evidence — must not
  // upgrade or downgrade the terminal state silently.
  assert.doesNotThrow(() => {
    completeAutonomousDevelopmentTask(task.id, {
      readbackVerified: true,
      verificationPassed: true,
    });
  }, "repeated completion with missing evidence must not throw");

  assert.equal(
    task.status,
    "completed",
    "repeated completion must not downgrade completed state",
  );

  // Fresh blocked task: repeated blocked completion remains blocked.
  const blockedTask = createAutonomousDevelopmentTask({
    objective:
      "C170.6.19 repeated blocked fresh fixture",
  });

  claimAutonomousDevelopmentTask(blockedTask.id);

  completeAutonomousDevelopmentTask(blockedTask.id, {
    readbackVerified: true,
    verificationPassed: true,
  });

  assert.equal(
    blockedTask.status,
    "blocked",
    "first blocked completion must be blocked",
  );

  completeAutonomousDevelopmentTask(blockedTask.id, {
    readbackVerified: true,
    verificationPassed: true,
  });

  assert.equal(
    blockedTask.status,
    "blocked",
    "repeated blocked completion must remain blocked",
  );

  assert.equal(
    blockedTask.phase,
    "BLOCKED",
    "repeated blocked completion must remain BLOCKED phase",
  );
});

// ---------------------------------------------------------------------------
// TEST 12 — Persistence Hydration Retains All Five Fields
// ---------------------------------------------------------------------------

await run("12 IDENTITY EVIDENCE PERSISTENCE HYDRATION", async () => {
  await resetStorage();

  const task = createAutonomousDevelopmentTask({
    objective:
      "C170.6.19 persistence hydration fixture",
  });

  claimAutonomousDevelopmentTask(task.id);

  completeAutonomousDevelopmentTask(
    task.id,
    validEvidence(),
  );

  await persistAutonomousDevelopmentTasks();

  const hydrated =
    await listPersistentAutonomousDevelopmentTasks();

  const survivor = hydrated.find(
    (entry) => entry.id === task.id,
  );

  assert.ok(
    survivor,
    "hydrated collection must contain the fixture",
  );

  assert.equal(
    survivor.commitSha,
    VALID_COMMIT_SHA,
    "hydrated commitSha must be preserved",
  );

  assert.equal(
    survivor.expectedCommitSha,
    VALID_EXPECTED_SHA,
    "hydrated expectedCommitSha must be preserved",
  );

  assert.equal(
    survivor.resultCommitSha,
    VALID_RESULT_SHA,
    "hydrated resultCommitSha must be preserved",
  );

  assert.equal(
    survivor.checkoutRef,
    VALID_CHECKOUT_REF,
    "hydrated checkoutRef must be preserved",
  );

  assert.equal(
    survivor.checkoutHeadSha,
    VALID_CHECKOUT_HEAD_SHA,
    "hydrated checkoutHeadSha must be preserved",
  );
});

// ---------------------------------------------------------------------------
// TEST 13 — Receipt Projection Retains All Five Fields
// ---------------------------------------------------------------------------

await run("13 IDENTITY EVIDENCE RECEIPT PROJECTION", async () => {
  const receipt = buildAutonomousDevelopmentReceipt({
    taskId: "fixture-task",
    objective:
      "C170.6.19 receipt projection fixture",
    status: "completed",
    phase: "COMPLETED",
    commitSha: VALID_COMMIT_SHA,
    expectedCommitSha: VALID_EXPECTED_SHA,
    resultCommitSha: VALID_RESULT_SHA,
    checkoutRef: VALID_CHECKOUT_REF,
    checkoutHeadSha: VALID_CHECKOUT_HEAD_SHA,
    readbackVerified: true,
    verificationPassed: true,
  });

  assert.ok(receipt, "receipt must be produced");

  assert.equal(
    receipt.commitSha,
    VALID_COMMIT_SHA,
    "receipt commitSha must be preserved",
  );

  assert.equal(
    receipt.expectedCommitSha,
    VALID_EXPECTED_SHA,
    "receipt expectedCommitSha must be preserved",
  );

  assert.equal(
    receipt.resultCommitSha,
    VALID_RESULT_SHA,
    "receipt resultCommitSha must be preserved",
  );

  assert.equal(
    receipt.checkoutRef,
    VALID_CHECKOUT_REF,
    "receipt checkoutRef must be preserved",
  );

  assert.equal(
    receipt.checkoutHeadSha,
    VALID_CHECKOUT_HEAD_SHA,
    "receipt checkoutHeadSha must be preserved",
  );
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(
  "\nC170.6.19 INDEPENDENT VERIFICATION\n",
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
