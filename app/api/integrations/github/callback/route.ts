import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  completeUserGitHubConnect,
} from "@/lib/integrations/github/user-github";

const FOUNDER_GITHUB_USER_ID =
  "founder:aios-alpha";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function redirectToFounder(
  request: NextRequest,
  params: Record<string, string>,
) {
  const url =
    new URL(
      "/founder/integrations/github",
      request.url,
    );

  for (
    const [key, value] of
    Object.entries(params)
  ) {
    url.searchParams.set(
      key,
      value,
    );
  }

  return NextResponse.redirect(
    url,
    {
      status: 303,
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

export async function GET(
  request: NextRequest,
) {
  const code =
    request.nextUrl.searchParams.get(
      "code",
    );

  const state =
    request.nextUrl.searchParams.get(
      "state",
    );

  const error =
    request.nextUrl.searchParams.get(
      "error",
    );

  const errorDescription =
    request.nextUrl.searchParams.get(
      "error_description",
    );

  if (error) {
    return redirectToFounder(
      request,
      {
        github:
          "error",
        reason:
          errorDescription ||
          error,
      },
    );
  }

  if (
    !code ||
    !state
  ) {
    return redirectToFounder(
      request,
      {
        github:
          "error",
        reason:
          "missing_callback",
      },
    );
  }

  const response =
    NextResponse.redirect(
      new URL(
        "/founder/integrations/github?github=connected",
        request.url,
      ),
      {
        status: 303,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );

  const result =
    await completeUserGitHubConnect(
      request,
      response,
      code,
      state,
      FOUNDER_GITHUB_USER_ID,
    );

  if (
    !result.success
  ) {
    return redirectToFounder(
      request,
      {
        github:
          "error",
        reason:
          result.error,
      },
    );
  }

  if (
    result.connection.userId !==
    FOUNDER_GITHUB_USER_ID
  ) {
    return redirectToFounder(
      request,
      {
        github:
          "error",
        reason:
          "invalid_founder_connection",
      },
    );
  }

  return response;
}
