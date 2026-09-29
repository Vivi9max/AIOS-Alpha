import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getGitHubRepository,
  githubBridgeStatus,
  listGitHubPath,
  readGitHubFile,
  resolveGitHubBridgeAuth,
  writeGitHubFile,
} from "@/lib/github/bridge";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type BridgeBody = {
  action?: unknown;
  repo?: unknown;
  path?: unknown;
  ref?: unknown;
  branch?: unknown;
  content?: unknown;
  message?: unknown;
  sha?: unknown;
};

function getRequestId(
  request: NextRequest,
): string {
  return (
    request.headers.get(
      "x-request-id",
    ) ??
    crypto.randomUUID()
  );
}

function getBridgeSecret():
  | string
  | null {
  return (
    process.env.GITHUB_BRIDGE_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    null
  );
}

function isLegacyAuthorized(
  request: NextRequest,
): boolean {
  const secret =
    getBridgeSecret();

  if (!secret) {
    return false;
  }

  const headerSecret =
    request.headers.get(
      "x-aios-bridge-secret",
    );

  if (
    headerSecret ===
    secret
  ) {
    return true;
  }

  const authorization =
    request.headers.get(
      "authorization",
    );

  return (
    authorization ===
    `Bearer ${secret}`
  );
}

async function authorize(
  request: NextRequest,
): Promise<{
  authorized: boolean;
  authMode:
    | "oauth"
    | "token"
    | "legacy-secret";
}> {
  const oauth =
    await resolveGitHubBridgeAuth(
      request,
    );

  if (
    oauth.accessToken &&
    oauth.authMode ===
      "oauth"
  ) {
    return {
      authorized: true,
      authMode:
        "oauth",
    };
  }

  if (
    oauth.accessToken &&
    oauth.authMode ===
      "token"
  ) {
    if (
      isLegacyAuthorized(
        request,
      )
    ) {
      return {
        authorized: true,
        authMode:
          "legacy-secret",
      };
    }

    return {
      authorized: false,
      authMode:
        "token",
    };
  }

  if (
    isLegacyAuthorized(
      request,
    )
  ) {
    return {
      authorized: true,
      authMode:
        "legacy-secret",
    };
  }

  return {
    authorized: false,
    authMode:
      "oauth",
  };
}

function unauthorized(
  requestId: string,
) {
  return NextResponse.json(
    {
      success: false,
      apiVersion: "v1",
      requestId,
      error:
        "GitHub Bridge authorization required.",
      code:
        "GITHUB_BRIDGE_UNAUTHORIZED",
      timestamp:
        Date.now(),
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

function stringValue(
  value: unknown,
):
  | string
  | undefined {
  return typeof value ===
    "string"
    ? value.trim()
    : undefined;
}

export async function GET(
  request: NextRequest,
) {
  const requestId =
    getRequestId(
      request,
    );

  const authorization =
    await authorize(
      request,
    );

  if (
    !authorization.authorized
  ) {
    return unauthorized(
      requestId,
    );
  }

  try {
    const action =
      request.nextUrl.searchParams.get(
        "action",
      )?.trim() ||
      "status";

    if (
      action ===
      "status"
    ) {
      const status =
        await githubBridgeStatus(
          request,
        );

      return NextResponse.json(
        {
          success:
            status.success,
          apiVersion:
            "v1",
          requestId,
          bridge:
            "github-direct",
          capability:
            "github",
          authMode:
            authorization.authMode,
          status,
          timestamp:
            Date.now(),
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    const auth =
      await resolveGitHubBridgeAuth(
        request,
      );

    const accessToken =
      auth.accessToken;

    if (
      !accessToken
    ) {
      return unauthorized(
        requestId,
      );
    }

    if (
      action ===
      "repo"
    ) {
      const repo =
        request.nextUrl.searchParams.get(
          "repo",
        ) ||
        undefined;

      const result =
        await getGitHubRepository({
          repo,
          accessToken,
        });

      return NextResponse.json(
        {
          ...result,
          apiVersion:
            "v1",
          requestId,
          authMode:
            authorization.authMode,
          timestamp:
            Date.now(),
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    if (
      action ===
      "read"
    ) {
      const path =
        request.nextUrl.searchParams.get(
          "path",
        )?.trim() ||
        "";

      const repo =
        request.nextUrl.searchParams.get(
          "repo",
        ) ||
        undefined;

      const ref =
        request.nextUrl.searchParams.get(
          "ref",
        ) ||
        undefined;

      if (!path) {
        return NextResponse.json(
          {
            success:
              false,
            apiVersion:
              "v1",
            requestId,
            error:
              "path is required.",
            code:
              "INVALID_PATH",
            timestamp:
              Date.now(),
          },
          {
            status: 400,
          },
        );
      }

      const result =
        await readGitHubFile({
          repo,
          path,
          ref,
          accessToken,
        });

      return NextResponse.json(
        {
          ...result,
          apiVersion:
            "v1",
          requestId,
          authMode:
            authorization.authMode,
          timestamp:
            Date.now(),
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    if (
      action ===
      "list"
    ) {
      const repo =
        request.nextUrl.searchParams.get(
          "repo",
        ) ||
        undefined;

      const path =
        request.nextUrl.searchParams.get(
          "path",
        ) ||
        undefined;

      const ref =
        request.nextUrl.searchParams.get(
          "ref",
        ) ||
        undefined;

      const result =
        await listGitHubPath({
          repo,
          path,
          ref,
          accessToken,
        });

      return NextResponse.json(
        {
          ...result,
          apiVersion:
            "v1",
          requestId,
          authMode:
            authorization.authMode,
          timestamp:
            Date.now(),
        },
        {
          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );
    }

    return NextResponse.json(
      {
        success:
          false,
        apiVersion:
          "v1",
        requestId,
        error:
          "Unsupported action.",
        code:
          "UNSUPPORTED_ACTION",
        supportedActions: [
          "status",
          "repo",
          "read",
          "list",
        ],
        timestamp:
          Date.now(),
      },
      {
        status: 400,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "GitHub Bridge request failed.";

    return NextResponse.json(
      {
        success:
          false,
        apiVersion:
          "v1",
        requestId,
        error:
          message,
        code:
          "GITHUB_BRIDGE_ERROR",
        timestamp:
          Date.now(),
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(
  request: NextRequest,
) {
  const requestId =
    getRequestId(
      request,
    );

  const authorization =
    await authorize(
      request,
    );

  if (
    !authorization.authorized
  ) {
    return unauthorized(
      requestId,
    );
  }

  try {
    const body =
      (await request.json()) as BridgeBody;

    const action =
      stringValue(
        body.action,
      );

    if (
      action !==
      "write"
    ) {
      return NextResponse.json(
        {
          success:
            false,
          apiVersion:
            "v1",
          requestId,
          error:
            "Supported POST action: write.",
          code:
            "UNSUPPORTED_ACTION",
          timestamp:
            Date.now(),
        },
        {
          status: 400,
        },
      );
    }

    const path =
      stringValue(
        body.path,
      );

    const content =
      typeof body.content ===
      "string"
        ? body.content
        : null;

    const message =
      stringValue(
        body.message,
      );

    if (
      !path ||
      content ===
        null ||
      !message
    ) {
      return NextResponse.json(
        {
          success:
            false,
          apiVersion:
            "v1",
          requestId,
          error:
            "path, content and message are required.",
          code:
            "INVALID_WRITE_REQUEST",
          timestamp:
            Date.now(),
        },
        {
          status: 400,
        },
      );
    }

    const auth =
      await resolveGitHubBridgeAuth(
        request,
      );

    if (
      !auth.accessToken
    ) {
      return unauthorized(
        requestId,
      );
    }

    const result =
      await writeGitHubFile({
        repo:
          stringValue(
            body.repo,
          ),

        path,

        content,

        message,

        branch:
          stringValue(
            body.branch,
          ),

        sha:
          stringValue(
            body.sha,
          ),

        accessToken:
          auth.accessToken,
      });

    return NextResponse.json(
      {
        ...result,
        apiVersion:
          "v1",
        requestId,
        bridge:
          "github-direct",
        authMode:
          authorization.authMode,
        timestamp:
          Date.now(),
      },
      {
        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "GitHub write failed.";

    return NextResponse.json(
      {
        success:
          false,
        apiVersion:
          "v1",
        requestId,
        error:
          message,
        code:
          "GITHUB_WRITE_ERROR",
        timestamp:
          Date.now(),
      },
      {
        status: 500,
      },
    );
  }
}
