import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  ensureUserGitHubConnection,
  isUserGitHubConfigured,
  listUserGitHubRepositories,
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

  const response =
    NextResponse.json(
      {
        success: false,
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
    return NextResponse.json(
      {
        success: false,
        code:
          "GITHUB_NOT_CONNECTED",
        error:
          "GitHub account is not connected.",
      },
      {
        status: 401,
      },
    );
  }

  const result =
    await listUserGitHubRepositories(
      connection,
    );

  if (
    !result.success
  ) {
    return NextResponse.json(
      result,
      {
        status: 502,
      },
    );
  }

  return NextResponse.json(
    result,
    {
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}
