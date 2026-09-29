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

function maskClientId(
  value: string,
): string {
  if (
    value.length <=
    8
  ) {
    return "********";
  }

  return (
    value.slice(
      0,
      4,
    ) +
    "..." +
    value.slice(
      -4,
    )
  );
}

function getConfiguration():
  | {
      appId: string;
      clientId: string;
      appSlug: string;
      callbackUrl: string;
    }
  | null {
  const appId =
    process.env.GITHUB_APP_ID?.trim();

  const clientId =
    process.env.GITHUB_APP_CLIENT_ID?.trim();

  const appSlug =
    process.env.GITHUB_APP_SLUG?.trim();

  const callbackUrl =
    process.env.GITHUB_APP_CALLBACK_URL?.trim();

  if (
    !appId ||
    !clientId ||
    !appSlug ||
    !callbackUrl
  ) {
    return null;
  }

  return {
    appId,
    clientId,
    appSlug,
    callbackUrl,
  };
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

  const configuration =
    getConfiguration();

  if (!configuration) {
    return NextResponse.json(
      {
        success: false,
        code:
          "GITHUB_OAUTH_CONFIGURATION_INCOMPLETE",
        error:
          "GitHub OAuth configuration is incomplete.",
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

  const baseConfiguration = {
    appId:
      configuration.appId,

    clientId:
      maskClientId(
        configuration.clientId,
      ),

    clientIdNumeric:
      /^\d+$/.test(
        configuration.clientId,
      ),

    clientIdMatchesAppId:
      configuration.clientId ===
      configuration.appId,

    appSlug:
      configuration.appSlug,

    callbackUrl:
      configuration.callbackUrl,
  };

  if (
    baseConfiguration.clientIdMatchesAppId
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "GITHUB_CLIENT_ID_EQUALS_APP_ID",
        error:
          "GITHUB_APP_CLIENT_ID must be different from GITHUB_APP_ID.",
        configuration:
          baseConfiguration,
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

  if (
    baseConfiguration.clientIdNumeric
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "GITHUB_CLIENT_ID_LOOKS_LIKE_APP_ID",
        error:
          "GITHUB_APP_CLIENT_ID appears to be numeric. Use the GitHub App Client ID.",
        configuration:
          baseConfiguration,
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

  let authorizationUrl:
    string;

  try {
    authorizationUrl =
      beginUserGitHubConnect(
        request,
        FOUNDER_GITHUB_USER_ID,
      ).authorizationUrl;
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "GITHUB_OAUTH_URL_BUILD_FAILED",
        error:
          error instanceof Error
            ? error.message
            : "GitHub OAuth URL could not be built.",
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

  const parsedUrl =
    new URL(
      authorizationUrl,
    );

  const authorizationEndpoint =
    parsedUrl.origin +
    parsedUrl.pathname;

  let probe:
    | {
        status: number;
        statusText: string;
        accepted: boolean;
        locationHost:
          | string
          | null;
      }
    | null = null;

  try {
    const response =
      await fetch(
        authorizationUrl,
        {
          method:
            "GET",

          cache:
            "no-store",

          redirect:
            "manual",

          headers: {
            Accept:
              "text/html,application/xhtml+xml",

            "User-Agent":
              "AIOS-Alpha-GitHub-OAuth-Diagnostic",
          },
        },
      );

    const location =
      response.headers.get(
        "location",
      );

    let locationHost:
      | string
      | null = null;

    if (location) {
      try {
        locationHost =
          new URL(
            location,
          ).host;
      } catch {
        locationHost =
          null;
      }
    }

    probe = {
      status:
        response.status,

      statusText:
        response.statusText,

      accepted:
        response.status >=
          200 &&
        response.status <
          400,

      locationHost,
    };
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        success: false,
        code:
          "GITHUB_OAUTH_PROBE_FAILED",

        error:
          error instanceof Error
            ? error.message
            : "GitHub OAuth endpoint probe failed.",

        configuration: {
          ...baseConfiguration,
          authorizationEndpoint,
        },
      },
      {
        status: 502,
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  }

  return NextResponse.json(
    {
      success: true,

      diagnosis:
        probe.accepted
          ? "GITHUB_AUTHORIZE_ENDPOINT_ACCEPTED"
          : "GITHUB_AUTHORIZE_ENDPOINT_REJECTED",

      configuration: {
        ...baseConfiguration,
        authorizationEndpoint,
      },

      githubProbe: {
        attempted:
          true,

        ...probe,
      },

      authorizationRequest: {
        clientIdIncluded:
          Boolean(
            parsedUrl.searchParams.get(
              "client_id",
            ),
          ),

        redirectUriIncluded:
          Boolean(
            parsedUrl.searchParams.get(
              "redirect_uri",
            ),
          ),

        stateIncluded:
          Boolean(
            parsedUrl.searchParams.get(
              "state",
            ),
          ),

        pkceIncluded:
          parsedUrl.searchParams.get(
            "code_challenge_method",
          ) ===
          "S256",
      },

      security: {
        clientSecretExposed:
          false,

        stateExposed:
          false,

        codeChallengeExposed:
          false,
      },
    },
    {
      status:
        200,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}
