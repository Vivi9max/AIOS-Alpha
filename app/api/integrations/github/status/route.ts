import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ensureUserGitHubConnection,
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

  if (!connection) {
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
          connection.githubUserId,
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
