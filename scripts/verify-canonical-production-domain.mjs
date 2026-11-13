import fs from "node:fs";
import { pathToFileURL } from "node:url";

import {
  verifyDeployment,
} from "./verify-deployment.mjs";

export const CANONICAL_PRODUCTION_URL =
  "https://aiosalpha.com";

export async function verifyCanonicalProductionDomain({
  env = process.env,
  fetchImpl = fetch,
  log = console,
  verifyImpl = verifyDeployment,
} = {}) {
  const outputPath =
    env.AIOS_CANONICAL_DOMAIN_VERIFICATION_OUTPUT;

  if (
    typeof outputPath !== "string" ||
    outputPath.trim().length === 0
  ) {
    throw new Error(
      "AIOS_CANONICAL_DOMAIN_VERIFICATION_OUTPUT is required.",
    );
  }

  const expectedSha =
    typeof env.EXPECTED_COMMIT_SHA === "string"
      ? env.EXPECTED_COMMIT_SHA.trim().toLowerCase()
      : "";

  if (!/^[a-f0-9]{40}$/.test(expectedSha)) {
    throw new Error(
      "EXPECTED_COMMIT_SHA must be a full 40-character Git commit SHA.",
    );
  }

  const canonicalUrl = new URL(
    CANONICAL_PRODUCTION_URL,
  );

  if (
    canonicalUrl.protocol !== "https:" ||
    canonicalUrl.hostname !== "aiosalpha.com"
  ) {
    throw new Error(
      "Canonical Production domain configuration is invalid.",
    );
  }

  const result = await verifyImpl({
    baseUrl: CANONICAL_PRODUCTION_URL,

    env: {
      ...env,
      EXPECTED_COMMIT_SHA: expectedSha,
      AIOS_PRODUCTION_VERIFICATION_OUTPUT: outputPath,
    },

    fetchImpl,
    log,
  });

  if (
    result?.ok !== true ||
    result?.status !== "PRODUCTION_VERIFIED"
  ) {
    throw new Error(
      "Canonical Production domain verification did not return a verified result.",
    );
  }

  if (
    result.expectedCommitSha !== expectedSha ||
    result.observedCommitSha !== expectedSha
  ) {
    throw new Error(
      "Canonical Production domain Commit SHA mismatch.",
    );
  }

  const receipt = JSON.parse(
    fs.readFileSync(outputPath, "utf8"),
  );

  if (
    receipt.status !== "PRODUCTION_VERIFIED" ||
    receipt.expectedCommitSha !== expectedSha ||
    receipt.observedCommitSha !== expectedSha ||
    receipt.repository !== "Vivi9max/AIOS-Alpha" ||
    receipt.deploymentUrl !== CANONICAL_PRODUCTION_URL
  ) {
    throw new Error(
      "Canonical Production domain receipt validation failed.",
    );
  }

  log.log(
    "Canonical Production domain verification passed.",
  );

  log.log(
    `Canonical domain: ${CANONICAL_PRODUCTION_URL}`,
  );

  log.log(
    `Verified Commit SHA: ${expectedSha}`,
  );

  return {
    ok: true,
    verificationType: "CANONICAL_DOMAIN_ALIAS",
    canonicalDomain: CANONICAL_PRODUCTION_URL,
    ...result,
  };
}

const isDirectExecution =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectExecution) {
  verifyCanonicalProductionDomain().catch((error) => {
    console.error(
      "Canonical Production domain verification failed.",
    );

    console.error(
      error instanceof Error
        ? error.message
        : String(error),
    );

    process.exitCode = 1;
  });
}
