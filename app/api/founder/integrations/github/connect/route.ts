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
  setGitHubOAuthStateCookie,
} from "@/lib/integrations/github/user-github";

const FOUNDER_GITHUB_USER_ID =
  "founder:aios-alpha";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function getClientConfigurationError():
  string | null {
  const clientId =
    process.env.GITHUB_APP_CLIENT_ID?.trim();

  const appId =
    process.env.GITHUB_APP_ID?.trim();

  if (!clientId) {
    return (
      "GITHUB_APP_CLIENT_ID is missing."
    );
  }

  if (!appId) {
    return (
      "GITHUB_APP_ID is missing."
    );
  }

  if (
    clientId === appId
  ) {
    return (
      "GITHUB_APP_CLIENT_ID must be the GitHub App Client ID, not GITHUB_APP_ID."
    );
  }

  if (
    /^\d+$/.test(clientId)
  ) {
    return (
      "GITHUB_APP_CLIENT_ID appears to be a numeric App ID. Use the GitHub App Client ID instead."
    );
  }

  return null;
}

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

  const configurationError =
    getClientConfigurationError();

  if (configurationError) {
    return NextResponse.json(
      {
        success: false,
        code:
          "GITHUB_OAUTH_CLIENT_CONFIGURATION_INVALID",
        error:
          configurationError,
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

  try {
    const {
      authorizationUrl,
      stateCookieValue,
    } =
      beginUserGitHubConnect(
        request,
        FOUNDER_GITHUB_USER_ID,
      );

    const response =
      NextResponse.json(
        {
          success: true,
          authorizationUrl,
        },
        {
          status: 200,
          headers: {
            "Cache-Control":
              "no-store",
            "X-AIOS-GitHub-OAuth":
              "ready",
          },
        },
      );

    setGitHubOAuthStateCookie(
      response,
      stateCookieValue,
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
