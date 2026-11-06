#!/usr/bin/env node
/**
 * C169.8-D2.1 + R7 + R8 Independent Non-Destructive Verification
 *
 * Runs: node scripts/verify-autonomous-development-control-plane.mjs
 *
 * Transpiles the real production Control Plane and receipt modules, redirects
 * storage to an isolated in-memory Map, and exercises only public APIs.
 * No production storage, GitHub/Vercel API, or real task is used.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

const autonomousAgentSource = fs.readFileSync(
  path.join(REPO_ROOT, "lib/github/autonomous-development-agent.ts"),
  "utf8",
);

const repairGuardStart = "// R8_REPAIR_BASE_IDENTITY_GUARD_BEGIN";
const repairGuardEnd = "// R8_REPAIR_BASE_IDENTITY_GUARD_END";
const repairGuardStartIndex = autonomousAgentSource.indexOf(repairGuardStart);
const repairGuardEndIndex = autonomousAgentSource.indexOf(repairGuardEnd);

assert.ok(
  repairGuardStartIndex >= 0 && repairGuardEndIndex > repairGuardStartIndex,
  "Production Agent must contain the marked R8 repair identity guard",
);

const repairGuardSource = autonomousAgentSource.slice(
  repairGuardStartIndex + repairGuardStart.length,
  repairGuardEndIndex,
);

const repairGuardContext = {
  isValidGitCommitSha(value) {
    return (
      typeof value === "string" &&
      /^[0-9a-f]{40}$/i.test(value.trim())
    );
  },
};

vm.runInNewContext(
  `${repairGuardSource}
globalThis.assertRepairBaseIdentity = assertRepairBaseIdentity;`,
  repairGuardContext,
);

const assertRepairBaseIdentity =
  repairGuardContext.assertRepairBaseIdentity;

assert.equal(
  typeof assertRepairBaseIdentity,
  "function",
  "R8 production repair identity guard must be executable",
);

let ts;
try {
  ts = (await import("typescript")).default;
} catch {
  console.error("TypeScript is not installed. Run `npm install` first.");
  process.exit(1);
}

function transpile(source, fileName) {
  return ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
      isolatedModules: true,
      skipLibCheck: true,
    },
    fileName,
  }).outputText;
}

const controlPlaneSource = fs.readFileSync(
  path.join(REPO_ROOT, "lib/github/autonomous-development-control-plane.ts"),
  "utf8",
);

const receiptSource = fs.readFileSync(
  path.join(REPO_ROOT, "lib/github/autonomous-development-receipt.ts"),
  "utf8",
);

const patchedControlPlane = controlPlaneSource
  .replace(/import\s+"server-only";/, 'import "./server-only-stub.mjs";')
  .replace(/"@\/lib\/server-storage"/g, '"./server-storage-stub.mjs"')
  .replace(
    /"@\/lib\/github\/autonomous-development-receipt"/g,
    '"./autonomous-development-receipt.mjs"',
  );

const patchedReceipt = receiptSource.replace(
  /import\s+"server-only";/,
  'import "./server-only-stub.mjs";',
);

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aios-r7-verify-"));

function writeTmp(name, content) {
  fs.writeFileSync(path.join(tmpDir, name), content, "utf8");
}

writeTmp(
  "control-plane.mjs",
  transpile(patchedControlPlane, "control-plane.ts"),
);

writeTmp(
  "autonomous-development-receipt.mjs",
  transpile(patchedReceipt, "autonomous-development-receipt.ts"),
);

writeTmp("server-only-stub.mjs", "export {};\n");

writeTmp(
  "server-storage-stub.mjs",
  [
    "const data = new Map();",
    "export const storage = {",
    "  async get(key) { return data.get(key) ?? null; },",
    "  async set(key, value) { data.set(key, value); },",
    "  __clear() { data.clear(); },",
    "};",
    "",
  ].join("\n"),
);

const { storage } = await import(
  pathToFileURL(path.join(tmpDir, "server-storage-stub.mjs")).href
);

const controlPlane = await import(
  pathToFileURL(path.join(tmpDir, "control-plane.mjs")).href
);

const {
  createAutonomousDevelopmentTask,
  claimAutonomousDevelopmentTask,
  heartbeatAutonomousDevelopmentTask,
  updateAutonomousDevelopmentTask,
  listPersistentAutonomousDevelopmentTasks,
  getPersistentAutonomousDevelopmentTask,
  persistAutonomousDevelopmentTasks,
  completeAutonomousDevelopmentTask,
  completePersistentAutonomousDevelopmentTask,
} = controlPlane;

assert.equal(
  typeof getPersistentAutonomousDevelopmentTask,
  "function",
  "Production Control Plane must export getPersistentAutonomousDevelopmentTask",
);

const TASK_STORAGE_KEY = "aios:autonomous-development:tasks";

let passed = 0;
let failed = 0;

const report = [];

async function run(name, fn) {
  try {
    await fn();
    report.push(`TEST ${name}: PASS`);
    passed += 1;
  } catch (error) {
    report.push(`TEST ${name}: FAIL — ${error?.stack || error}`);
    failed += 1;
  }
}

async function resetStorage() {
  await persistAutonomousDevelopmentTasks();
  storage.__clear();
}

function createRunningTask(label) {
  const task = createAutonomousDevelopmentTask({
    objective: `R7 isolated fixture: ${label}`,
  });

  claimAutonomousDevelopmentTask(task.id);

  return task;
}

function advanceTaskToBuild(task) {
  for (const phase of [
    "PLANNING",
    "READING",
    "GENERATING",
    "WRITING",
    "READBACK",
    "BUILD",
  ]) {
    updateAutonomousDevelopmentTask(task.id, { phase });
  }

  assert.equal(task.phase, "BUILD");
}

function validEvidence() {
  const sha = "a".repeat(40);

  return {
    commitSha: sha,
    expectedCommitSha: sha,
    resultCommitSha: sha,
    checkoutRef: "refs/heads/r7-isolated-staging",
    checkoutHeadSha: sha,
    readbackVerified: true,
    verificationPassed: true,
    reason: "R7 valid evidence fixture",
  };
}

function invalidEvidenceCases() {
  return [
    {
      name: "commitSha differs from resultCommitSha",
      mutate(evidence) {
        evidence.commitSha = "b".repeat(40);
      },
    },
    {
      name: "expectedCommitSha differs from resultCommitSha",
      mutate(evidence) {
        evidence.expectedCommitSha = "b".repeat(40);
      },
    },
    {
      name: "checkoutHeadSha differs from resultCommitSha",
      mutate(evidence) {
        evidence.checkoutHeadSha = "b".repeat(40);
      },
    },
    {
      name: "required SHA is missing",
      mutate(evidence) {
        evidence.commitSha = "";
      },
    },
    {
      name: "required SHA is malformed",
      mutate(evidence) {
        evidence.resultCommitSha = "not-a-git-sha";
      },
    },
    {
      name: "readback verification is false",
      mutate(evidence) {
        evidence.readbackVerified = false;
      },
    },
    {
      name: "final verification is false",
      mutate(evidence) {
        evidence.verificationPassed = false;
      },
    },
  ];
}

function assertBlockedWithoutCompletion(receipt, task, label) {
  assert.ok(task, `${label}: task must exist`);

  assert.equal(
    task.status,
    "blocked",
    `${label}: task status must be blocked`,
  );

  assert.equal(
    task.phase,
    "BLOCKED",
    `${label}: task phase must be BLOCKED`,
  );

  assert.notEqual(
    task.status,
    "completed",
    `${label}: task must not complete`,
  );

  assert.notEqual(
    task.phase,
    "COMPLETED",
    `${label}: phase must not complete`,
  );

  assert.equal(
    receipt.status,
    "blocked",
    `${label}: receipt status must be blocked`,
  );

  assert.equal(
    receipt.successful,
    false,
    `${label}: receipt must not be successful`,
  );

  assert.equal(
    receipt.terminal,
    true,
    `${label}: blocked receipt must be terminal`,
  );
}

function assertCompletedSuccessfully(receipt, task, label) {
  assert.ok(task, `${label}: task must exist`);

  assert.equal(
    task.status,
    "completed",
    `${label}: task status must be completed`,
  );

  assert.equal(
    task.phase,
    "COMPLETED",
    `${label}: task phase must be COMPLETED`,
  );

  assert.equal(
    receipt.status,
    "completed",
    `${label}: receipt status must be completed`,
  );

  assert.equal(
    receipt.successful,
    true,
    `${label}: receipt must be successful`,
  );

  assert.equal(
    receipt.valid,
    true,
    `${label}: receipt must be valid`,
  );
}

// TEST 1 — Heartbeat Isolation
await run("1 HEARTBEAT ISOLATION", async () => {
  await resetStorage();

  const task = createRunningTask("heartbeat isolation");

  const before = {
    updatedAt: task.updatedAt,
    reason: task.reason,
    lastHeartbeatAt: task.lastHeartbeatAt,
    status: task.status,
    phase: task.phase,
  };

  await new Promise((resolve) => setTimeout(resolve, 10));

  heartbeatAutonomousDevelopmentTask(
    task.id,
    "MUST_NOT_OVERWRITE_REASON",
  );

  assert.equal(task.updatedAt, before.updatedAt);
  assert.equal(task.reason, before.reason);
  assert.notEqual(task.lastHeartbeatAt, before.lastHeartbeatAt);
  assert.equal(task.status, before.status);
  assert.equal(task.phase, before.phase);
});

// TEST 2 — Terminal State Precedence
await run("2 TERMINAL PRECEDENCE", async () => {
  await resetStorage();

  const task = createRunningTask("terminal precedence");

  await persistAutonomousDevelopmentTasks();
  storage.__clear();

  const oldTime = new Date(
    Date.now() - 3_600_000,
  ).toISOString();

  await storage.set(TASK_STORAGE_KEY, [{
    id: task.id,
    objective: task.objective,
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
    phaseHistory: [{
      phase: "BLOCKED",
      at: oldTime,
      reason: "terminal precedence fixture",
    }],
  }]);

  const hydrated = await listPersistentAutonomousDevelopmentTasks();

  const survivor = hydrated.find(
    (item) => item.id === task.id,
  );

  assert.ok(survivor, "terminal fixture must survive hydration");
  assert.equal(survivor.status, "blocked");
  assert.equal(survivor.phase, "BLOCKED");
});

// TEST 3 — Phase History Precedence + Fallback
await run("3 PHASE HISTORY PRECEDENCE", async () => {
  await resetStorage();

  const task = createRunningTask("phase history precedence");

  await persistAutonomousDevelopmentTasks();
  storage.__clear();

  const oldUpdated = new Date(
    Date.now() - 3_600_000,
  ).toISOString();

  const newerPhaseHistory = new Date(
    Date.now() + 3_600_000,
  ).toISOString();

  await storage.set(TASK_STORAGE_KEY, [{
    id: task.id,
    objective: task.objective,
    repository: "Vivi9max/AIOS-Alpha",
    branch: "main",
    targetPaths: [],
    status: "running",
    phase: "GENERATING",
    createdAt: oldUpdated,
    updatedAt: oldUpdated,
    lastHeartbeatAt: new Date().toISOString(),
    phaseHistory: [{
      phase: "GENERATING",
      at: newerPhaseHistory,
    }],
  }]);

  let hydrated = await listPersistentAutonomousDevelopmentTasks();

  let survivor = hydrated.find(
    (item) => item.id === task.id,
  );

  assert.ok(survivor);

  assert.equal(
    survivor.phaseHistory[survivor.phaseHistory.length - 1].at,
    newerPhaseHistory,
  );

  const fallbackTask = createRunningTask(
    "phase history fallback",
  );

  await persistAutonomousDevelopmentTasks();
  storage.__clear();

  const fallbackOldUpdated = new Date(
    Date.now() - 3_600_000,
  ).toISOString();

  await storage.set(TASK_STORAGE_KEY, [{
    id: fallbackTask.id,
    objective: fallbackTask.objective,
    repository: "Vivi9max/AIOS-Alpha",
    branch: "main",
    targetPaths: [],
    status: "running",
    phase: "GENERATING",
    createdAt: fallbackOldUpdated,
    updatedAt: fallbackOldUpdated,
    lastHeartbeatAt: new Date().toISOString(),
    phaseHistory: [],
  }]);

  hydrated = await listPersistentAutonomousDevelopmentTasks();

  survivor = hydrated.find(
    (item) => item.id === fallbackTask.id,
  );

  assert.ok(survivor);

  assert.equal(
    survivor.updatedAt,
    fallbackTask.updatedAt,
  );
});

// TEST 4 — Phase Transition Safety
await run("4 PHASE TRANSITION SAFETY", async () => {
  await resetStorage();

  const task = createRunningTask("phase transition safety");

  updateAutonomousDevelopmentTask(task.id, {
    phase: "PLANNING",
  });

  updateAutonomousDevelopmentTask(task.id, {
    phase: "READING",
  });

  updateAutonomousDevelopmentTask(task.id, {
    phase: "GENERATING",
  });

  assert.equal(task.phase, "GENERATING");

  assert.throws(
    () => updateAutonomousDevelopmentTask(
      task.id,
      { phase: "READBACK" },
    ),
    /Invalid autonomous development phase transition: GENERATING -> READBACK/,
  );

  updateAutonomousDevelopmentTask(task.id, {
    phase: "WRITING",
  });

  updateAutonomousDevelopmentTask(task.id, {
    phase: "READBACK",
  });

  assert.equal(task.phase, "READBACK");
});

// TEST 5 — Invalid Completion Evidence Rejected by Synchronous API
await run("5 R7 SYNC COMPLETION NEGATIVE EVIDENCE", async () => {
  for (const testCase of invalidEvidenceCases()) {
    await resetStorage();

    const task = createRunningTask(
      `sync negative: ${testCase.name}`,
    );

    advanceTaskToBuild(task);

    const evidence = validEvidence();

    testCase.mutate(evidence);

    const receipt = completeAutonomousDevelopmentTask(
      task.id,
      evidence,
    );

    assertBlockedWithoutCompletion(
      receipt,
      task,
      testCase.name,
    );
  }
});

// TEST 6 — Invalid Completion Evidence Rejected by Persistent API
await run(
  "6 R7 PERSISTENT COMPLETION NEGATIVE EVIDENCE",
  async () => {
    for (const testCase of invalidEvidenceCases()) {
      await resetStorage();

      const task = createRunningTask(
        `persistent negative: ${testCase.name}`,
      );

      advanceTaskToBuild(task);

      await persistAutonomousDevelopmentTasks();

      const evidence = validEvidence();

      testCase.mutate(evidence);

      const receipt =
        await completePersistentAutonomousDevelopmentTask(
          task.id,
          evidence,
        );

      // The persistent API hydrates the task collection.
      // The original task object is no longer authoritative.
      const persistedTask =
        await getPersistentAutonomousDevelopmentTask(
          task.id,
        );

      assertBlockedWithoutCompletion(
        receipt,
        persistedTask,
        testCase.name,
      );
    }
  },
);

// TEST 7 — Valid Evidence Accepted by Both Completion APIs
await run(
  "7 R7 VALID COMPLETION EVIDENCE POSITIVE",
  async () => {
    await resetStorage();

    const syncTask = createRunningTask("sync positive");

    advanceTaskToBuild(syncTask);

    const syncReceipt = completeAutonomousDevelopmentTask(
      syncTask.id,
      validEvidence(),
    );

    assertCompletedSuccessfully(
      syncReceipt,
      syncTask,
      "sync positive",
    );

    await resetStorage();

    const persistentTask = createRunningTask(
      "persistent positive",
    );

    advanceTaskToBuild(persistentTask);

    await persistAutonomousDevelopmentTasks();

    const persistentReceipt =
      await completePersistentAutonomousDevelopmentTask(
        persistentTask.id,
        validEvidence(),
      );

    // Re-read after persistent completion to avoid stale object references.
    const persistedTask =
      await getPersistentAutonomousDevelopmentTask(
        persistentTask.id,
      );

    assertCompletedSuccessfully(
      persistentReceipt,
      persistedTask,
      "persistent positive",
    );
  },
);

// TEST 8 — R8 Repair Base Commit Identity Guard
await run("8 R8 REPAIR BASE IDENTITY GUARD", async () => {
  const validSha = "a".repeat(40);
  const otherSha = "b".repeat(40);

  assert.doesNotThrow(() =>
    assertRepairBaseIdentity(validSha, validSha),
  );

  assert.doesNotThrow(() =>
    assertRepairBaseIdentity(validSha.toUpperCase(), validSha),
  );

  assert.throws(
    () => assertRepairBaseIdentity(validSha, otherSha),
    /AUTONOMOUS_REPAIR_BASE_IDENTITY_MISMATCH/,
  );

  assert.throws(
    () => assertRepairBaseIdentity("", validSha),
    /AUTONOMOUS_REPAIR_EXPECTED_BASE_IDENTITY_INVALID/,
  );

  assert.throws(
    () => assertRepairBaseIdentity("not-a-sha", validSha),
    /AUTONOMOUS_REPAIR_EXPECTED_BASE_IDENTITY_INVALID/,
  );

  assert.throws(
    () => assertRepairBaseIdentity(validSha, ""),
    /AUTONOMOUS_REPAIR_BASE_IDENTITY_INVALID/,
  );

  assert.throws(
    () => assertRepairBaseIdentity(validSha, "not-a-sha"),
    /AUTONOMOUS_REPAIR_BASE_IDENTITY_INVALID/,
  );

  const captureIndex = autonomousAgentSource.indexOf(
    "const expectedRepairBaseSha = latestCommitSha;",
  );
  const writeIndex = autonomousAgentSource.indexOf(
    "const repairAtomicResult = await executeAtomicStaging({",
  );
  const assertionIndex = autonomousAgentSource.indexOf(
    "assertRepairBaseIdentity(\n        expectedRepairBaseSha,\n        repairSnapshot.baseSha,\n      );",
  );
  const stagingMutationIndex = autonomousAgentSource.indexOf(
    "stagingBranch =\n        repairSnapshot.stagingBranch;",
  );
  const latestCommitMutationIndex = autonomousAgentSource.indexOf(
    "latestCommitSha =\n        repairSnapshot.stagingCommitSha;",
  );

  assert.ok(captureIndex >= 0 && captureIndex < writeIndex);
  assert.ok(writeIndex < assertionIndex);
  assert.ok(assertionIndex < stagingMutationIndex);
  assert.ok(assertionIndex < latestCommitMutationIndex);
});

// Report
console.log(
  "\nC169.8-D2.1 + R7 + R8 INDEPENDENT VERIFICATION\n",
);

for (const line of report) {
  console.log(`* ${line}`);
}

console.log(`\nTOTAL TEST GROUPS: ${passed + failed}`);
console.log(`PASSED: ${passed}`);
console.log(`FAILED: ${failed}`);
console.log(`EXIT CODE: ${failed === 0 ? 0 : 1}\n`);

try {
  fs.rmSync(tmpDir, {
    recursive: true,
    force: true,
  });
} catch {
  // Best-effort temporary directory cleanup.
}

process.exitCode = failed === 0 ? 0 : 1;
