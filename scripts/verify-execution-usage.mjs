import { existsSync, readFileSync } from "node:fs";
const files = {
  route: "app/api/execution/jobs/route.ts",
  usage: "lib/billing/execution-usage.ts",
  jobStore: "lib/execution/job-store.ts",
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
function extractFunction(source, signature, nextSignature) {
  const start = source.indexOf(signature);
  if (start === -1) {
    return "";
  }
  if (!nextSignature) {
    return source.slice(start);
  }
  const end = source.indexOf(nextSignature, start + signature.length);
  if (end === -1) {
    return source.slice(start);
  }
  return source.slice(start, end);
}
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
    name: "POST validates the execution goal before creating a job",
    test: () =>
      /if\s*\(!goal\)/.test(post) &&
      post.indexOf("if (!goal)") <
        post.indexOf("createExecutionJob("),
  },
  {
    name: "POST checks execution capability before creating a job",
    test: () => {
      const capabilityCheck = post.indexOf(
        "if (\n      !capability.allowed",
      );
      const createJob = post.indexOf("createExecutionJob(");
      return (
        post.includes("canUseCapability(") &&
        capabilityCheck !== -1 &&
        createJob !== -1 &&
        capabilityCheck < createJob
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
      const reservation = post.indexOf("reserveExecution(");
      const execution = post.indexOf("executeJob(");
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
      /if\s*\(\s*!usage\.allowed\s*\)/.test(post) &&
      /"EXECUTION_LIMIT_REACHED"/.test(post) &&
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
          post.slice(deniedIndex, failureIndex + 200),
        )
      );
    },
  },
  {
    name: "PATCH only accepts the retry action",
    test: () =>
      /action\s*!==\s*"retry"/.test(patch) &&
      /"INVALID_ACTION"/.test(patch),
  },
  {
    name: "PATCH verifies that the job exists before reserving quota",
    test: () => {
      const lookup = patch.indexOf("getExecutionJob(id)");
      const missingCheck = patch.indexOf("if (!existingJob)");
      const reservation = patch.indexOf("reserveExecution(");
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
      const reservation = patch.indexOf("reserveExecution(");
      return (
        statusCheck !== -1 &&
        reservation !== -1 &&
        statusCheck < reservation &&
        /"JOB_NOT_RETRYABLE"/.test(
          patch.slice(statusCheck, reservation),
        )
      );
    },
  },
  {
    name: "PATCH rejects denied retry reservations with HTTP 429",
    test: () =>
      /if\s*\(\s*!usage\.allowed\s*\)/.test(patch) &&
      /"EXECUTION_LIMIT_REACHED"/.test(patch) &&
      /status:\s*429/.test(patch),
  },
  {
    name: "PATCH checks the queued retry result before execution",
    test: () => {
      const retry = patch.indexOf("retryExecutionJob(");
      const queuedCheck = patch.indexOf("queuedJob.status !==");
      const execution = patch.indexOf("executeJob(");
      return (
        retry !== -1 &&
        queuedCheck !== -1 &&
        execution !== -1 &&
        retry < queuedCheck &&
        queuedCheck < execution &&
        /"JOB_NOT_RETRYABLE"/.test(
          patch.slice(queuedCheck, execution),
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
      ),
  },
  {
    name: "Successful usage reservation increments the count",
    test: () =>
      /const updatedCount\s*=\s*usage\.count\s*\+\s*1/.test(
        usage,
      ) &&
      /await\s+writeUsage\(\s*updated\s*,?\s*\)/.test(usage),
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
      /retryCount:\s*job\.retryCount\s*\+\s*1/.test(jobStore) &&
      /error:\s*null/.test(jobStore) &&
      /status:\s*"queued"/.test(jobStore),
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
  console.error("Execution usage verification FAILED.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log("Execution usage static verification PASSED.");
console.log(`Checks passed: ${checks.length}`);
console.log("- POST execution quota boundary");
console.log("- Queue-only job creation boundary");
console.log("- Quota-denied job failure handling");
console.log("- PATCH retry action and job-state validation");
console.log("- Retry quota reservation and execution ordering");
console.log("- Daily usage limit enforcement");
console.log("- Retry state reset and retry counter");
console.log("");
console.log(
  "Note: This is a static source check, not a live quota or concurrency test.",
);
