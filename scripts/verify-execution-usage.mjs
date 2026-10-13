import { existsSync, readFileSync } from "node:fs";

const files = {
  route: "app/api/execution/jobs/route.ts",
  usage: "lib/billing/execution-usage.ts",
  jobStore: "lib/execution/job-store.ts",
  redis: "lib/server-storage/redis.ts",
};

const failures = [];

for (const file of Object.values(files)) {
  if (!existsSync(file)) {
    failures.push(`Required file is missing: ${file}`);
  }
}

if (failures.length > 0) {
  console.error("Execution usage verification FAILED.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const route = readFileSync(files.route, "utf8");
const usage = readFileSync(files.usage, "utf8");
const jobStore = readFileSync(files.jobStore, "utf8");
const redis = readFileSync(files.redis, "utf8");

function extractFunction(source, signature, nextSignature) {
  const start = source.indexOf(signature);

  if (start === -1) {
    return "";
  }

  if (!nextSignature) {
    return source.slice(start);
  }

  const end = source.indexOf(
    nextSignature,
    start + signature.length,
  );

  if (end === -1) {
    return source.slice(start);
  }

  return source.slice(start, end);
}

const invalidJsonResponse = extractFunction(
  route,
  "function getInvalidJsonResponse(",
  "function getEntitlementFailure(",
);

const post = extractFunction(
  route,
  "export async function POST(",
  "export async function PATCH(",
);

const patch = extractFunction(
  route,
  "export async function PATCH(",
  "",
);

const createJobId = extractFunction(
  jobStore,
  "function createJobId()",
  "function isOptionalString(",
);

const optionalStringGuard = extractFunction(
  jobStore,
  "function isOptionalString(",
  "function isOptionalFiniteNumber(",
);

const optionalFiniteNumberGuard = extractFunction(
  jobStore,
  "function isOptionalFiniteNumber(",
  "function isExecutionJobVerification(",
);

const verificationGuard = extractFunction(
  jobStore,
  "function isExecutionJobVerification(",
  "function isExecutionJob(",
);

const jobGuard = extractFunction(
  jobStore,
  "function isExecutionJob(",
  "async function readJobs(",
);

const readJobs = extractFunction(
  jobStore,
  "async function readJobs(",
  "async function writeJobs(",
);

const createJob = extractFunction(
  jobStore,
  "export async function createExecutionJob(",
  "export async function updateExecutionJob(",
);

const checks = [
  {
    name: "Execution POST handler exists",
    test: () => post.length > 0,
  },
  {
    name: "Execution retry PATCH handler exists",
    test: () => patch.length > 0,
  },
  {
    name: "Execution route defines a bounded input limit",
    test: () =>
      /const\s+MAX_INPUT_LENGTH\s*=\s*10000\s*;/.test(
        route,
      ),
  },
  {
    name: "Execution route defines a malformed JSON response",
    test: () =>
      invalidJsonResponse.length > 0 &&
      /"INVALID_JSON"/.test(
        invalidJsonResponse,
      ) &&
      /status:\s*400/.test(
        invalidJsonResponse,
      ),
  },
  {
    name: "Malformed JSON response preserves API version and request id",
    test: () =>
      invalidJsonResponse.length > 0 &&
      /apiVersion:\s*API_VERSION/.test(
        invalidJsonResponse,
      ) &&
      /\brequestId\b/.test(
        invalidJsonResponse,
      ),
  },
  {
    name: "POST rejects malformed JSON before execution validation",
    test: () => {
      const requestJson =
        post.indexOf("await request.json()");
      const invalidJson =
        post.indexOf("getInvalidJsonResponse(");
      const goalValidation =
        post.indexOf("if (!goal)");

      return (
        requestJson !== -1 &&
        invalidJson !== -1 &&
        goalValidation !== -1 &&
        requestJson < invalidJson &&
        invalidJson < goalValidation
      );
    },
  },
  {
    name: "PATCH rejects malformed JSON before retry validation",
    test: () => {
      const requestJson =
        patch.indexOf("await request.json()");
      const invalidJson =
        patch.indexOf("getInvalidJsonResponse(");
      const idValidation =
        patch.indexOf("if (!id)");

      return (
        requestJson !== -1 &&
        invalidJson !== -1 &&
        idValidation !== -1 &&
        requestJson < invalidJson &&
        invalidJson < idValidation
      );
    },
  },
  {
    name: "POST validates the execution goal before creating a job",
    test: () =>
      /if\s*\(!goal\)/.test(post) &&
      post.indexOf("if (!goal)") <
        post.indexOf("createExecutionJob("),
  },
  {
    name: "POST rejects execution input that exceeds the configured limit",
    test: () =>
      /input\.length\s*>\s*MAX_INPUT_LENGTH/.test(
        post,
      ) &&
      /"INPUT_TOO_LONG"/.test(post) &&
      /status:\s*400/.test(post),
  },
  {
    name: "POST validates execution input length before creating a job",
    test: () => {
      const inputLengthCheck = post.indexOf(
        "input.length >",
      );
      const inputTooLongCode = post.indexOf(
        "\"INPUT_TOO_LONG\"",
      );
      const createExecutionJob = post.indexOf(
        "createExecutionJob(",
      );

      return (
        inputLengthCheck !== -1 &&
        inputTooLongCode !== -1 &&
        createExecutionJob !== -1 &&
        inputLengthCheck < inputTooLongCode &&
        inputTooLongCode < createExecutionJob
      );
    },
  },
  {
    name: "POST checks execution capability after request validation",
    test: () => {
      const inputLengthCheck = post.indexOf(
        "input.length >",
      );
      const capability = post.indexOf(
        "canUseCapability(",
      );

      return (
        inputLengthCheck !== -1 &&
        capability !== -1 &&
        inputLengthCheck < capability
      );
    },
  },
  {
    name: "POST checks execution capability before creating a job",
    test: () => {
      const capabilityCheck = post.indexOf(
        "if (\n      !capability.allowed",
      );
      const createExecutionJob = post.indexOf(
        "createExecutionJob(",
      );

      return (
        post.includes("canUseCapability(") &&
        capabilityCheck !== -1 &&
        createExecutionJob !== -1 &&
        capabilityCheck < createExecutionJob
      );
    },
  },
  {
    name: "POST supports queue-only creation without executing",
    test: () =>
      /if\s*\(!execute\)/.test(post) &&
      post.indexOf("if (!execute)") <
        post.indexOf("reserveExecution("),
  },
  {
    name: "POST reserves quota before executing the job",
    test: () => {
      const reservation = post.indexOf(
        "reserveExecution(",
      );
      const execution = post.indexOf(
        "executeJob(",
      );

      return (
        reservation !== -1 &&
        execution !== -1 &&
        reservation < execution
      );
    },
  },
  {
    name: "POST rejects denied reservations with HTTP 429",
    test: () =>
      /if\s*\(\s*!usage\.allowed\s*\)/.test(
        post,
      ) &&
      /"EXECUTION_LIMIT_REACHED"/.test(
        post,
      ) &&
      /status:\s*429/.test(post),
  },
  {
    name: "POST marks a quota-denied created job as failed",
    test: () => {
      const deniedIndex = post.search(
        /if\s*\(\s*!usage\.allowed\s*\)/,
      );
      const failureIndex = post.indexOf(
        "markExecutionJobFailed(",
      );

      return (
        deniedIndex !== -1 &&
        failureIndex !== -1 &&
        failureIndex > deniedIndex &&
        /job\.id/.test(
          post.slice(
            deniedIndex,
            failureIndex + 200,
          ),
        )
      );
    },
  },
  {
    name: "Execution jobs use UUID-backed identifiers",
    test: () =>
      createJobId.length > 0 &&
      /crypto\.randomUUID\(\)/.test(
        createJobId,
      ),
  },
  {
    name: "Execution job identifiers preserve the job prefix",
    test: () =>
      createJobId.length > 0 &&
      /"job"/.test(createJobId) &&
      /\.join\("-"\)/.test(
        createJobId,
      ),
  },
  {
    name: "Execution job identifiers do not use Math.random",
    test: () =>
      createJobId.length > 0 &&
      !/Math\.random\(/.test(
        createJobId,
      ),
  },
  {
    name: "Execution job creation uses the hardened identifier generator",
    test: () =>
      createJob.length > 0 &&
      /id:\s*createJobId\(\)/.test(
        createJob,
      ),
  },
  {
    name: "Optional persisted string validator allows undefined",
    test: () =>
      optionalStringGuard.length > 0 &&
      /value === undefined/.test(
        optionalStringGuard,
      ),
  },
  {
    name: "Optional persisted string validator rejects non-strings",
    test: () =>
      optionalStringGuard.length > 0 &&
      /typeof value === "string"/.test(
        optionalStringGuard,
      ),
  },
  {
    name: "Optional persisted number validator allows undefined",
    test: () =>
      optionalFiniteNumberGuard.length > 0 &&
      /value === undefined/.test(
        optionalFiniteNumberGuard,
      ),
  },
  {
    name: "Optional persisted number validator requires finite numbers",
    test: () =>
      optionalFiniteNumberGuard.length > 0 &&
      /typeof value === "number"/.test(
        optionalFiniteNumberGuard,
      ) &&
      /Number\.isFinite\(\s*value\s*\)/.test(
        optionalFiniteNumberGuard,
      ),
  },
  {
    name: "Persisted verification records reject null and non-objects",
    test: () =>
      verificationGuard.length > 0 &&
      /!value/.test(
        verificationGuard,
      ) &&
      /typeof value !== "object"/.test(
        verificationGuard,
      ),
  },
  {
    name: "Persisted verification records validate allowed statuses",
    test: () =>
      verificationGuard.length > 0 &&
      /\["pending", "passed", "failed"\]\.includes\(/.test(
        verificationGuard,
      ) &&
      /verification\.status/.test(
        verificationGuard,
      ),
  },
  {
    name: "Persisted verification records require a finite checkedAt",
    test: () =>
      verificationGuard.length > 0 &&
      /typeof verification\.checkedAt === "number"/.test(
        verificationGuard,
      ) &&
      /Number\.isFinite\(\s*verification\.checkedAt\s*,?\s*\)/.test(
        verificationGuard,
      ),
  },
  {
    name: "Persisted verification messages remain optional strings",
    test: () =>
      verificationGuard.length > 0 &&
      /verification\.message === undefined/.test(
        verificationGuard,
      ) &&
      /typeof verification\.message === "string"/.test(
        verificationGuard,
      ),
  },
  {
    name: "Persisted execution jobs validate optional persisted fields",
    test: () =>
      jobGuard.length > 0 &&
      /isOptionalString\(\s*job\.planId\s*,?\s*\)/.test(
        jobGuard,
      ) &&
      /isOptionalString\(\s*job\.taskId\s*,?\s*\)/.test(
        jobGuard,
      ) &&
      /isOptionalString\(\s*job\.result\s*,?\s*\)/.test(
        jobGuard,
      ) &&
      /isOptionalString\(\s*job\.error\s*,?\s*\)/.test(
        jobGuard,
      ) &&
      /isOptionalFiniteNumber\(\s*job\.startedAt\s*,?\s*\)/.test(
        jobGuard,
      ) &&
      /isOptionalFiniteNumber\(\s*job\.completedAt\s*,?\s*\)/.test(
        jobGuard,
      ),
  },
  {
    name: "Persisted execution jobs require a non-empty identifier",
    test: () =>
      jobGuard.length > 0 &&
      /typeof job\.id === "string"/.test(
        jobGuard,
      ) &&
      /job\.id\.length > 0/.test(
        jobGuard,
      ),
  },
  {
    name: "Persisted execution jobs validate retry counts",
    test: () =>
      jobGuard.length > 0 &&
      /Number\.isInteger\(\s*job\.retryCount\s*,?\s*\)/.test(
        jobGuard,
      ) &&
      /job\.retryCount >= 0/.test(
        jobGuard,
      ),
  },
  {
    name: "Persisted execution jobs validate finite timestamps",
    test: () =>
      jobGuard.length > 0 &&
      /Number\.isFinite\(\s*job\.createdAt\s*,?\s*\)/.test(
        jobGuard,
      ) &&
      /Number\.isFinite\(\s*job\.updatedAt\s*,?\s*\)/.test(
        jobGuard,
      ),
  },
  {
    name: "Persisted execution jobs use the verification guard",
    test: () =>
      jobGuard.length > 0 &&
      /isExecutionJobVerification\(\s*job\.verification\s*,?\s*\)/.test(
        jobGuard,
      ),
  },
  {
    name: "Stored execution jobs are filtered through validation",
    test: () =>
      readJobs.length > 0 &&
      /\.filter\(isExecutionJob\)/.test(
        readJobs,
      ),
  },
  {
    name: "PATCH only accepts the retry action",
    test: () =>
      /action\s*!==\s*"retry"/.test(
        patch,
      ) &&
      /"INVALID_ACTION"/.test(patch),
  },
  {
    name: "PATCH verifies that the job exists before reserving quota",
    test: () => {
      const lookup = patch.indexOf(
        "getExecutionJob(id)",
      );
      const missingCheck = patch.indexOf(
        "if (!existingJob)",
      );
      const reservation = patch.indexOf(
        "reserveExecution(",
      );

      return (
        lookup !== -1 &&
        missingCheck !== -1 &&
        reservation !== -1 &&
        lookup < missingCheck &&
        missingCheck < reservation
      );
    },
  },
  {
    name: "PATCH only reserves quota for failed jobs",
    test: () => {
      const statusCheck = patch.indexOf(
        "existingJob.status !==",
      );
      const reservation = patch.indexOf(
        "reserveExecution(",
      );

      return (
        statusCheck !== -1 &&
        reservation !== -1 &&
        statusCheck < reservation &&
        /"JOB_NOT_RETRYABLE"/.test(
          patch.slice(
            statusCheck,
            reservation,
          ),
        )
      );
    },
  },
  {
    name: "PATCH rejects denied retry reservations with HTTP 429",
    test: () =>
      /if\s*\(\s*!usage\.allowed\s*\)/.test(
        patch,
      ) &&
      /"EXECUTION_LIMIT_REACHED"/.test(
        patch,
      ) &&
      /status:\s*429/.test(patch),
  },
  {
    name: "PATCH checks the queued retry result before execution",
    test: () => {
      const retry = patch.indexOf(
        "retryExecutionJob(",
      );
      const queuedCheck = patch.indexOf(
        "queuedJob.status !==",
      );
      const execution = patch.indexOf(
        "executeJob(",
      );

      return (
        retry !== -1 &&
        queuedCheck !== -1 &&
        execution !== -1 &&
        retry < queuedCheck &&
        queuedCheck < execution &&
        /"JOB_NOT_RETRYABLE"/.test(
          patch.slice(
            queuedCheck,
            execution,
          ),
        )
      );
    },
  },
  {
    name: "PATCH executes the queued job using its stored input",
    test: () =>
      /executeJob\(\s*queuedJob\.id\s*,\s*queuedJob\.input\s*,?\s*\)/.test(
        patch,
      ),
  },
  {
    name: "Usage reservation denies requests at the configured limit",
    test: () =>
      /limit\s*!==\s*null\s*&&\s*usage\.count\s*>=\s*limit/.test(
        usage,
      ) ||
      /atomic\.reserved/.test(
        usage,
      ),
  },
  {
    name: "Successful usage reservation increments the count",
    test: () =>
      /count:\s*usage\.count\s*\+\s*1/.test(
        usage,
      ) &&
      /await\s+writeUsage\(\s*updated\s*,?\s*\)/.test(
        usage,
      ),
  },
  {
    name: "Retry storage refuses jobs that are not failed",
    test: () =>
      /if\s*\(job\.status\s*!==\s*"failed"\)\s*\{\s*return job;\s*\}/.test(
        jobStore,
      ),
  },
  {
    name: "Retry storage increments retry count and clears prior errors",
    test: () =>
      /retryCount:\s*job\.retryCount\s*\+\s*1/.test(
        jobStore,
      ) &&
      /error:\s*null/.test(
        jobStore,
      ) &&
      /status:\s*"queued"/.test(
        jobStore,
      ),
  },
  {
    name: "Redis execution quota reservation uses Lua EVAL",
    test: () =>
      /RESERVE_EXECUTION_USAGE_SCRIPT/.test(
        redis,
      ) &&
      /"EVAL"/.test(
        redis,
      ) &&
      /reserveExecutionUsageAtomic/.test(
        redis,
      ),
  },
  {
    name: "Redis quota reservation checks the limit before incrementing",
    test: () =>
      /record\.count >= limit/.test(
        redis,
      ) &&
      /record\.count = math\.floor\(math\.max\(0, record\.count\)\) \+ 1/.test(
        redis,
      ),
  },
  {
    name: "Execution usage selects atomic reservation in Redis mode",
    test: () =>
      /storage\.mode\s*===\s*"redis"/.test(
        usage,
      ) &&
      /reserveExecutionUsageAtomic\(/.test(
        usage,
      ) &&
      /getNamespacedStorageKey\(/.test(
        usage,
      ),
  },
  {
    name: "Execution usage preserves the Memory Storage path",
    test: () =>
      /await\s+readUsage\(\)/.test(
        usage,
      ) &&
      /await\s+writeUsage\(\s*updated\s*,?\s*\)/.test(
        usage,
      ),
  },
];

for (const check of checks) {
  let passed = false;

  try {
    passed = check.test();
  } catch {
    passed = false;
  }

  if (!passed) {
    failures.push(check.name);
  }
}

if (failures.length > 0) {
  console.error(
    "Execution usage verification FAILED.",
  );

  failures.forEach((failure) =>
    console.error(`- ${failure}`),
  );

  process.exit(1);
}

console.log(
  "Execution usage static verification PASSED.",
);

console.log(
  `Checks passed: ${checks.length}`,
);

console.log(
  "- Malformed JSON request boundary",
);

console.log(
  "- POST and PATCH invalid JSON handling",
);

console.log(
  "- Execution input size boundary",
);

console.log(
  "- Input validation before capability and job creation",
);

console.log(
  "- UUID-backed execution job identifiers",
);

console.log(
  "- Stable execution job identifier prefix",
);

console.log(
  "- Math.random identifier regression protection",
);

console.log(
  "- Optional persisted execution job field validators",
);

console.log(
  "- Persisted execution verification validation",
);

console.log(
  "- Persisted execution job integrity validation",
);

console.log(
  "- Optional persisted execution job field validation",
);

console.log(
  "- Persisted job filtering boundary",
);

console.log(
  "- POST execution quota boundary",
);

console.log(
  "- Queue-only job creation boundary",
);

console.log(
  "- Quota-denied job failure handling",
);

console.log(
  "- PATCH retry action and job-state validation",
);

console.log(
  "- Retry quota reservation and execution ordering",
);

console.log(
  "- Daily usage limit enforcement",
);

console.log(
  "- Redis atomic execution quota reservation",
);

console.log(
  "- Memory Storage fallback path",
);

console.log(
  "- Retry state reset and retry counter",
);

console.log("");

console.log(
  "Note: This is a static source check, not a live quota or concurrency test.",
);
