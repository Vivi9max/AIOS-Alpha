import { NextRequest, NextResponse } from "next/server";

import {
  getGitHubRepository,
  githubBridgeStatus,
  listGitHubPath,
  readGitHubFile,
  writeGitHubFile,
} from "@/lib/github/bridge";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

function getRequestId(request: NextRequest): string {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}

function getBridgeSecret(): string | null {
  return (
    process.env.GITHUB_BRIDGE_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    null
  );
}

function isAuthorized(request: NextRequest): boolean {
  const secret = getBridgeSecret();
  if (!secret) return false;

  const headerSecret = request.headers.get("x-aios-bridge-secret");
  if (headerSecret === secret) return true;

  const authorization = request.headers.get("authorization");
  return authorization === `Bearer ${secret}`;
}

function unauthorized(requestId: string) {
  return NextResponse.json(
    {
      success: false,
      apiVersion: "v1",
      requestId,
      error: "GitHub Bridge authorization required.",
      code: "GITHUB_BRIDGE_UNAUTHORIZED",
      timestamp: Date.now(),
    },
    { status: 401 },
  );
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

export async function GET(request: NextRequest) {
  const requestId = getRequestId(request);

  if (!isAuthorized(request)) {
    return unauthorized(requestId);
  }

  try {
    const action =
      request.nextUrl.searchParams.get("action")?.trim() || "status";

    if (action === "status") {
      return NextResponse.json({
        success: true,
        apiVersion: "v1",
        requestId,
        bridge: "github-direct",
        capability: "github",
        status: await githubBridgeStatus(),
        timestamp: Date.now(),
      });
    }

    if (action === "repo") {
      const repo =
        request.nextUrl.searchParams.get("repo") || undefined;
      const result = await getGitHubRepository({ repo });

      return NextResponse.json({
        ...result,
        apiVersion: "v1",
        requestId,
        timestamp: Date.now(),
      });
    }

    if (action === "read") {
      const path =
        request.nextUrl.searchParams.get("path")?.trim() || "";
      const repo =
        request.nextUrl.searchParams.get("repo") || undefined;
      const ref =
        request.nextUrl.searchParams.get("ref") || undefined;

      if (!path) {
        return NextResponse.json(
          {
            success: false,
            apiVersion: "v1",
            requestId,
            error: "path is required.",
            code: "INVALID_PATH",
            timestamp: Date.now(),
          },
          { status: 400 },
        );
      }

      const result = await readGitHubFile({ repo, path, ref });

      return NextResponse.json({
        ...result,
        apiVersion: "v1",
        requestId,
        timestamp: Date.now(),
      });
    }

    if (action === "list") {
      const repo =
        request.nextUrl.searchParams.get("repo") || undefined;
      const path =
        request.nextUrl.searchParams.get("path") || undefined;
      const ref =
        request.nextUrl.searchParams.get("ref") || undefined;

      const result = await listGitHubPath({ repo, path, ref });

      return NextResponse.json({
        ...result,
        apiVersion: "v1",
        requestId,
        timestamp: Date.now(),
      });
    }

    return NextResponse.json(
      {
        success: false,
        apiVersion: "v1",
        requestId,
        error: "Unsupported action.",
        code: "UNSUPPORTED_ACTION",
        supportedActions: ["status", "repo", "read", "list"],
        timestamp: Date.now(),
      },
      { status: 400 },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "GitHub Bridge request failed.";

    return NextResponse.json(
      {
        success: false,
        apiVersion: "v1",
        requestId,
        error: message,
        code: "GITHUB_BRIDGE_ERROR",
        timestamp: Date.now(),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const requestId = getRequestId(request);

  if (!isAuthorized(request)) {
    return unauthorized(requestId);
  }

  try {
    const body = (await request.json()) as BridgeBody;
    const action = stringValue(body.action);

    if (action !== "write") {
      return NextResponse.json(
        {
          success: false,
          apiVersion: "v1",
          requestId,
          error: "Supported POST action: write.",
          code: "UNSUPPORTED_ACTION",
          timestamp: Date.now(),
        },
        { status: 400 },
      );
    }

    const path = stringValue(body.path);
    const content = typeof body.content === "string" ? body.content : null;
    const message = stringValue(body.message);

    if (!path || content === null || !message) {
      return NextResponse.json(
        {
          success: false,
          apiVersion: "v1",
          requestId,
          error: "path, content and message are required.",
          code: "INVALID_WRITE_REQUEST",
          timestamp: Date.now(),
        },
        { status: 400 },
      );
    }

    const result = await writeGitHubFile({
      repo: stringValue(body.repo),
      path,
      content,
      message,
      branch: stringValue(body.branch),
      sha: stringValue(body.sha),
    });

    return NextResponse.json({
      ...result,
      apiVersion: "v1",
      requestId,
      bridge: "github-direct",
      timestamp: Date.now(),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "GitHub write failed.";

    return NextResponse.json(
      {
        success: false,
        apiVersion: "v1",
        requestId,
        error: message,
        code: "GITHUB_WRITE_ERROR",
        timestamp: Date.now(),
      },
      { status: 500 },
    );
  }
}
