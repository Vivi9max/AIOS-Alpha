import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  completeUserGitHubConnect,
} from "@/lib/integrations/github/user-github";

const FOUNDER_GITHUB_USER_ID =
  "founder:aios-alpha";

export async function GET(
  request: NextRequest,
) {
  const url =
    new URL(
      request.url,
    );

  const code =
    url.searchParams.get(
      "code",
    );

  const state =
    url.searchParams.get(
      "state",
    );

  const error =
    url.searchParams.get(
      "error",
    );

  if (error) {
    return NextResponse.redirect(
      new URL(
        `/founder/integrations/github?github=error&reason=${encodeURIComponent(
          error,
        )}`,
        request.url,
      ),
    );
  }

  if (
    !code ||
    !state
  ) {
    return NextResponse.redirect(
      new URL(
        "/founder/integrations/github?github=error&reason=missing_callback",
        request.url,
      ),
    );
  }

  const response =
    NextResponse.redirect(
      new URL(
        "/founder/integrations/github?github=connected",
        request.url,
      ),
    );

  const result =
    await completeUserGitHubConnect(
      request,
      response,
      code,
      state,
    );

  if (
    !result.success
  ) {
    return NextResponse.redirect(
      new URL(
        `/founder/integrations/github?github=error&reason=${encodeURIComponent(
          result.error,
        )}`,
        request.url,
      ),
    );
  }

  if (
    result.connection.userId !==
    FOUNDER_GITHUB_USER_ID
  ) {
    return NextResponse.redirect(
      new URL(
        "/founder/integrations/github?github=error&reason=invalid_founder_connection",
        request.url,
      ),
    );
  }

  return response;
}
