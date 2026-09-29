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
  const connection =
    await ensureUserGitHubConnection(
      request,
      response,
    );
  const setCookie =
    response.headers.get(
      "Set-Cookie",
    );
  if (
    !connection ||
    connection.userId !==
      FOUNDER_GITHUB_USER_ID
  ) {
    const result =
      NextResponse.json(
        {
          success: false,
          code:
            "GITHUB_NOT_CONNECTED",
          error:
            "Founder GitHub account is not connected.",
        },
        {
          status: 401,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    if (setCookie) {
      result.headers.set(
        "Set-Cookie",
        setCookie,
      );
    }
    return result;
  }
  const repositoryResult =
    await listUserGitHubRepositories(
      connection,
    );
  if (
    !repositoryResult.success
  ) {
    const result =
      NextResponse.json(
        repositoryResult,
        {
          status: 502,
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    if (setCookie) {
      result.headers.set(
        "Set-Cookie",
        setCookie,
      );
    }
    return result;
  }
  const result =
    NextResponse.json(
      repositoryResult,
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  if (setCookie) {
    result.headers.set(
      "Set-Cookie",
      setCookie,
    );
  }
  return result;
}
