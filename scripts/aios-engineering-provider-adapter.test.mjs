import test from "node:test";
import assert from "node:assert/strict";

import {
  runEngineeringTask,
} from "./aios-engineering-provider-adapter.mjs";

const HEAD = "a".repeat(40);

// These are deliberately recognized placeholder values.
// Never put realistic credential-shaped values in source fixtures.
const TEST_DEEPSEEK_KEY = "your_deepseek_api_key";
const TEST_QWEN_KEY = "your_qwen_api_key";
const TEST_OPENAI_KEY = "your_openai_api_key";

function createRepositoryContext() {
  return {
    schemaVersion: 1,
    repository: {
      head: HEAD,
      branch: "main",
    },
    target: "lib/example.ts",
    directDependencies: [
      "lib/dependency.ts",
    ],
    reverseImporters: [
      "app/example.ts",
    ],
    context: "export function example() { return true; }",
  };
}

function createImpactReport(overrides = {}) {
  return {
    schemaVersion: 1,
    analyzer: "C170.2",
    repository: {
      head: HEAD,
      branch: "main",
    },
    changedFiles: [
      "lib/example.ts",
    ],
    affectedFiles: [
      {
        path: "app/example.ts",
        minimumDepth: 1,
        impactedBy: [
          "lib/example.ts",
        ],
      },
    ],
    perFile: [],
    risk: {
      level: "low",
      reasons: [],
    },
    readOnly: true,
    requiresFounderReview: true,
    ...overrides,
  };
}

function createFetchResponse({
  ok = true,
  status = 200,
  content = "Engineering proposal.",
  error,
} = {}) {
  return async () => ({
    ok,
    status,
    async json() {
      if (error) {
        return {
          error: {
            message: error,
          },
        };
      }

      return {
        choices: [
          {
            message: {
              content,
            },
          },
        ],
      };
    },
  });
}

function createEnv(overrides = {}) {
  return {
    DEEPSEEK_API_KEY: TEST_DEEPSEEK_KEY,
    QWEN_API_KEY: TEST_QWEN_KEY,
    OPENAI_API_KEY: TEST_OPENAI_KEY,
    ...overrides,
  };
}

function createArguments(overrides = {}) {
  return {
    task: "Review the proposed engineering change.",
    repositoryContext: createRepositoryContext(),
    impactReport: createImpactReport(),
    env: createEnv(),
    fetchImpl: createFetchResponse(),
    ...overrides,
  };
}

test("accepts matching C170.1 and C170.2 evidence", async () => {
  const result = await runEngineeringTask(
    createArguments(),
  );

  assert.equal(result.success, true);
  assert.equal(result.status, "PROPOSAL_READY");
  assert.equal(result.provider, "deepseek");
  assert.equal(result.repositoryHead, HEAD);
  assert.equal(result.requiresFounderReview, true);
  assert.equal(result.readOnly, true);
});

test("rejects a missing repository context", async () => {
  await assert.rejects(
    runEngineeringTask(
      createArguments({
        repositoryContext: null,
      }),
    ),
    {
      code: "AIOS_ENGINEERING_CONTEXT_INVALID",
    },
  );
});

test("rejects a C170.2 report from a different HEAD", async () => {
  await assert.rejects(
    runEngineeringTask(
      createArguments({
        impactReport: createImpactReport({
          repository: {
            head: "b".repeat(40),
            branch: "main",
          },
        }),
      }),
    ),
    {
      code: "AIOS_ENGINEERING_IMPACT_INVALID",
    },
  );
});

test("rejects an impact report without Founder review boundary", async () => {
  await assert.rejects(
    runEngineeringTask(
      createArguments({
        impactReport: createImpactReport({
          requiresFounderReview: false,
        }),
      }),
    ),
    {
      code: "AIOS_ENGINEERING_IMPACT_INVALID",
    },
  );
});

test("returns unavailable when no provider has credentials", async () => {
  const result = await runEngineeringTask(
    createArguments({
      env: {},
    }),
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "NO_CONFIGURED_PROVIDER");
  assert.equal(result.provider, null);
  assert.equal(result.readOnly, true);
});

test("uses the next provider after the first provider fails", async () => {
  let calls = 0;

  const fetchImpl = async () => {
    calls += 1;

    if (calls === 1) {
      return {
        ok: false,
        status: 503,
        async json() {
          return {
            error: {
              message: "Temporary provider outage.",
            },
          };
        },
      };
    }

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          choices: [
            {
              message: {
                content: "Qwen proposal.",
              },
            },
          ],
        };
      },
    };
  };

  const result = await runEngineeringTask(
    createArguments({
      providerChain: "deepseek,qwen",
      fetchImpl,
    }),
  );

  assert.equal(calls, 2);
  assert.equal(result.success, true);
  assert.equal(result.provider, "qwen");
  assert.equal(result.fallbackUsed, true);
  assert.equal(result.attempts.length, 2);
  assert.equal(result.attempts[0].success, false);
  assert.equal(result.attempts[1].success, true);
});

test("does not treat an empty model response as success", async () => {
  const result = await runEngineeringTask(
    createArguments({
      providerChain: "deepseek",
      fetchImpl: createFetchResponse({
        content: "   ",
      }),
    }),
  );

  assert.equal(result.success, false);
  assert.equal(result.status, "ALL_PROVIDERS_FAILED");
  assert.equal(result.attempts[0].success, false);
  assert.equal(
    result.attempts[0].code,
    "AIOS_ENGINEERING_PROVIDER_EMPTY_RESPONSE",
  );
});

test("does not expose provider API keys in errors", async () => {
  const secret = TEST_DEEPSEEK_KEY;

  const result = await runEngineeringTask(
    createArguments({
      providerChain: "deepseek",
      fetchImpl: createFetchResponse({
        ok: false,
        status: 401,
        error: `Invalid credential ${secret}`,
      }),
    }),
  );

  assert.equal(result.success, false);

  const serialized = JSON.stringify(result);

  assert.equal(serialized.includes(secret), false);
  assert.equal(serialized.includes("[REDACTED]"), true);
});

test("rejects oversized repository context", async () => {
  const context = createRepositoryContext();

  context.context = "x".repeat(200001);

  await assert.rejects(
    runEngineeringTask(
      createArguments({
        repositoryContext: context,
      }),
    ),
    {
      code: "AIOS_ENGINEERING_CONTEXT_INVALID",
    },
  );
});

test("accepts a task at the 16000-character limit", async () => {
  const result = await runEngineeringTask(
    createArguments({
      task: "x".repeat(16000),
    }),
  );

  assert.equal(result.success, true);
  assert.equal(result.status, "PROPOSAL_READY");
});

test("rejects a task above the 16000-character limit", async () => {
  await assert.rejects(
    runEngineeringTask(
      createArguments({
        task: "x".repeat(16001),
      }),
    ),
    {
      code: "AIOS_ENGINEERING_ADAPTER_INPUT_INVALID",
    },
  );
});

test("rejects an unsupported provider chain", async () => {
  await assert.rejects(
    runEngineeringTask(
      createArguments({
        providerChain: "mock,unknown",
      }),
    ),
    {
      code: "AIOS_ENGINEERING_PROVIDER_CHAIN_INVALID",
    },
  );
});

test("rejects invalid timeout configuration", async () => {
  await assert.rejects(
    runEngineeringTask(
      createArguments({
        timeoutMs: 100,
      }),
    ),
    {
      code: "AIOS_ENGINEERING_TIMEOUT_INVALID",
    },
  );
});

test("sends only the selected provider request", async () => {
  let requestUrl = "";
  let requestBody = null;

  const fetchImpl = async (url, options) => {
    requestUrl = url;
    requestBody = JSON.parse(options.body);

    return {
      ok: true,
      status: 200,
      async json() {
        return {
          choices: [
            {
              message: {
                content: "Reviewed proposal.",
              },
            },
          ],
        };
      },
    };
  };

  await runEngineeringTask(
    createArguments({
      providerChain: "qwen",
      fetchImpl,
    }),
  );

  assert.equal(
    requestUrl,
    "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  );

  assert.equal(requestBody.model, "qwen-plus");
  assert.equal(requestBody.temperature, 0.1);
  assert.equal(requestBody.messages.length, 2);
  assert.equal(requestBody.messages[0].role, "system");
  assert.equal(requestBody.messages[1].role, "user");
});

test("does not call a provider when evidence validation fails", async () => {
  let calls = 0;

  await assert.rejects(
    runEngineeringTask(
      createArguments({
        impactReport: createImpactReport({
          repository: {
            head: "c".repeat(40),
            branch: "main",
          },
        }),
        fetchImpl: async () => {
          calls += 1;
          throw new Error("Must not be called.");
        },
      }),
    ),
    {
      code: "AIOS_ENGINEERING_IMPACT_INVALID",
    },
  );

  assert.equal(calls, 0);
});

test("returns read-only review metadata after successful generation", async () => {
  const result = await runEngineeringTask(
    createArguments(),
  );

  assert.equal(result.readOnly, true);
  assert.equal(result.requiresFounderReview, true);
  assert.equal(result.status, "PROPOSAL_READY");
  assert.equal(typeof result.content, "string");
});
