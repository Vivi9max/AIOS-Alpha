import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  beginUserGitHubConnect,
  isUserGitHubConfigured,
} from "@/lib/integrations/github/user-github";

const FOUNDER_GITHUB_USER_ID =
  "founder:aios-alpha";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

export async function GET(
  request: NextRequest,
) {
  if (
    !isFounderRequest(
      request,
    )
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "FOUNDER_AUTH_REQUIRED",
        error:
          "Founder authorization is required.",
      },
      {
        status: 401,
      },
    );
  }

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

  const response =
    NextResponse.json(
      {
        success: false,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );

  try {
    const authorizationUrl =
      beginUserGitHubConnect(
        request,
        response,
        FOUNDER_GITHUB_USER_ID,
      );

    response.headers.set(
      "Content-Type",
      "application/json",
    );

    response.headers.set(
      "Cache-Control",
      "no-store",
    );

    response.headers.set(
      "X-AIOS-GitHub-OAuth",
      "ready",
    );

    const body =
      JSON.stringify({
        success: true,
        authorizationUrl,
      });

    return new NextResponse(
      body,
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/json",
          "Cache-Control":
            "no-store",
          "Set-Cookie":
            response.headers.get(
              "Set-Cookie",
            ) || "",
          "X-AIOS-GitHub-OAuth":
            "ready",
        },
      },
    );
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
            : "GitHub authorization could not start.",
      },
      {
        status: 500,
      },
    );
  }
}
