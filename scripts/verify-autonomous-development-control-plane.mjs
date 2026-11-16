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

const atomicExecutorSource = fs.readFileSync(
  path.join(
    REPO_ROOT,
    "lib/github/autonomous-development-atomic-executor.ts",
  ),
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

const patchedAtomicExecutor = atomicExecutorSource
  .replace(
    /import\s+"server-only";/,
    'import "./server-only-stub.mjs";',
  )
  .replace(
    /"@\/lib\/github\/bridge"/g,
    '"./github-bridge-stub.mjs"',
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
  )
  .replace(
    /"@\/lib\/github\/autonomous-development-control-plane"/g,
    '"./control-plane.mjs"',
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
  "autonomous-development-atomic-executor.mjs",
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
  "github-bridge-stub.mjs",
  [
    "export function getGitHubBridgeConfig() {",
    "  return {",
    '    apiBaseUrl: "https://api.github.test",',
    '    repositoryOwner: "Vivi9max",',
    '    repositoryName: "AIOS-Alpha",',
    "  };",
    "}",
    "",
    "export function resolveGitHubBridgeAuth() {",
    "  return {",
    '    token: "test-access-token",',
    '    authorization: "Bearer test-access-token",',
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
    path.join(
      tmpDir,
      "autonomous-development-atomic-executor.mjs",
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
// Exact Readback Verifier Harness (C170.8.8-B-R1)
// ---------------------------------------------------------------------------

const TEST_API_BASE = "https://api.github.test";
const TEST_ACCESS_TOKEN = "test-access-token";
const TEST_REPOSITORY = "Vivi9max/AIOS-Alpha";
const TEST_BASE_BRANCH = "main";
const TEST_BASE_SHA = "8558a632b7c122b9572822b18fc23494cc97f693";

function expectedStagingBranchFor(taskId) {
  return `aios-staging/${taskId}`;
}

function fakeSha(prefix, seed) {
  const raw = `${prefix}:${seed}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  const hex = hash.toString(16).padStart(8, "0");
  return `${prefix}${hex.repeat(5)}`.slice(0, 40);
}

function encodeContent(content) {
  return Buffer.from(content, "utf8").toString("base64");
}

function decodeContent(content) {
  return Buffer.from(content, "base64").toString("utf8");
}

function buildFetchMock(options) {
  const state = {
    contentsReads: [],
    requests: [],
    blobs: new Map(),
    trees: new Map(),
    commits: new Map(),
    refs: new Map(),
  };

  const files = options.files;
  const fileEntries = Object.entries(files).map(
    ([filePath, content]) => ({
      path: filePath,
      content,
    }),
  );

  const expectedStagingBranch = expectedStagingBranchFor(
    options.taskId,
  );

  state.refs.set(
    `refs/heads/${TEST_BASE_BRANCH}`,
    TEST_BASE_SHA,
  );

  const blobShas = new Map();
  for (const entry of fileEntries) {
    const blobSha = fakeSha("b", entry.path);
    blobShas.set(entry.path, blobSha);
    state.blobs.set(blobSha, entry.content);
  }

  const treeSha = fakeSha("t", options.taskId);
  const commitSha = fakeSha("c", options.taskId);

  state.trees.set(
    treeSha,
    fileEntries.map((entry) => ({
      path: entry.path,
      mode: "100644",
      type: "blob",
      sha: blobShas.get(entry.path),
    })),
  );

  state.commits.set(commitSha, {
    sha: commitSha,
    treeSha,
    parents: [TEST_BASE_SHA],
    message: options.commitMessage ?? "AIOS staging commit",
  });

  state.refs.set(
    `refs/heads/${expectedStagingBranch}`,
    options.stagingHeadSha ?? commitSha,
  );

  function jsonResponse(body, status = 200) {
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

  function notFound() {
    return jsonResponse(
      { message: "Not Found" },
      404,
    );
  }

  const handler = async (input, init) => {
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
        body = JSON.parse(init.body);
      } catch {
        body = null;
      }
    }

    state.requests.push({ url, method, body });

    if (!url.startsWith(TEST_API_BASE)) {
      throw new Error(
        `Unexpected outbound request to non-test host: ${url}`,
      );
    }

    // GET branch ref
    const branchRefMatch = url.match(
      /\/repos\/[^/]+\/[^/]+\/git\/ref\/heads\/(.+)$/,
    );
    if (branchRefMatch && method === "GET") {
      const branchName = decodeURIComponent(
        branchRefMatch[1],
      );
      const sha = state.refs.get(
        `refs/heads/${branchName}`,
      );
      if (!sha) {
        return notFound();
      }
      return jsonResponse({
        ref: `refs/heads/${branchName}`,
        object: { sha, type: "commit" },
      });
    }

    // POST create ref
    if (
      method === "POST" &&
      /\/repos\/[^/]+\/[^/]+\/git\/refs$/.test(url)
    ) {
      const ref = body?.ref;
      const sha = body?.sha;
      if (!ref || !sha) {
        return jsonResponse(
          { message: "Invalid ref payload" },
          422,
        );
      }
      state.refs.set(ref, sha);
      return jsonResponse({
        ref,
        object: { sha, type: "commit" },
      }, 201);
    }

    // GET base commit
    const commitMatch = url.match(
      /\/repos\/[^/]+\/[^/]+\/git\/commits\/([^/?]+)$/,
    );
    if (commitMatch && method === "GET") {
      const sha = commitMatch[1];
      if (sha === TEST_BASE_SHA) {
        return jsonResponse({
          sha,
          tree: { sha: fakeSha("t", "base") },
          parents: [],
        });
      }
      const commit = state.commits.get(sha);
      if (!commit) {
        return notFound();
      }
      return jsonResponse({
        sha,
        tree: { sha: commit.treeSha },
        parents: commit.parents.map((parent) => ({
          sha: parent,
        })),
      });
    }

    // POST Git blob
    if (
      method === "POST" &&
      /\/repos\/[^/]+\/[^/]+\/git\/blobs$/.test(url)
    ) {
      const content = body?.content;
      const encoding = body?.encoding;
      if (
        typeof content !== "string" ||
        encoding !== "base64"
      ) {
        return jsonResponse(
          { message: "Invalid blob payload" },
          422,
        );
      }
      const decoded = decodeContent(content);
      let matchedPath = null;
      for (const entry of fileEntries) {
        if (entry.content === decoded) {
          matchedPath = entry.path;
          break;
        }
      }
      const sha = matchedPath
        ? blobShas.get(matchedPath)
        : fakeSha("b", decoded);
      state.blobs.set(sha, decoded);
      return jsonResponse({ sha }, 201);
    }

    // POST Git tree
    if (
      method === "POST" &&
      /\/repos\/[^/]+\/[^/]+\/git\/trees$/.test(url)
    ) {
      const tree = body?.tree;
      if (!Array.isArray(tree)) {
        return jsonResponse(
          { message: "Invalid tree payload" },
          422,
        );
      }
      const sha = fakeSha(
        "t",
        tree.map((item) => item.path).join(","),
      );
      state.trees.set(sha, tree);
      return jsonResponse({ sha }, 201);
    }

    // POST Git commit
    if (
      method === "POST" &&
      /\/repos\/[^/]+\/[^/]+\/git\/commits$/.test(url)
    ) {
      const treeSha = body?.tree;
      const parents = body?.parents;
      if (
        typeof treeSha !== "string" ||
        !Array.isArray(parents)
      ) {
        return jsonResponse(
          { message: "Invalid commit payload" },
          422,
        );
      }
      const sha = fakeSha(
        "c",
        `${treeSha}:${parents.join(",")}`,
      );
      state.commits.set(sha, {
        sha,
        treeSha,
        parents,
        message: body?.message ?? "",
      });
      return jsonResponse({ sha }, 201);
    }

    // GET Contents API
    const contentsMatch = url.match(
      /\/repos\/[^/]+\/[^/]+\/contents\/([^?]+)\?/,
    );
    if (contentsMatch && method === "GET") {
      const filePath = decodeURIComponent(
        contentsMatch[1],
      );
      const refMatch = url.match(/[?&]ref=([^&]+)/);
      const ref = refMatch
        ? decodeURIComponent(refMatch[1])
        : null;
      state.contentsReads.push({ path: filePath, ref });

      if (ref !== commitSha) {
        return jsonResponse(
          {
            message:
              "Contents API must be read at the exact staging commit SHA",
          },
          422,
        );
      }

      const expected = files[filePath];
      if (typeof expected !== "string") {
        return notFound();
      }

      if (options.mutateContentPath === filePath) {
        return jsonResponse({
          type: "file",
          encoding: "base64",
          content: encodeContent(
            `${expected}\n/* tampered */`,
          ),
          sha: blobShas.get(filePath),
          path: filePath,
        });
      }

      if (options.dropContentPath === filePath) {
        return jsonResponse({
          type: "file",
          encoding: "base64",
          sha: blobShas.get(filePath),
          path: filePath,
        });
      }

      if (options.unsupportedEncodingPath === filePath) {
        return jsonResponse({
          type: "file",
          encoding: "utf-8",
          content: expected,
          sha: blobShas.get(filePath),
          path: filePath,
        });
      }

      return jsonResponse({
        type: "file",
        encoding: "base64",
        content: encodeContent(expected),
        sha: blobShas.get(filePath),
        path: filePath,
      });
    }

    return notFound();
  };

  return { handler, state, commitSha, treeSha };
}

async function runAtomicStagingCase(options) {
  const mock = buildFetchMock(options);
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mock.handler;
  try {
    const result = await executeAtomicStaging({
      objective: options.objective,
      taskId: options.taskId,
      repository: TEST_REPOSITORY,
      baseBranch: TEST_BASE_BRANCH,
      files: options.files,
      accessToken: TEST_ACCESS_TOKEN,
    });
    return { result, mock };
  } finally {
    globalThis.fetch = originalFetch;
  }
}

// ---------------------------------------------------------------------------
// TEST 5 — Exact multi-file readback succeeds
// ---------------------------------------------------------------------------

await run("5 EXACT READBACK SUCCEEDS", async () => {
  const taskId = "task-c170-8-8-b-r1-success";
  const files = {
    "lib/example/alpha.ts": "export const alpha = 1;\n",
    "lib/example/beta.ts": "export const beta = 2;\n",
    "lib/example/gamma.ts": "export const gamma = 3;\n",
  };

  const { result, mock } = await runAtomicStagingCase({
    objective: "C170.8.8-B-R1 success fixture",
    taskId,
    files,
  });

  const expectedBranch = expectedStagingBranchFor(taskId);

  assert.equal(result.success, true);
  assert.equal(
    result.code,
    "AIOS_ATOMIC_STAGING_READY",
  );
  assert.ok(result.snapshot);
  assert.equal(
    result.snapshot.stagingCommitSha,
    mock.commitSha,
  );
  assert.equal(
    result.snapshot.stagingBranch,
    expectedBranch,
  );
  for (const filePath of Object.keys(files)) {
    assert.ok(
      result.snapshot.changedPaths.includes(filePath),
      `changedPaths must include ${filePath}`,
    );
  }

  // Every changed file receives an independent Contents API read.
  const readPaths = mock.state.contentsReads.map(
    (entry) => entry.path,
  );
  for (const filePath of Object.keys(files)) {
    assert.ok(
      readPaths.includes(filePath),
      `Contents API must be read for ${filePath}`,
    );
  }
  assert.equal(
    readPaths.length,
    Object.keys(files).length,
    "each changed file must be read exactly once",
  );

  // Every Contents API request uses ref equal to the exact staging commit SHA.
  for (const entry of mock.state.contentsReads) {
    assert.equal(
      entry.ref,
      mock.commitSha,
      `Contents API for ${entry.path} must use ref ${mock.commitSha}`,
    );
  }
});

// ---------------------------------------------------------------------------
// TEST 6 — Content mismatch blocks
// ---------------------------------------------------------------------------

await run("6 CONTENT MISMATCH BLOCKS", async () => {
  const taskId = "task-c170-8-8-b-r1-mismatch";
  const files = {
    "lib/example/alpha.ts": "export const alpha = 1;\n",
    "lib/example/beta.ts": "export const beta = 2;\n",
  };

  const { result } = await runAtomicStagingCase({
    objective: "C170.8.8-B-R1 mismatch fixture",
    taskId,
    files,
    mutateContentPath: "lib/example/beta.ts",
  });

  assert.equal(result.success, false);
  assert.equal(result.snapshot, undefined);
  assert.ok(
    typeof result.reason === "string" &&
      result.reason.includes("lib/example/beta.ts"),
    `failure reason must identify affected path, got: ${result.reason}`,
  );
});

// ---------------------------------------------------------------------------
// TEST 7 — Missing file / HTTP 404 blocks
// ---------------------------------------------------------------------------

await run("7 MISSING FILE BLOCKS", async () => {
  const taskId = "task-c170-8-8-b-r1-missing";
  const files = {
    "lib/example/alpha.ts": "export const alpha = 1;\n",
    "lib/example/beta.ts": "export const beta = 2;\n",
  };

  const { result } = await runAtomicStagingCase({
    objective: "C170.8.8-B-R1 missing fixture",
    taskId,
    files,
    dropContentPath: "lib/example/alpha.ts",
    // Force a 404 by treating the path as absent.
    files: {
      "lib/example/beta.ts": files["lib/example/beta.ts"],
    },
  });

  assert.equal(result.success, false);
  assert.equal(result.snapshot, undefined);
  assert.ok(
    typeof result.reason === "string" &&
      result.reason.includes("lib/example/alpha.ts"),
    `failure reason must identify affected path, got: ${result.reason}`,
  );
});

// ---------------------------------------------------------------------------
// TEST 8 — Missing content / unsupported encoding blocks
// ---------------------------------------------------------------------------

await run("8 MISSING CONTENT BLOCKS", async () => {
  const taskId = "task-c170-8-8-b-r1-no-content";
  const files = {
    "lib/example/alpha.ts": "export const alpha = 1;\n",
  };

  const { result } = await runAtomicStagingCase({
    objective: "C170.8.8-B-R1 no-content fixture",
    taskId,
    files,
    dropContentPath: "lib/example/alpha.ts",
  });

  assert.equal(result.success, false);
  assert.equal(result.snapshot, undefined);
  assert.ok(
    typeof result.reason === "string" &&
      result.reason.includes("lib/example/alpha.ts"),
    `failure reason must identify affected path, got: ${result.reason}`,
  );
});

// ---------------------------------------------------------------------------
// TEST 9 — Unsupported encoding blocks
// ---------------------------------------------------------------------------

await run("9 UNSUPPORTED ENCODING BLOCKS", async () => {
  const taskId = "task-c170-8-8-b-r1-bad-encoding";
  const files = {
    "lib/example/alpha.ts": "export const alpha = 1;\n",
  };

  const { result } = await runAtomicStagingCase({
    objective: "C170.8.8-B-R1 encoding fixture",
    taskId,
    files,
    unsupportedEncodingPath: "lib/example/alpha.ts",
  });

  assert.equal(result.success, false);
  assert.equal(result.snapshot, undefined);
  assert.ok(
    typeof result.reason === "string" &&
      result.reason.includes("lib/example/alpha.ts"),
    `failure reason must identify affected path, got: ${result.reason}`,
  );
});

// ---------------------------------------------------------------------------
// TEST 10 — Staging branch HEAD mismatch blocks
// ---------------------------------------------------------------------------

await run("10 STAGING HEAD MISMATCH BLOCKS", async () => {
  const taskId = "task-c170-8-8-b-r1-head-mismatch";
  const files = {
    "lib/example/alpha.ts": "export const alpha = 1;\n",
  };

  const { result } = await runAtomicStagingCase({
    objective: "C170.8.8-B-R1 head mismatch fixture",
    taskId,
    files,
    stagingHeadSha: fakeSha("c", "different-head"),
  });

  assert.equal(result.success, false);
  assert.equal(result.snapshot, undefined);
  assert.ok(
    typeof result.reason === "string" &&
      result.reason.length > 0,
    "failure reason must be present",
  );
});

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

console.log(
  "\nC170.8.8-B-R1 INDEPENDENT READBACK VERIFICATION\n",
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
