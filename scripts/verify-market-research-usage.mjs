import { existsSync, readFileSync } from "node:fs";

const files = {
  usage: "lib/billing/market-research-usage.ts",
  redis: "lib/server-storage/redis.ts",
  route: "app/api/market/intelligence/route.ts",
};

const failures = [];

for (const file of Object.values(files)) {
  if (!existsSync(file)) {
    failures.push(`Required file is missing: ${file}`);
  }
}

if (failures.length > 0) {
  console.error("Market Research usage verification FAILED.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

const usage = readFileSync(files.usage, "utf8");
const redis = readFileSync(files.redis, "utf8");
const route = readFileSync(files.route, "utf8");

const checks = [
  {
    name: "Quota reservation uses the atomic Redis operation",
    source: usage,
    pattern: /reserveMarketResearchUsageAtomic\s*\(/,
  },
  {
    name: "Final reservation acceptance uses the atomic reserved result",
    source: usage,
    pattern: /allowed:\s*result\.reserved\s*&&/,
  },
  {
    name: "Redis reservation script enforces the configured limit",
    source: redis,
    pattern: /record\.count\s*>=\s*limit/,
  },
  {
    name: "Redis reservation increments the usage count atomically",
    source: redis,
    pattern: /record\.count\s*=\s*Math\.floor\(Math\.max\(0,\s*record\.count\)\)\s*\+\s*1/,
  },
  {
    name: "Redis reservation result exposes the reserved flag",
    source: redis,
    pattern: /reserved:\s*parsed\.reserved/,
  },
  {
    name: "Failed analysis releases its reservation",
    source: route,
    pattern: /if\s*\(!result\.success\)\s*\{\s*await\s+releaseReservationOnce\(\)/,
  },
  {
    name: "Reservation release is protected against duplicate calls",
    source: route,
    pattern: /if\s*\(reservationReleaseAttempted\)\s*\{\s*return;\s*\}/,
  },
  {
    name: "API rejects requests when reservation is denied",
    source: route,
    pattern: /if\s*\(!reservation\.allowed\)/,
  },
];

for (const check of checks) {
  if (!check.pattern.test(check.source)) {
    failures.push(check.name);
  }
}

if (failures.length > 0) {
  console.error("Market Research usage verification FAILED.");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Market Research usage static verification PASSED.");
console.log(`Checks passed: ${checks.length}`);
console.log("- Atomic Redis quota reservation");
console.log("- Final reservation acceptance logic");
console.log("- Monthly limit enforcement");
console.log("- Reservation release on failed execution");
console.log("- Duplicate release protection");
console.log("- API limit rejection boundary");
console.log("");
console.log("Note: This is a static source check, not a live Redis integration test.");
