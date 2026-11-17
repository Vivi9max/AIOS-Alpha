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
    /"@\/lib\/github\/autonomous-development-control-plane"/g,
    '"./control-plane.mjs"',
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
// Atomic staging harness
// ---------------------------------------------------------------------------

const BASE_SHA =
  "8558a632b7c122b9572822b18fc23494cc97f693";
const REPOSITORY = "Vivi9max/AIOS-Alpha";
const BASE_BRANCH = "main";
const STAGING_BRANCH =
  "c169-8-ad-ad-1794918114384-7lr16s";
const TREE_SHA =
  "1111111111111111111111111111111111111111";
const STAGING_COMMIT_SHA =
  "2222222222222222222222222222222222222222";

function encodeBase64(text) {
  return Buffer.from(text, "utf8").toString("base64");
}

function decodeBase64Strict(value) {
  return Buffer.from(value, "base64").toString("utf8");
}

function createMockFetch(handlers) {
  const calls = [];
  const unexpected = [];

  async function mockFetch(url, init) {
    const method = (init && init.method) || "GET";
    const entry = { url: String(url), method, init };
    calls.push(entry);

    for (const handler of handlers) {
      if (handler.match(entry)) {
        return handler.respond(entry);
      }
    }

    unexpected.push(entry);
    throw new Error(
      `Unexpected mock request: ${method} ${url}`,
    );
  }

  return {
    fetch: mockFetch,
    calls,
    unexpected,
    count(method, urlPredicate) {
      return calls.filter(
        (c) =>
          c.method === method &&
          urlPredicate(c.url),
      ).length;
    },
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
      return JSON.stringify(body);
    },
  };
}

function textResponse(status, text) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return JSON.parse(text);
    },
    async text() {
      return text;
    },
  };
}

const FIXTURE_FILES = [
  {
    path: "app/example/page.tsx",
    content: "export default function Page() {\n  return <div>Hello</div>;\n}\n",
  },
  {
    path: "lib/example/unicode.ts",
    content: "export const greeting = \"héllo wörld 你好 🌍\";\n",
  },
];

function buildHappyHandlers() {
  return [
    {
      match: (c) =>
        c.method === "GET" &&
        c.url.includes(`/git/ref/heads/${BASE_BRANCH}`),
      respond: () =>
        jsonResponse(200, {
          object: { sha: BASE_SHA },
        }),
    },
    {
      match: (c) =>
        c.method === "GET" &&
        c.url.includes(`/git/ref/heads/${STAGING_BRANCH}`),
      respond: () =>
        textResponse(404, "Not Found"),
    },
    {
      match: (c) =>
        c.method === "POST" &&
        c.url.endsWith("/git/refs"),
      respond: () =>
        jsonResponse(201, {
          ref: `refs/heads/${STAGING_BRANCH}`,
          object: { sha: BASE_SHA },
        }),
    },
    {
      match: (c) =>
        c.method === "GET" &&
        c.url.includes(`/git/commit/${BASE_SHA}`),
      respond: () =>
        jsonResponse(200, {
          sha: BASE_SHA,
          tree: { sha: "3333333333333333333333333333333333333333" },
        }),
    },
    {
      match: (c) =>
        c.method === "POST" &&
        c.url.endsWith("/git/trees"),
      respond: () =>
        jsonResponse(201, { sha: TREE_SHA }),
    },
    {
      match: (c) =>
        c.method === "POST" &&
        c.url.endsWith("/git/commits"),
      respond: () =>
        jsonResponse(201, { sha: STAGING_COMMIT_SHA }),
    },
    {
      match: (c) =>
        c.method === "PATCH" &&
        c.url.includes(`/git/refs/heads/${STAGING_BRANCH}`),
      respond: () =>
        jsonResponse(200, {
          object: { sha: STAGING_COMMIT_SHA },
        }),
    },
    {
      match: (c) =>
        c.method === "GET" &&
        c.url.includes("/contents/") &&
        c.url.includes(`ref=${STAGING_COMMIT_SHA}`),
      respond: (c) => {
        const decoded = decodeURIComponent(
          c.url.split("/contents/")[1].split("?")[0],
        );
        const file = FIXTURE_FILES.find(
          (f) => f.path === decoded,
        );
        if (!file) {
          return textResponse(404, "Not Found");
        }
        return jsonResponse(200, {
          type: "file",
          path: file.path,
          encoding: "base64",
          content: encodeBase64(file.content),
          sha: "4444444444444444444444444444444444444444",
        });
      },
    },
    {
      match: (c) =>
        c.method === "GET" &&
        c.url.includes(`/git/ref/heads/${STAGING_BRANCH}`),
      respond: () =>
        jsonResponse(200, {
          object: { sha: STAGING_COMMIT_SHA },
        }),
    },
  ];
}

function countContentsRequests(mock) {
  return mock.calls.filter(
    (c) =>
      c.method === "GET" &&
      c.url.includes("/contents/"),
  ).length;
}

function countStagingHeadRequests(mock) {
  return mock.calls.filter(
    (c) =>
      c.method === "GET" &&
      c.url.includes(
        `/git/ref/heads/${STAGING_BRANCH}`,
      ),
  ).length;
}

function assertAtomicFailure(
  result,
  expected,
) {
  assert.equal(
    result.success,
    false,
    `expected success=false, got ${JSON.stringify(result)}`,
  );
  assert.equal(
    result.code,
    expected.code,
    `expected code=${expected.code}, got ${result.code}`,
  );
  assert.equal(
    result.reason,
    expected.reason,
    `expected reason=${expected.reason}, got ${result.reason}`,
  );
}

function buildRequest() {
  return {
    repository: REPOSITORY,
    baseBranch: BASE_BRANCH,
    baseSha: BASE_SHA,
    stagingBranch: STAGING_BRANCH,
    files: FIXTURE_FILES.map((f) => ({
      path: f.path,
      content: f.content,
    })),
    commitMessage: "C170.8.8-B R12 atomic staging verification",
  };
}

function cloneHandlers() {
  return buildHappyHandlers();
}

function overrideHandler(handlers, matchPredicate, respondFn) {
  const next = handlers.map((h) =>
    matchPredicate(h) ? { ...h, respond: respondFn } : h,
  );
  return next;
}

async function executeWithMock(handlers) {
  const mock = createMockFetch(handlers);
  const result = await executeAtomicStaging(
    buildRequest(),
    { fetch: mock.fetch },
  );
  return { result, mock };
}

// ---------------------------------------------------------------------------
// TEST 5 — Positive Atomic Staging (real production function)
// ---------------------------------------------------------------------------

await run("5 ATOMIC STAGING POSITIVE", async () => {
  await resetStorage();

  const { result, mock } = await executeWithMock(
    cloneHandlers(),
  );

  assert.equal(
    mock.unexpected.length,
    0,
    `unexpected mock requests: ${JSON.stringify(
      mock.unexpected.map((u) => `${u.method} ${u.url}`),
    )}`,
  );

  assert.equal(
    result.success,
    true,
    `expected success=true, got ${JSON.stringify(result)}`,
  );
  assert.equal(result.code, "AIOS_ATOMIC_STAGING_READY");
  assert.equal(result.repository, REPOSITORY);
  assert.equal(result.baseBranch, BASE_BRANCH);
  assert.equal(result.baseSha, BASE_SHA);
  assert.equal(result.stagingBranch, STAGING_BRANCH);
  assert.equal(result.treeSha, TREE_SHA);
  assert.equal(result.stagingCommitSha, STAGING_COMMIT_SHA);
  assert.deepEqual(
    result.changedPaths,
    FIXTURE_FILES.map((f) => f.path),
  );

  assert.equal(
    countContentsRequests(mock),
    FIXTURE_FILES.length,
    "one Contents read per submitted file",
  );

  const contentsRefs = mock.calls
    .filter(
      (c) =>
        c.method === "GET" &&
        c.url.includes("/contents/"),
    )
    .map((c) => {
      const q = c.url.split("?")[1] || "";
      const params = new URLSearchParams(q);
      return params.get("ref");
    });

  for (const ref of contentsRefs) {
    assert.equal(
      ref,
      STAGING_COMMIT_SHA,
      "every Contents request must use ref=stagingCommitSha",
    );
  }

  assert.equal(
    countStagingHeadRequests(mock),
    2,
    "staging HEAD must be checked exactly twice",
  );
});

// ---------------------------------------------------------------------------
// Negative tests (A–L)
// ---------------------------------------------------------------------------

async function runNegative(
  name,
  handlers,
  expected,
  extraAssertions,
) {
  await run(name, async () => {
    await resetStorage();
    const { result, mock } = await executeWithMock(
      handlers,
    );
    assertAtomicFailure(result, expected);
    if (extraAssertions) {
      extraAssertions(result, mock);
    }
  });
}

// A. Contents 404
await runNegative(
  "6A CONTENTS 404",
  overrideHandler(
    cloneHandlers(),
    (h) =>
      h.match({
        url: "/contents/",
        method: "GET",
        init: {},
      }),
    () => textResponse(404, "Not Found"),
  ),
  {
    code: "AIOS_ATOMIC_STAGING_FAILED",
    reason: "AIOS_ATOMIC_CONTENTS_READ_FAILED",
  },
  (result, mock) => {
    assert.equal(
      countContentsRequests(mock),
      1,
      "exactly one Contents request before failure",
    );
  },
);

// B. Wrong file type
await runNegative(
  "6B WRONG FILE TYPE",
  overrideHandler(
    cloneHandlers(),
    (h) =>
      h.match({
        url: "/contents/",
        method: "GET",
        init: {},
      }),
    (c) => {
      const decoded = decodeURIComponent(
        c.url.split("/contents/")[1].split("?")[0],
      );
      const file = FIXTURE_FILES.find(
        (f) => f.path === decoded,
      );
      return jsonResponse(200, {
        type: "dir",
        path: file.path,
        encoding: "base64",
        content: encodeBase64(file.content),
        sha: "4444444444444444444444444444444444444444",
      });
    },
  ),
  {
    code: "AIOS_ATOMIC_STAGING_FAILED",
    reason: "AIOS_ATOMIC_CONTENTS_TYPE_INVALID",
  },
  (result, mock) => {
    assert.equal(
      countContentsRequests(mock),
      1,
      "exactly one Contents request before failure",
    );
  },
);

// C. Path mismatch
await runNegative(
  "6C PATH MISMATCH",
  overrideHandler(
    cloneHandlers(),
    (h) =>
      h.match({
        url: "/contents/",
        method: "GET",
        init: {},
      }),
    (c) => {
      const decoded = decodeURIComponent(
        c.url.split("/contents/")[1].split("?")[0],
      );
      const file = FIXTURE_FILES.find(
        (f) => f.path === decoded,
      );
      return jsonResponse(200, {
        type: "file",
        path: `${file.path}.mismatch`,
        encoding: "base64",
        content: encodeBase64(file.content),
        sha: "4444444444444444444444444444444444444444",
      });
    },
  ),
  {
    code: "AIOS_ATOMIC_STAGING_FAILED",
    reason: "AIOS_ATOMIC_CONTENTS_PATH_MISMATCH",
  },
  (result, mock) => {
    assert.equal(
      countContentsRequests(mock),
      1,
      "exactly one Contents request before failure",
    );
  },
);

// D. Wrong encoding
await runNegative(
  "6D WRONG ENCODING",
  overrideHandler(
    cloneHandlers(),
    (h) =>
      h.match({
        url: "/contents/",
        method: "GET",
        init: {},
      }),
    (c) => {
      const decoded = decodeURIComponent(
        c.url.split("/contents/")[1].split("?")[0],
      );
      const file = FIXTURE_FILES.find(
        (f) => f.path === decoded,
      );
      return jsonResponse(200, {
        type: "file",
        path: file.path,
        encoding: "utf-8",
        content: file.content,
        sha: "4444444444444444444444444444444444444444",
      });
    },
  ),
  {
    code: "AIOS_ATOMIC_STAGING_FAILED",
    reason: "AIOS_ATOMIC_CONTENTS_ENCODING_INVALID",
  },
  (result, mock) => {
    assert.equal(
      countContentsRequests(mock),
      1,
      "exactly one Contents request before failure",
    );
  },
);

// E. Malformed Base64
await runNegative(
  "6E MALFORMED BASE64",
  overrideHandler(
    cloneHandlers(),
    (h) =>
      h.match({
        url: "/contents/",
        method: "GET",
        init: {},
      }),
    (c) => {
      const decoded = decodeURIComponent(
        c.url.split("/contents/")[1].split("?")[0],
      );
      const file = FIXTURE_FILES.find(
        (f) => f.path === decoded,
      );
      return jsonResponse(200, {
        type: "file",
        path: file.path,
        encoding: "base64",
        content: "!!!not-base64!!!",
        sha: "4444444444444444444444444444444444444444",
      });
    },
  ),
  {
    code: "AIOS_ATOMIC_STAGING_FAILED",
    reason: "AIOS_ATOMIC_CONTENTS_BASE64_INVALID",
  },
  (result, mock) => {
    assert.equal(
      countContentsRequests(mock),
      1,
      "exactly one Contents request before failure",
    );
  },
);

// F. Invalid UTF-8
await runNegative(
  "6F INVALID UTF8",
  overrideHandler(
    cloneHandlers(),
    (h) =>
      h.match({
        url: "/contents/",
        method: "GET",
        init: {},
      }),
    (c) => {
      const decoded = decodeURIComponent(
        c.url.split("/contents/")[1].split("?")[0],
      );
      const file = FIXTURE_FILES.find(
        (f) => f.path === decoded,
      );
      // \xff\xfe is not valid UTF-8.
      return jsonResponse(200, {
        type: "file",
        path: file.path,
        encoding: "base64",
        content: Buffer.from([
          0xff, 0xfe, 0xfd,
        ]).toString("base64"),
        sha: "4444444444444444444444444444444444444444",
      });
    },
  ),
  {
    code: "AIOS_ATOMIC_STAGING_FAILED",
    reason: "AIOS_ATOMIC_CONTENTS_UTF8_INVALID",
  },
  (result, mock) => {
    assert.equal(
      countContentsRequests(mock),
      1,
      "exactly one Contents request before failure",
    );
  },
);

// G. Content mismatch
await runNegative(
  "6G CONTENT MISMATCH",
  overrideHandler(
    cloneHandlers(),
    (h) =>
      h.match({
        url: "/contents/",
        method: "GET",
        init: {},
      }),
    (c) => {
      const decoded = decodeURIComponent(
        c.url.split("/contents/")[1].split("?")[0],
      );
      const file = FIXTURE_FILES.find(
        (f) => f.path === decoded,
      );
      return jsonResponse(200, {
        type: "file",
        path: file.path,
        encoding: "base64",
        content: encodeBase64(
          `${file.content} // tampered`,
        ),
        sha: "4444444444444444444444444444444444444444",
      });
    },
  ),
  {
    code: "AIOS_ATOMIC_STAGING_FAILED",
    reason:
      "AIOS_ATOMIC_CONTENTS_CONTENT_MISMATCH",
  },
  (result, mock) => {
    assert.equal(
      countContentsRequests(mock),
      1,
      "exactly one Contents request before failure",
    );
  },
);

// H. Missing content
await runNegative(
  "6H MISSING CONTENT",
  overrideHandler(
    cloneHandlers(),
    (h) =>
      h.match({
        url: "/contents/",
        method: "GET",
        init: {},
      }),
    (c) => {
      const decoded = decodeURIComponent(
        c.url.split("/contents/")[1].split("?")[0],
      );
      const file = FIXTURE_FILES.find(
        (f) => f.path === decoded,
      );
      return jsonResponse(200, {
        type: "file",
        path: file.path,
        encoding: "base64",
        content: "",
        sha: "4444444444444444444444444444444444444444",
      });
    },
  ),
  {
    code: "AIOS_ATOMIC_STAGING_FAILED",
    reason:
      "AIOS_ATOMIC_CONTENTS_CONTENT_MISSING",
  },
  (result, mock) => {
    assert.equal(
      countContentsRequests(mock),
      1,
      "exactly one Contents request before failure",
    );
  },
);

// I. Missing blob SHA
await runNegative(
  "6I MISSING BLOB SHA",
  overrideHandler(
    cloneHandlers(),
    (h) =>
      h.match({
        url: "/contents/",
        method: "GET",
        init: {},
      }),
    (c) => {
      const decoded = decodeURIComponent(
        c.url.split("/contents/")[1].split("?")[0],
      );
      const file = FIXTURE_FILES.find(
        (f) => f.path === decoded,
      );
      return jsonResponse(200, {
        type: "file",
        path: file.path,
        encoding: "base64",
        content: encodeBase64(file.content),
      });
    },
  ),
  {
    code: "AIOS_ATOMIC_STAGING_FAILED",
    reason:
      "AIOS_ATOMIC_CONTENTS_BLOB_SHA_MISSING",
  },
  (result, mock) => {
    assert.equal(
      countContentsRequests(mock),
      1,
      "exactly one Contents request before failure",
    );
  },
);

// J. HEAD mismatch before readback
await runNegative(
  "6J HEAD MISMATCH BEFORE READBACK",
  cloneHandlers().map((h) => {
    if (
      h.match({
        url: `/git/ref/heads/${STAGING_BRANCH}`,
        method: "GET",
        init: {},
      })
    ) {
      return {
        ...h,
        respond: () =>
          jsonResponse(200, {
            object: {
              sha: "9999999999999999999999999999999999999999",
            },
          }),
      };
    }
    return h;
  }),
  {
    code: "AIOS_ATOMIC_STAGING_FAILED",
    reason:
      "AIOS_ATOMIC_STAGING_HEAD_BEFORE_CONTENTS_FAILED",
  },
  (result, mock) => {
    assert.equal(
      countContentsRequests(mock),
      0,
      "no Contents request before HEAD mismatch",
    );
  },
);

// K. HEAD mismatch after readback
await runNegative(
  "6K HEAD MISMATCH AFTER READBACK",
  (() => {
    const handlers = cloneHandlers();
    let headCount = 0;
    return handlers.map((h) => {
      if (
        h.match({
          url: `/git/ref/heads/${STAGING_BRANCH}`,
          method: "GET",
          init: {},
        })
      ) {
        return {
          ...h,
          respond: () => {
            headCount += 1;
            if (headCount === 1) {
              return jsonResponse(200, {
                object: { sha: STAGING_COMMIT_SHA },
              });
            }
            return jsonResponse(200, {
              object: {
                sha: "9999999999999999999999999999999999999999",
              },
            });
          },
        };
      }
      return h;
    });
  })(),
  {
    code: "AIOS_ATOMIC_STAGING_FAILED",
    reason:
      "AIOS_ATOMIC_STAGING_HEAD_AFTER_CONTENTS_FAILED",
  },
  (result, mock) => {
    assert.equal(
      countContentsRequests(mock),
      FIXTURE_FILES.length,
      "all Contents reads occur before post-readback HEAD check",
    );
    assert.equal(
      countStagingHeadRequests(mock),
      2,
      "staging HEAD checked twice",
    );
  },
);

// L. Invalid path rejected before network access
await run("6L INVALID PATH BEFORE NETWORK", async () => {
  await resetStorage();

  const mock = createMockFetch(cloneHandlers());
  const badRequest = buildRequest();
  badRequest.files = [
    {
      path: "../escape.ts",
      content: "export const x = 1;\n",
    },
  ];

  const result = await executeAtomicStaging(
    badRequest,
    { fetch: mock.fetch },
  );

  assertAtomicFailure(result, {
    code: "AIOS_ATOMIC_STAGING_FAILED",
    reason: "AIOS_ATOMIC_PATH_INVALID",
  });

  assert.equal(
    mock.calls.length,
    0,
    "no GitHub API request before path rejection",
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
