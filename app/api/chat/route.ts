import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  executeRuntime,
} from "@/lib/runtime/engine";

import {
  AIOS_USER_COOKIE,
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  runWithUserContext,
} from "@/lib/runtime/request-context";

import {
  executePlannerGitHubRead,
} from "@/lib/github/planner-github-read";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

interface ChatRequestBody {
  prompt?: unknown;
}

function applyIdentityCookie(
  response: NextResponse,
  userId: string,
): NextResponse {
  response.cookies.set(
    AIOS_USER_COOKIE,
    userId,
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge:
        60 * 60 * 24 * 365,
    },
  );

  return response;
}

function isExplicitGitHubReadRequest(
  prompt: string,
): boolean {
  const text =
    prompt.trim();

  if (!text) {
    return false;
  }

  const hasGitHubContext =
    /\bgithub\b/i.test(text) ||
    /\brepository\b/i.test(text) ||
    /\brepo\b/i.test(text);

  if (!hasGitHubContext) {
    return false;
  }

  const hasReadIntent =
    /\bread\b/i.test(text) ||
    /\binspect\b/i.test(text) ||
    /\banaly[sz]e\b/i.test(text) ||
    /\bcheck\b/i.test(text);

  const hasPath =
    /(?:^|\s)((?:app|components|docs|lib|scripts|tests|test|public|styles)\/[A-Za-z0-9._/@-]+\.[A-Za-z0-9_-]+)/.test(
      text,
    );

  return (
    hasReadIntent &&
    hasPath
  );
}

async function executeChatPrompt(
  prompt: string,
) {
  /*
   * C141.11.2-C
   *
   * Chat → Planner GitHub READ Routing
   *
   * IMPORTANT:
   *
   * The chat layer must not ask the LLM whether it
   * "has GitHub access".
   *
   * Explicit Founder GitHub READ requests are routed
   * to the real Planner GitHub Read Bridge first.
   */
  if (
    isExplicitGitHubReadRequest(
      prompt,
    )
  ) {
    const githubRead =
      await executePlannerGitHubRead(
        prompt,
      );

    /*
     * The detector should only return detected=true
     * for an explicit GitHub READ request.
     *
     * If detection unexpectedly fails, fall back to
     * the normal Runtime rather than fabricating data.
     */
    if (
      githubRead.detected
    ) {
      if (
        !githubRead.success
      ) {
        return {
          success: false,

          content:
            "GitHub READ 执行失败，AIOS 没有使用模型猜测仓库内容。",

          error:
            githubRead.error ??
            "GitHub READ failed.",

          code:
            githubRead.code ??
            "PLANNER_GITHUB_READ_FAILED",

          execution: {
            provider:
              "github-direct-bridge",

            capabilityTrace: [
              "chat",
              "github-read-routing",
              "planner-github-read",
              "founder-contract",
              "github-direct-bridge",
            ],

            github: {
              detected: true,

              success: false,

              path:
                githubRead.path,
            },
          },
        };
      }

      /*
       * Real GitHub content is now authoritative.
       *
       * Do not send the same request to the LLM first.
       */
      return {
        success: true,

        content:
          githubRead.content ??
          "",

        code:
          "CHAT_GITHUB_READ_COMPLETED",

        execution: {
          provider:
            "github-direct-bridge",

          capabilityTrace: [
            "chat",
            "github-read-routing",
            "planner-github-read",
            "founder-contract",
            "github-direct-bridge",
          ],

          github: {
            detected: true,

            success: true,

            path:
              githubRead.path,

            sha:
              githubRead.sha,

            size:
              githubRead.size,
          },
        },

        github: {
          repository:
            "Vivi9max/AIOS-Alpha",

          branch:
            "main",

          path:
            githubRead.path,

          sha:
            githubRead.sha,

          size:
            githubRead.size,

          content:
            githubRead.content ??
            "",
        },
      };
    }
  }

  /*
   * Existing normal AIOS Runtime path.
   *
   * C141.11.2-C does not change ordinary chat behavior.
   */
  return executeRuntime({
    prompt,
  });
}

export async function GET(
  request: NextRequest,
) {
  const identity =
    resolveAlphaIdentity(
      request,
    );

  const response =
    NextResponse.json(
      {
        success: true,

        service:
          "AIOS Alpha Chat API",

        status:
          "online",

        runtime:
          "aios-alpha",

        runtimeVersion:
          "0.4",

        capabilities: {
          chat: true,

          planner:
            true,

          execution:
            true,

          founderGitHubRead:
            true,
        },

        identity: {
          userId:
            identity.userId,

          mode:
            "anonymous-alpha",

          isolated:
            true,
        },

        methods: {
          GET:
            "Runtime and identity status",

          POST:
            "Execute isolated AIOS Runtime",
        },

        timestamp:
          Date.now(),
      },
      {
        status: 200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );

  return applyIdentityCookie(
    response,
    identity.userId,
  );
}

export async function POST(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  const identity =
    resolveAlphaIdentity(
      request,
    );

  try {
    const contentType =
      request.headers.get(
        "content-type",
      ) ?? "";

    if (
      !contentType.includes(
        "application/json",
      )
    ) {
      const response =
        NextResponse.json(
          {
            success: false,

            content:
              "请求格式错误。",

            error:
              "Content-Type must be application/json.",

            userId:
              identity.userId,

            timestamp:
              Date.now(),
          },
          {
            status: 415,
          },
        );

      return applyIdentityCookie(
        response,
        identity.userId,
      );
    }

    const body =
      (await request.json()) as
        ChatRequestBody;

    const prompt =
      typeof body.prompt ===
      "string"
        ? body.prompt.trim()
        : "";

    if (!prompt) {
      const response =
        NextResponse.json(
          {
            success: false,

            content:
              "请输入内容。",

            error:
              "Prompt is required.",

            userId:
              identity.userId,

            timestamp:
              Date.now(),
          },
          {
            status: 400,
          },
        );

      return applyIdentityCookie(
        response,
        identity.userId,
      );
    }

    const result =
      await runWithUserContext(
        identity.userId,
        () =>
          executeChatPrompt(
            prompt,
          ),
      );

    const response =
      NextResponse.json(
        {
          ...result,

          userId:
            identity.userId,

          identityMode:
            "anonymous-alpha",

          dataIsolated:
            true,

          latencyMs:
            Date.now() -
            startedAt,
        },
        {
          status:
            result.success
              ? 200
              : 500,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );

    return applyIdentityCookie(
      response,
      identity.userId,
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error
        ? error.message
        : "AIOS Chat API failed.";

    console.error(
      "[AIOS Chat API]",
      error,
    );

    const response =
      NextResponse.json(
        {
          success: false,

          content:
            "AIOS Runtime 暂时不可用。",

          error:
            errorMessage,

          runtime:
            "aios-alpha",

          runtimeVersion:
            "0.4",

          userId:
            identity.userId,

          timestamp:
            Date.now(),

          latencyMs:
            Date.now() -
            startedAt,
        },
        {
          status: 500,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );

    return applyIdentityCookie(
      response,
      identity.userId,
    );
  }
}
