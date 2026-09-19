import { NextRequest } from "next/server";

function getFounderAccessKey(): string {
  return (
    process.env.FOUNDER_ACCESS_KEY ||
    process.env.AIOS_FOUNDER_ACCESS_KEY ||
    ""
  ).trim();
}

function getRequestAccessKey(request: NextRequest): string {
  const authorization = request.headers.get("authorization") || "";

  if (authorization.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim();
  }

  return (
    request.headers.get("x-founder-access-key") ||
    request.headers.get("x-access-key") ||
    ""
  ).trim();
}

export function isFounderRequest(request: NextRequest): boolean {
  const configuredKey = getFounderAccessKey();

  if (!configuredKey) {
    return false;
  }

  const requestKey = getRequestAccessKey(request);

  if (!requestKey) {
    return false;
  }

  return requestKey === configuredKey;
}

export function requireFounderAccess(
  request: NextRequest
): { authorized: true } | { authorized: false; response: Response } {
  if (isFounderRequest(request)) {
    return { authorized: true };
  }

  return {
    authorized: false,
    response: new Response(
      JSON.stringify({
        success: false,
        error: "Founder access required.",
        code: "FOUNDER_AUTH_REQUIRED",
      }),
      {
        status: 401,
        headers: {
          "content-type": "application/json; charset=utf-8",
          "cache-control": "no-store",
        },
      }
    ),
  };
}
