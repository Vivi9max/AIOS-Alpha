export const ALPHA_ACCESS_COOKIE =
  "aios_alpha_access";

export const ALPHA_ACCESS_VALUE =
  "granted_v1";

export function getAlphaInviteCode():
  string {
  const configuredCode =
    process.env
      .ALPHA_INVITE_CODE
      ?.trim();

  if (configuredCode) {
    return configuredCode;
  }

  if (
    process.env.NODE_ENV !==
    "production"
  ) {
    return "AIOS-ALPHA-2026";
  }

  return "";
}

export function verifyAlphaInviteCode(
  value: string
): boolean {
  const expectedCode =
    getAlphaInviteCode();

  if (!expectedCode) {
    return false;
  }

  return (
    value.trim() ===
    expectedCode
  );
}