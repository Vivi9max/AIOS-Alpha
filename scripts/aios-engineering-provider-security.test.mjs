import test from "node:test";
import assert from "node:assert/strict";

import {
  runEngineeringTask,
} from "./aios-engineering-provider-adapter.mjs";

const HEAD = "a".repeat(40);

function createRepositoryContext() {
  return {
    schemaVersion: 1,
    repository: {
      head: HEAD,
      branch: "main",
    },
    target: "lib/example.ts",
    directDependencies: [],
    reverseImporters: [],
    context: "export function example() { return true; }",
  };
}

function createImpactReport() {
  return {
    schemaVersion: 1,
    analyzer: "C170.2",
    repository: {
      head: HEAD,
      branch: "main",
    },
    changedFiles: ["lib/example.ts"],
    affectedFiles: [],
    perFile: [],
    risk: {
      level: "low",
      reasons: [],
    },
    readOnly: true,
    requiresFounderReview: true,
  };
}

function createArguments(overrides = {}) {
  return {
    task: "Review the proposed engineering change.",
    repositoryContext: createRepositoryContext(),
    impactReport: createImpactReport(),
    env: {
      DEEPSEEK_API_KEY: "test-deepseek-secret",
      QWEN_API_KEY: "test-qwen-secret",
      OPENAI_API_KEY: "test-openai-secret",
    },
    providerChain: "deepseek,qwen,openai",
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      async json() {
        return {
          choices: [
            {
              message: {
                content: "Proposal.",
              },
            },
          ],
        };
      },
    }),
    ...overrides,
  };
}

async function assertBlockedBeforeNetwork(options) {
  let networkCalls = 0;

  await assert.rejects(
    runEngineeringTask(
      createArguments({
        ...options,
        fetchImpl: async () => {
          networkCalls += 1;
          throw new Error("Network must not be called.");
        },
      }),
    ),
    {
      code: "AIOS_ENGINEERING_SECRET_SCAN_BLOCKED",
    },
  );

  assert.equal(
    networkCalls,
    0,
    "No provider may be called after a secret scan hit.",
  );
}

test("blocks a secret found in the engineering task", async () => {
  const secret = "sk-" + "A".repeat(32);

  await assertBlockedBeforeNetwork({
    task: `Review this credential: ${secret}`,
  });
});

test("blocks a secret found in C170.1 repository context", async () => {
  const context = createRepositoryContext();

  context.context =
    'const credential = "ghp_' +
    "B".repeat(40) +
    '";';

  await assertBlockedBeforeNetwork({
    repositoryContext: context,
  });
});

test("blocks a secret found in C170.2 impact report", async () => {
  const report = createImpactReport();

  report.risk.reasons = [
    'api_key: "sensitive-value-123456789"',
  ];

  await assertBlockedBeforeNetwork({
    impactReport: report,
  });
});

test("does not expose matched credentials in thrown errors", async () => {
  const secret = "sk-" + "C".repeat(32);

  let caught;

  try {
    await runEngineeringTask(
      createArguments({
        task: `Inspect ${secret}`,
        fetchImpl: async () => {
          throw new Error("Must not be called.");
        },
      }),
    );
  } catch (error) {
    caught = error;
  }

  assert.ok(caught);
  assert.equal(
    caught.code,
    "AIOS_ENGINEERING_SECRET_SCAN_BLOCKED",
  );
  assert.equal(
    caught.message.includes(secret),
    false,
  );
  assert.equal(
    JSON.stringify(caught.findings).includes(secret),
    false,
  );
});

test("does not allow provider failover to bypass the guard", async () => {
  let calls = 0;

  await assert.rejects(
    runEngineeringTask(
      createArguments({
        task: "Token: github_pat_" + "D".repeat(40),
        providerChain: "deepseek,qwen,openai",
        fetchImpl: async () => {
          calls += 1;
          throw new Error("Must not be called.");
        },
      }),
    ),
    {
      code: "AIOS_ENGINEERING_SECRET_SCAN_BLOCKED",
    },
  );

  assert.equal(calls, 0);
});

test("allows ordinary engineering tasks to reach the provider", async () => {
  let calls = 0;

  const result = await runEngineeringTask(
    createArguments({
      fetchImpl: async () => {
        calls += 1;

        return {
          ok: true,
          status: 200,
          async json() {
            return {
              choices: [
                {
                  message: {
                    content: "Safe engineering proposal.",
                  },
                },
              ],
            };
          },
        };
      },
    }),
  );

  assert.equal(calls, 1);
  assert.equal(result.success, true);
  assert.equal(result.status, "PROPOSAL_READY");
  assert.equal(result.requiresFounderReview, true);
  assert.equal(result.readOnly, true);
});
