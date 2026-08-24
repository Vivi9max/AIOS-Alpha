import type { NextRequest } from "next/server";

const FOUNDER_HEADER = "x-aios-founder-key";
const FOUNDER_AUTHORIZATION = "authorization";

export type FounderAuthFailure =
  | "not-configured"
  | "missing-key"
  | "invalid-key";

export interface FounderAuthDiagnostics {
  configured: boolean;
  authenticated: boolean;
  failure: FounderAuthFailure | null;
  source:
    | "x-aios-founder-key"
    | "authorization"
    | "none";
}

function getConfiguredFounderKey(): string {
  return (
    process.env.FOUNDER_ACCESS_KEY?.trim() ?? ""
  );
}

function getRequestFounderKey(
  request: NextRequest,
): {
  key: string;
  source: FounderAuthDiagnostics["source"];
} {
  const directHeader = request.headers
    .get(FOUNDER_HEADER)
    ?.trim();

  if (directHeader) {
    return {
      key: directHeader,
      source: "x-aios-founder-key",
    };
  }

  const authorization = request.headers
    .get(FOUNDER_AUTHORIZATION)
    ?.trim();

  if (
    authorization
      ?.toLowerCase()
      .startsWith("bearer ")
  ) {
    return {
      key: authorization
        .slice(7)
        .trim(),
      source: "authorization",
    };
  }

  return {
    key: "",
    source: "none",
  };
}

function secureCompare(
  first: string,
  second: string,
): boolean {
  if (
    !first ||
    !second ||
    first.length !== second.length
  ) {
    return false;
  }

  let result = 0;

  for (
    let index = 0;
    index < first.length;
    index += 1
  ) {
    result |=
      first.charCodeAt(index) ^
      second.charCodeAt(index);
  }

  return result === 0;
}

export function isFounderConfigured(): boolean {
  return Boolean(
    getConfiguredFounderKey(),
  );
}

export function getFounderAuthDiagnostics(
  request: NextRequest,
): FounderAuthDiagnostics {
  const configuredKey =
    getConfiguredFounderKey();

  const requestData =
    getRequestFounderKey(request);

  if (!configuredKey) {
    return {
      configured: false,
      authenticated: false,
      failure: "not-configured",
      source: requestData.source,
    };
  }

  if (!requestData.key) {
    return {
      configured: true,
      authenticated: false,
      failure: "missing-key",
      source: requestData.source,
    };
  }

  const authenticated =
    secureCompare(
      configuredKey,
      requestData.key,
    );

  return {
    configured: true,
    authenticated,
    failure: authenticated
      ? null
      : "invalid-key",
    source: requestData.source,
  };
}

export function isFounderRequest(
  request: NextRequest,
): boolean {
  return getFounderAuthDiagnostics(
    request,
  ).authenticated;
}
