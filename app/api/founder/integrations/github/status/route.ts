import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  ensureUserGitHubConnection,
  isUserGitHubConfigured,
} from "@/lib/integrations/github/user-github";

const FOUNDER_GITHUB_USER_ID =
  "founder:aios-alpha";

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
        success: true,
        configured: false,
        connected: false,
        provider:
          "github-app",
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  const response =
    NextResponse.json(
      {
        success: true,
        configured: true,
        connected: false,
        provider:
          "github-app",
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );

  const connection =
    await ensureUserGitHubConnection(
      request,
      response,
    );

  if (
    !connection ||
    connection.userId !==
      FOUNDER_GITHUB_USER_ID
  ) {
    return response;
  }

  return NextResponse.json(
    {
      success: true,
      configured: true,
      connected: true,
      provider:
        "github-app",
      account: {
        id:
          String(
            connection.githubUserId,
          ),
        login:
          connection.login,
      },
      installationCount:
        connection.installationIds.length,
      accessExpiresAt:
        connection.accessExpiresAt,
    },
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}
