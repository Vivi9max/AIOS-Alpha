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
  listUserGitHubRepositories,
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

  if (
    !connection ||
    connection.userId !==
      FOUNDER_GITHUB_USER_ID
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "GITHUB_NOT_CONNECTED",
        error:
          "Founder GitHub account is not connected.",
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
