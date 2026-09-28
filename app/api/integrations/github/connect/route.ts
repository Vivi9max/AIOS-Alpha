import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  AIOS_USER_COOKIE,
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  beginUserGitHubConnect,
  isUserGitHubConfigured,
} from "@/lib/integrations/github/user-github";

export async function GET(
  request: NextRequest,
) {
  if (
    !isUserGitHubConfigured()
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "GITHUB_APP_NOT_CONFIGURED",
        error:
          "GitHub App is not configured.",
      },
      {
        status: 503,
      },
    );
  }

  const identity =
    resolveAlphaIdentity(
      request,
    );

  const response =
    NextResponse.redirect(
      new URL(
        "/settings",
        request.url,
      ),
    );

  if (
    identity.isNew
  ) {
    response.cookies.set(
      AIOS_USER_COOKIE,
      identity.userId,
      {
        httpOnly: true,
        secure:
          process.env.NODE_ENV ===
          "production",
        sameSite: "lax",
        path: "/",
        maxAge:
          60 * 60 * 24 * 365,
      },
    );
  }

  try {
    const authorizationUrl =
      beginUserGitHubConnect(
        request,
        response,
        identity.userId,
      );

    response.headers.set(
      "Location",
      authorizationUrl,
    );

    return response;
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "GITHUB_CONNECT_START_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "GitHub connection could not start.",
      },
      {
        status: 500,
      },
    );
  }
}
