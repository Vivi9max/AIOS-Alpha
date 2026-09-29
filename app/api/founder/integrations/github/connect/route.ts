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
        headers: {
          "Cache-Control":
            "no-store",
        },
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
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  try {
    const response =
      new NextResponse(
        null,
        {
          status: 200,
          headers: {
            "Cache-Control":
              "no-store",
            "Content-Type":
              "application/json",
            "X-AIOS-GitHub-OAuth":
              "ready",
          },
        },
      );

    const authorizationUrl =
      beginUserGitHubConnect(
        request,
        response,
        FOUNDER_GITHUB_USER_ID,
      );

    response.body;

    return new NextResponse(
      JSON.stringify({
        success: true,
        authorizationUrl,
      }),
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
          "Content-Type":
            "application/json",
          "X-AIOS-GitHub-OAuth":
            "ready",
          "Set-Cookie":
            response.headers.get(
              "Set-Cookie",
            ) || "",
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
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }
}
