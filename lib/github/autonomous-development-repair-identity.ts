const GIT_COMMIT_SHA_PATTERN = /^[0-9a-f]{40}$/i;

export function assertRepairBaseIdentity(
  expectedBaseSha: unknown,
  actualBaseSha: unknown,
): void {
  if (
    typeof expectedBaseSha !== "string" ||
    !GIT_COMMIT_SHA_PATTERN.test(expectedBaseSha.trim())
  ) {
    throw new Error(
      "AUTONOMOUS_REPAIR_EXPECTED_BASE_SHA_INVALID",
    );
  }

  if (
    typeof actualBaseSha !== "string" ||
    !GIT_COMMIT_SHA_PATTERN.test(actualBaseSha.trim())
  ) {
    throw new Error(
      "AUTONOMOUS_REPAIR_ACTUAL_BASE_SHA_INVALID",
    );
  }

  if (
    expectedBaseSha.trim().toLowerCase() !==
    actualBaseSha.trim().toLowerCase()
  ) {
    throw new Error(
      "AUTONOMOUS_REPAIR_BASE_IDENTITY_MISMATCH",
    );
  }
}
