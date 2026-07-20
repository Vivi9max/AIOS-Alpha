import type {
  NextRequest,
} from "next/server";

const FOUNDER_HEADER =
  "x-aios-founder-key";

function getConfiguredFounderKey():
  string {
  return (
    process.env
      .FOUNDER_ACCESS_KEY
      ?.trim() ?? ""
  );
}

function getRequestFounderKey(
  request:
    NextRequest
): string {
  const directHeader =
    request.headers
      .get(
        FOUNDER_HEADER
      )
      ?.trim();

  if (directHeader) {
    return directHeader;
  }

  const authorization =
    request.headers
      .get(
        "authorization"
      )
      ?.trim();

  if (
    authorization
      ?.toLowerCase()
      .startsWith(
        "bearer "
      )
  ) {
    return authorization
      .slice(7)
      .trim();
  }

  return "";
}

function secureCompare(
  first:
    string,

  second:
    string
): boolean {
  if (
    !first ||
    !second ||
    first.length !==
      second.length
  ) {
    return false;
  }

  let result =
    0;

  for (
    let index = 0;
    index <
    first.length;
    index += 1
  ) {
    result |=
      first.charCodeAt(
        index
      ) ^
      second.charCodeAt(
        index
      );
  }

  return result === 0;
}

export function isFounderConfigured():
  boolean {
  return Boolean(
    getConfiguredFounderKey()
  );
}

export function isFounderRequest(
  request:
    NextRequest
): boolean {
  const configuredKey =
    getConfiguredFounderKey();

  const requestKey =
    getRequestFounderKey(
      request
    );

  return secureCompare(
    configuredKey,
    requestKey
  );
}