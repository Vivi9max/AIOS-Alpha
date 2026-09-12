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
  detectFounderRuntimeGitHubTask,
} from "@/lib/github/founder-runtime-task-detector";

import {
  executePlannerGitHubRead,
} from "@/lib/github/planner-github-read";

import {
  isLocale,
  type Locale,
} from "@/lib/i18n";

import {
  APP_CONFIG,
} from "@/lib/config/app";

import {
  requiresWebIntelligence,
  retrieveWebEvidence,
} from "@/lib/web-intelligence";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

interface ChatRequestBody {
  prompt?: unknown;
}

function resolveRequestLocale(
  request: NextRequest,
): Locale {
  const header =
    request.headers.get(
      "x-aios-locale",
    );

  if (isLocale(header)) {
    return header;
  }

  return "en";
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

function webUnavailableMessage(
  locale: Locale,
): string {
  if (locale === "ja") {
    return "このリクエストには最新の外部情報が必要ですが、現在 Web Intelligence から信頼できる情報を取得できません。古い情報で推測せず、今回の分析を停止しました。";
  }

  if (locale === "zh-CN") {
    return "当前请求需要实时外部信息，但 Web Intelligence 暂时无法取得可靠数据。为避免使用过期信息猜测，AIOS 已停止本次分析。";
  }

  return "This request requires live external information, but Web Intelligence could not retrieve reliable data. AIOS stopped instead of guessing with stale information.";
}

async function executeChatPrompt(
  prompt: string,
  locale: Locale,
) {
  /*
   * C141 Founder GitHub READ
   *
   * Explicit GitHub READ requests remain isolated
   * from the normal AIOS Web Intelligence path.
   *
   * GitHub is treated as an authoritative internal
   * development source for Founder operations.
   */

  const detection =
    detectFounderRuntimeGitHubTask(
      prompt,
    );

  if (
    detection.isGitHubTask &&
    detection.action === "read" &&
    detection.path
  ) {
    const githubRead =
      await executePlannerGitHubRead(
        prompt,
      );

    if (!githubRead.detected) {
      return {
        success: false,
        content:
          locale === "ja"
            ? "AIOS GitHub READ ルートでリクエストを確認できませんでした。リポジトリ内容を推測しないため、今回の実行を停止しました。"
            : locale === "zh-CN"
              ? "AIOS GitHub READ 路由未能确认该请求。为避免猜测仓库内容，本次执行已停止。"
              : "AIOS could not confirm the GitHub READ route for this request. Execution was stopped to avoid guessing repository content.",
        error:
          "GitHub READ request was detected but the Planner GitHub Read Bridge did not confirm the task.",
        code:
          "GITHUB_READ_ROUTE_NOT_CONFIRMED",
        execution: {
          provider:
            "github-direct-bridge",
          capabilityTrace: [
            "chat",
            "github-intent-detection",
            "planner-github-read",
          ],
          github: {
            detected: true,
            success: false,
            path:
              detection.path,
          },
        },
      };
    }

    if (!githubRead.success) {
      return {
        success: false,
        content:
          locale === "ja"
            ? "GitHub READ の実行に失敗しました。AIOS はモデルによるリポジトリ内容の推測を行っていません。"
            : locale === "zh-CN"
              ? "GitHub READ 执行失败。AIOS 没有使用模型猜测仓库内容。"
              : "GitHub READ execution failed. AIOS did not use the model to guess repository content.",
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
            "github-intent-detection",
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
          "github-intent-detection",
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
        branch: "main",
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

  /*
   * C143 Web Intelligence
   *
   * The Planner/Runtime decides whether the request
   * requires current external information.
   *
   * Web data is retrieved BEFORE the Runtime executes.
   * It is passed as Runtime metadata, not appended
   * to the user's prompt.
   */

  const needsWeb =
    requiresWebIntelligence(
      prompt,
    );

  let webContext;

  if (needsWeb) {
    webContext =
      await retrieveWebEvidence(
        prompt,
      );

    /*
     * Safety rule:
     *
     * If current external information is required
     * but Web Intelligence fails, do not silently
     * fall back to model memory.
     */

    if (!webContext.success) {
      return {
        success: false,
        content:
          webUnavailableMessage(
            locale,
          ),
        error:
          webContext.error ??
          "WEB_INTELLIGENCE_FAILED",
        code:
          "WEB_INTELLIGENCE_FAILED",
        execution: {
          provider:
            "web-intelligence",
          capabilityTrace: [
            "chat",
            "web-intelligence",
          ],
          webIntelligence: {
            required: true,
            success: false,
            verified: false,
            sourceCount: 0,
            sourceHosts: [],
          },
        },
      };
    }
  }

  /*
   * Existing normal AIOS Runtime path.
   *
   * Locale remains trusted transport metadata.
   * It is never appended to the user's prompt.
   * Web evidence is passed separately into Runtime.
   */

  return executeRuntime({
    prompt,
    locale,
    webContext:
      needsWeb
        ? webContext
        : undefined,
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
        status: "online",
        runtime:
          APP_CONFIG.runtimeId,
        runtimeStage:
          APP_CONFIG.stage,
        runtimeVersion:
          APP_CONFIG.version,
        runtimeVersionLabel:
          APP_CONFIG.fullTitle,
        runtimeCodename:
          APP_CONFIG.codename,
        capabilities: {
          chat: true,
          planner: true,
          execution: true,
          founderGitHubRead: true,
          webIntelligence: true,
        },
        identity: {
          userId:
            identity.userId,
          mode:
            "anonymous-alpha",
          isolated: true,
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
              "Invalid request format.",
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

    const locale =
      resolveRequestLocale(
        request,
      );

    if (!prompt) {
      const response =
        NextResponse.json(
          {
            success: false,
            content:
              locale === "ja"
                ? "内容を入力してください。"
                : locale === "zh-CN"
                  ? "请输入内容。"
                  : "Please enter a message.",
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
            locale,
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
          dataIsolated: true,
          locale,
          runtime:
            APP_CONFIG.runtimeId,
          runtimeStage:
            APP_CONFIG.stage,
          runtimeVersion:
            APP_CONFIG.version,
          runtimeVersionLabel:
            APP_CONFIG.fullTitle,
          latencyMs:
            Date.now() -
            startedAt,
        },
        {
          status:
            result.success
              ? 200
              : result.code ===
                  "WEB_INTELLIGENCE_FAILED"
                ? 503
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

    const locale =
      resolveRequestLocale(
        request,
      );

    const response =
      NextResponse.json(
        {
          success: false,
          content:
            locale === "ja"
              ? "AIOS Runtime は一時的に利用できません。"
              : locale === "zh-CN"
                ? "AIOS Runtime 暂时不可用。"
                : "AIOS Runtime is temporarily unavailable.",
          error:
            errorMessage,
          runtime:
            APP_CONFIG.runtimeId,
          runtimeStage:
            APP_CONFIG.stage,
          runtimeVersion:
            APP_CONFIG.version,
          runtimeVersionLabel:
            APP_CONFIG.fullTitle,
          runtimeCodename:
            APP_CONFIG.codename,
          userId:
            identity.userId,
          locale,
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
