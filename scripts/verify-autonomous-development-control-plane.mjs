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
    '"./bridge-stub.mjs"',
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
  "server-only-stub.mjs",
  "export {};\n",
);

writeTmp(
  "atomic-executor.mjs",
  transpile(patchedAtomicExecutor, "atomic-executor.ts"),
);

writeTmp(
  "bridge-stub.mjs",
  [
    "const bridgeFixture = {",
    "  token: \"fixture-value\",",
    "  owner: \"Vivi9max\",",
    "  repo: \"AIOS-Alpha\",",
    "};",
    "",
    "export function getGitHubBridgeConfig() {",
    "  return {",
    "    owner: bridgeFixture.owner,",
    "    repo: bridgeFixture.repo,",
    "    baseBranch: \"main\",",
    "  };",
    "}",
    "",
    "export function resolveGitHubBridgeAuth() {",
    "  return {",
    "    token: bridgeFixture.token,",
    "    mode: \"fixture\",",
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

const {
  executeAtomicStaging,
} = await import(
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
// Atomic staging executor fixtures
// ---------------------------------------------------------------------------

const BASE_SHA = "1111111111111111111111111111111111111111";
const BASE_TREE_SHA = "2222222222222222222222222222222222222222";
const BLOB_SHA_1 = "3333333333333333333333333333333333333333";
const BLOB_SHA_2 = "4444444444444444444444444444444444444444";
const NEW_TREE_SHA = "5555555555555555555555555555555555555555";
const COMMIT_SHA = "6666666666666666666666666666666666666666";
const STAGING_BRANCH = "c169-8-ad-ad-1794854487188-z8m134";

const FIXTURE_FILE_1 = {
  path: "lib/github/autonomous-development-atomic-executor.ts",
  content: "export const a = 1;\n",
};

const FIXTURE_FILE_2 = {
  path: "scripts/verify-autonomous-development-control-plane.mjs",
  content: "console.log(\"fixture\");\n",
};

function toBase64Utf8(text) {
  return Buffer.from(text, "utf8").toString("base64");
}

function buildContentsBody(file, overrides = {}) {
  return {
    type: "file",
    path: file.path,
    encoding: "base64",
    content: toBase64Utf8(file.content),
    sha: BLOB_SHA_1,
    ...overrides,
  };
}

function jsonResponse(status, body) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return body;
    },
    async text() {
      return typeof body === "string"
        ? body
        : JSON.stringify(body);
    },
  };
}

function installFetchMock(handler) {
  const original = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (input, init) => {
    const url =
      typeof input === "string"
        ? input
        : input && input.url
          ? input.url
          : String(input);
    const method =
      (init && init.method) ||
      (input && input.method) ||
      "GET";
    const call = { url, method, init };
    calls.push(call);
    return handler(call);
  };
  return {
    calls,
    restore() {
      globalThis.fetch = original;
    },
  };
}

function defaultAtomicHandler(state) {
  return async (call) => {
    const { url, method } = call;

    // Base branch SHA read
    if (
      method === "GET" &&
      /\/git\/ref\/heads\/main$/.test(url)
    ) {
      return jsonResponse(200, {
        ref: "refs/heads/main",
        object: { sha: BASE_SHA, type: "commit" },
      });
    }

    // Base commit read
    if (
      method === "GET" &&
      /\/git\/commits\/[0-9a-f]{40}$/.test(url) &&
      url.includes(BASE_SHA)
    ) {
      return jsonResponse(200, {
        sha: BASE_SHA,
        tree: { sha: BASE_TREE_SHA },
      });
    }

    // Blob creation
    if (method === "POST" && /\/git\/blobs$/.test(url)) {
      const body =
        call.init && call.init.body
          ? JSON.parse(call.init.body)
          : {};
      const sha =
        body.content ===
        toBase64Utf8(FIXTURE_FILE_1.content)
          ? BLOB_SHA_1
          : BLOB_SHA_2;
      return jsonResponse(201, { sha });
    }

    // Tree creation
    if (method === "POST" && /\/git\/trees$/.test(url)) {
      return jsonResponse(201, { sha: NEW_TREE_SHA });
    }

    // Commit creation
    if (method === "POST" && /\/git\/commits$/.test(url)) {
      return jsonResponse(201, { sha: COMMIT_SHA });
    }

    // Staging branch creation
    if (method === "POST" && /\/git\/refs$/.test(url)) {
      return jsonResponse(201, {
        ref: `refs/heads/${STAGING_BRANCH}`,
        object: { sha: COMMIT_SHA },
      });
    }

    // Staging branch HEAD read
    if (
      method === "GET" &&
      url.includes(
        `/git/ref/heads/${STAGING_BRANCH}`,
      )
    ) {
      return jsonResponse(200, {
        ref: `refs/heads/${STAGING_BRANCH}`,
        object: {
          sha: state.stagingHead || COMMIT_SHA,
          type: "commit",
        },
      });
    }

    // Contents API readback
    if (method === "GET" && /\/contents\//.test(url)) {
      const requestedPath = decodeURIComponent(
        url.split("/contents/")[1].split("?")[0],
      );
      const file =
        requestedPath === FIXTURE_FILE_1.path
          ? FIXTURE_FILE_1
          : requestedPath === FIXTURE_FILE_2.path
            ? FIXTURE_FILE_2
            : null;

      if (!file) {
        return jsonResponse(404, {
          message: "Not Found",
        });
      }

      if (state.contentsOverride) {
        const overridden = state.contentsOverride(
          file,
          requestedPath,
        );
        if (overridden) {
          return overridden;
        }
      }

      return jsonResponse(200, buildContentsBody(file));
    }

    return jsonResponse(404, {
      message: `Unhandled mock route: ${method} ${url}`,
    });
  };
}

function assertContentsUsesStagingSha(calls) {
  const contentsCalls = calls.filter((call) =>
    /\/contents\//.test(call.url),
  );
  assert.ok(
    contentsCalls.length > 0,
    "expected at least one Contents API call",
  );
  for (const call of contentsCalls) {
    assert.ok(
      call.url.includes(
        `ref=${encodeURIComponent(COMMIT_SHA)}`,
      ) ||
        call.url.includes(`ref=${COMMIT_SHA}`),
      `Contents API must use exact staging commit SHA: ${call.url}`,
    );
    assert.ok(
      !call.url.includes("ref=main"),
      `Contents API must not use mutable branch name: ${call.url}`,
    );
    assert.ok(
      !call.url.includes(
        `ref=${encodeURIComponent(STAGING_BRANCH)}`,
      ) &&
        !call.url.includes(`ref=${STAGING_BRANCH}`),
      `Contents API must not use staging branch name: ${call.url}`,
    );
  }
}

function buildAtomicInput() {
  return {
    repository: "Vivi9max/AIOS-Alpha",
    baseBranch: "main",
    stagingBranch: STAGING_BRANCH,
    commitMessage: "C170.8.8-B R8 atomic staging fixture",
    files: [FIXTURE_FILE_1, FIXTURE_FILE_2],
  };
}

// ---------------------------------------------------------------------------
// TEST 5 — Atomic Executor Positive Case
// ---------------------------------------------------------------------------

await run("5 ATOMIC EXECUTOR POSITIVE", async () => {
  const state = { stagingHead: COMMIT_SHA };
  const mock = installFetchMock(defaultAtomicHandler(state));

  try {
    const result = await executeAtomicStaging(buildAtomicInput());

    assert.ok(result, "result must be defined");
    assert.equal(
      result.ok,
      true,
      `positive case must succeed: ${JSON.stringify(result)}`,
    );
    assert.equal(
      result.status,
      "AIOS_ATOMIC_STAGING_READY",
      "result must report AIOS_ATOMIC_STAGING_READY",
    );
    assert.equal(
      result.stagingCommitSha,
      COMMIT_SHA,
      "result must report exact staging commit SHA",
    );
    assert.equal(
      result.stagingBranch,
      STAGING_BRANCH,
      "result must report exact staging branch",
    );
    assert.deepEqual(
      result.files.map((f) => f.path).sort(),
      [FIXTURE_FILE_1.path, FIXTURE_FILE_2.path].sort(),
      "result must report every submitted file",
    );
    assertContentsUsesStagingSha(mock.calls);
  } finally {
    mock.restore();
  }
});

// ---------------------------------------------------------------------------
// TEST 6 — Atomic Executor Negative Cases
// ---------------------------------------------------------------------------

async function runNegative(name, mutateHandler, mutateState) {
  await run(`6 NEGATIVE ${name}`, async () => {
    const state = { stagingHead: COMMIT_SHA };
    if (mutateState) {
      mutateState(state);
    }
    const baseHandler = defaultAtomicHandler(state);
    const mock = installFetchMock(mutateHandler(baseHandler, state));

    try {
      const result = await executeAtomicStaging(buildAtomicInput());
      assert.ok(result, "result must be defined");
      assert.notEqual(
        result.ok,
        true,
        `negative case (${name}) must not report success`,
      );
      assert.notEqual(
        result.status,
        "AIOS_ATOMIC_STAGING_READY",
        `negative case (${name}) must not report AIOS_ATOMIC_STAGING_READY`,
      );
    } finally {
      mock.restore();
    }
  });
}

await runNegative(
  "CONTENTS_404",
  (handler) => async (call) => {
    if (/\/contents\//.test(call.url)) {
      return jsonResponse(404, { message: "Not Found" });
    }
    return handler(call);
  },
);

await runNegative(
  "CONTENTS_INVALID_TYPE",
  (handler) => async (call) => {
    if (/\/contents\//.test(call.url)) {
      return jsonResponse(200, {
        type: "directory",
        path: FIXTURE_FILE_1.path,
        encoding: "base64",
        content: toBase64Utf8(FIXTURE_FILE_1.content),
        sha: BLOB_SHA_1,
      });
    }
    return handler(call);
  },
);

await runNegative(
  "CONTENTS_PATH_MISMATCH",
  (handler) => async (call) => {
    if (/\/contents\//.test(call.url)) {
      return jsonResponse(200, {
        type: "file",
        path: "some/other/path.ts",
        encoding: "base64",
        content: toBase64Utf8(FIXTURE_FILE_1.content),
        sha: BLOB_SHA_1,
      });
    }
    return handler(call);
  },
);

await runNegative(
  "CONTENTS_ENCODING_NOT_BASE64",
  (handler) => async (call) => {
    if (/\/contents\//.test(call.url)) {
      return jsonResponse(200, {
        type: "file",
        path: FIXTURE_FILE_1.path,
        encoding: "utf-8",
        content: FIXTURE_FILE_1.content,
        sha: BLOB_SHA_1,
      });
    }
    return handler(call);
  },
);

await runNegative(
  "CONTENTS_BASE64_MALFORMED",
  (handler) => async (call) => {
    if (/\/contents\//.test(call.url)) {
      return jsonResponse(200, {
        type: "file",
        path: FIXTURE_FILE_1.path,
        encoding: "base64",
        content: "!!!not-base64!!!",
        sha: BLOB_SHA_1,
      });
    }
    return handler(call);
  },
);

await runNegative(
  "CONTENTS_UTF8_INVALID",
  (handler) => async (call) => {
    if (/\/contents\//.test(call.url)) {
      return jsonResponse(200, {
        type: "file",
        path: FIXTURE_FILE_1.path,
        encoding: "base64",
        content: Buffer.from([0xff, 0xfe, 0xfd]).toString(
          "base64",
        ),
        sha: BLOB_SHA_1,
      });
    }
    return handler(call);
  },
);

await runNegative(
  "CONTENTS_DECODED_MISMATCH",
  (handler) => async (call) => {
    if (/\/contents\//.test(call.url)) {
      return jsonResponse(200, {
        type: "file",
        path: FIXTURE_FILE_1.path,
        encoding: "base64",
        content: toBase64Utf8("tampered content\n"),
        sha: BLOB_SHA_1,
      });
    }
    return handler(call);
  },
);

await runNegative(
  "STAGING_HEAD_CHANGED_BEFORE_READBACK",
  (handler, state) => async (call) => {
    if (
      call.method === "GET" &&
      call.url.includes(
        `/git/ref/heads/${STAGING_BRANCH}`,
      )
    ) {
      const current = state.stagingHead;
      state.stagingHead = "9999999999999999999999999999999999999999";
      return jsonResponse(200, {
        ref: `refs/heads/${STAGING_BRANCH}`,
        object: { sha: state.stagingHead, type: "commit" },
      });
    }
    return handler(call);
  },
  (state) => {
    state.stagingHead = COMMIT_SHA;
  },
);

await runNegative(
  "STAGING_HEAD_CHANGED_AFTER_READBACK",
  (handler, state) => {
    let headReads = 0;
    return async (call) => {
      if (
        call.method === "GET" &&
        call.url.includes(
          `/git/ref/heads/${STAGING_BRANCH}`,
        )
      ) {
        headReads += 1;
        const sha =
          headReads >= 2
            ? "9999999999999999999999999999999999999999"
            : state.stagingHead;
        return jsonResponse(200, {
          ref: `refs/heads/${STAGING_BRANCH}`,
          object: { sha, type: "commit" },
        });
      }
      return handler(call);
    };
  },
);

await run("6 NEGATIVE INVALID_FILE_PATH", async () => {
  const mock = installFetchMock(async () => {
    throw new Error(
      "fetch must not be called for invalid file paths",
    );
  });
  try {
    const result = await executeAtomicStaging({
      repository: "Vivi9max/AIOS-Alpha",
      baseBranch: "main",
      stagingBranch: STAGING_BRANCH,
      commitMessage: "invalid path fixture",
      files: [
        {
          path: "../escape.ts",
          content: "export const x = 1;\n",
        },
      ],
    });
    assert.ok(result, "result must be defined");
    assert.notEqual(
      result.ok,
      true,
      "invalid file path must not report success",
    );
  } finally {
    mock.restore();
  }
  assert.equal(
    mock.calls.length,
    0,
    "no GitHub API request may occur for invalid file paths",
  );
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
