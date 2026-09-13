// app/api/chat/route.ts

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

import {
  createCommercialObjective,
  listCommercialObjectives,
  updateCommercialObjective,
} from "@/lib/commercial/operating-layer";

import {
  ensureCommercialOperatingLoop,
} from "@/lib/commercial/operating-loop";

import {
  ensureCommercialNextAction,
} from "@/lib/commercial/gap-engine";

import {
  detectCommercialChatIntent,
} from "@/lib/commercial/chat-intent";

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

function formatCommercialGap(
  objective: Awaited<
    ReturnType<
      typeof updateCommercialObjective
    >
  >,
  locale: Locale,
): string[] {
  if (!objective) {
    return [];
  }

  const now =
    Date.now();

  const revenueGap =
    Math.max(
      0,
      objective.revenueTarget -
        objective.revenueActual,
    );

  const customerGap =
    Math.max(
      0,
      objective.customerTarget -
        objective.customerActual,
    );

  const costHeadroom =
    objective.costTarget -
    objective.costActual;

  const deadlineAt =
    objective.deadlineAt;

  const daysRemaining =
    deadlineAt !==
      undefined
      ? Math.max(
          0,
          Math.ceil(
            (deadlineAt -
              now) /
              (24 *
                60 *
                60 *
                1000),
          ),
        )
      : null;

  const dailyRevenue =
    daysRemaining !== null &&
    daysRemaining > 0
      ? Math.round(
          (
            revenueGap /
            daysRemaining
          ) * 100,
        ) / 100
      : revenueGap;

  const dailyCustomers =
    daysRemaining !== null &&
    daysRemaining > 0
      ? Math.ceil(
          customerGap /
            daysRemaining,
        )
      : customerGap;

  if (locale === "ja") {
    return [
      "",
      "現在のCommercial Gap：",
      `収益Gap：${revenueGap} ${objective.currency}`,
      `顧客Gap：${customerGap}`,
      `コスト余力：${costHeadroom} ${objective.currency}`,
      ...(daysRemaining !== null
        ? [
            `残り：${daysRemaining}日`,
            `1日あたり必要収益：${dailyRevenue} ${objective.currency}`,
            `1日あたり必要顧客数：${dailyCustomers}`,
          ]
        : []),
    ];
  }

  if (locale === "zh-CN") {
    return [
      "",
      "当前 Commercial Gap：",
      `收入 Gap：${revenueGap} ${objective.currency}`,
      `客户 Gap：${customerGap}`,
      `成本剩余空间：${costHeadroom} ${objective.currency}`,
      ...(daysRemaining !== null
        ? [
            `剩余时间：${daysRemaining} 天`,
            `每日所需收入：${dailyRevenue} ${objective.currency}`,
            `每日所需新增客户：${dailyCustomers}`,
          ]
        : []),
    ];
  }

  return [
    "",
    "Current Commercial Gap:",
    `Revenue gap: ${revenueGap} ${objective.currency}`,
    `Customer gap: ${customerGap}`,
    `Cost headroom: ${costHeadroom} ${objective.currency}`,
    ...(daysRemaining !== null
      ? [
          `Days remaining: ${daysRemaining}`,
          `Required daily revenue: ${dailyRevenue} ${objective.currency}`,
          `Required daily customers: ${dailyCustomers}`,
        ]
      : []),
  ];
}

async function executeChatPrompt(
  prompt: string,
  locale: Locale,
) {
  const commercialIntent =
    detectCommercialChatIntent(
      prompt,
      locale,
    );

  if (
    commercialIntent.detected
  ) {
    const existingObjectives =
      await listCommercialObjectives();

    const existing =
      existingObjectives.find(
        (item) =>
          item.title.toLowerCase() ===
            commercialIntent.title.toLowerCase() &&
          item.status !==
            "cancelled" &&
          item.status !==
            "completed",
      );

    let objective;

    if (existing) {
      /*
       * C143.17.2
       *
       * Do not blindly reuse an old objective.
       *
       * Explicit values from the current request
       * reconcile the existing objective.
       *
       * This fixes:
       *
       * old objective = CNY
       * new request = USD
       *
       * without creating duplicate objectives.
       */

      const updates: Parameters<
        typeof updateCommercialObjective
      >[1] = {};

      if (
        commercialIntent.currency !==
          "UNSPECIFIED" &&
        commercialIntent.currency !==
          existing.currency
      ) {
        updates.currency =
          commercialIntent.currency;
      }

      if (
        commercialIntent.revenueTarget >
          0 &&
        commercialIntent.revenueTarget !==
          existing.revenueTarget
      ) {
        updates.revenueTarget =
          commercialIntent.revenueTarget;
      }

      if (
        commercialIntent.costTarget >
          0 &&
        commercialIntent.costTarget !==
          existing.costTarget
      ) {
        updates.costTarget =
          commercialIntent.costTarget;
      }

      if (
        commercialIntent.customerTarget >
          0 &&
        commercialIntent.customerTarget !==
          existing.customerTarget
      ) {
        updates.customerTarget =
          commercialIntent.customerTarget;
      }

      if (
        commercialIntent.deadlineDays !==
          null
      ) {
        updates.deadlineDays =
          commercialIntent.deadlineDays;
      }

      if (
        commercialIntent.description !==
          existing.description
      ) {
        updates.description =
          commercialIntent.description;
      }

      if (
        commercialIntent.successCriteria !==
          existing.successCriteria
      ) {
        updates.successCriteria =
          commercialIntent.successCriteria;
      }

      if (
        commercialIntent.stage !==
          existing.stage
      ) {
        updates.stage =
          commercialIntent.stage;
      }

      objective =
        Object.keys(updates)
          .length > 0
          ? await updateCommercialObjective(
              existing.id,
              updates,
            )
          : existing;
    } else {
      objective =
        await createCommercialObjective({
          title:
            commercialIntent.title,

          description:
            commercialIntent.description,

          status:
            "active",

          stage:
            commercialIntent.stage,

          currency:
            commercialIntent.currency,

          revenueTarget:
            commercialIntent.revenueTarget,

          costTarget:
            commercialIntent.costTarget,

          customerTarget:
            commercialIntent.customerTarget,

          deadlineDays:
            commercialIntent.deadlineDays,

          successCriteria:
            commercialIntent.successCriteria,

          outcomeId:
            null,

          taskId:
            null,
        });
    }

    if (!objective) {
      throw new Error(
        "COMMERCIAL_OBJECTIVE_RECONCILIATION_FAILED",
      );
    }

    const loop =
      await ensureCommercialOperatingLoop(
        objective.id,
      );

    const nextAction =
      await ensureCommercialNextAction(
        objective.id,
        locale,
      );

    const currency =
      objective.currency;

    const deadlineAt =
      objective.deadlineAt;

    const daysRemaining =
      deadlineAt !==
        undefined
        ? Math.max(
            0,
            Math.ceil(
              (
                deadlineAt -
                Date.now()
              ) /
                (
                  24 *
                  60 *
                  60 *
                  1000
                ),
            ),
          )
        : null;

    let content: string;

    if (locale === "ja") {
      content = [
        "商業目標を作成・更新しました。",
        "",
        `目標：${objective.title}`,
        `収益目標：${objective.revenueTarget} ${currency}`,
        `顧客目標：${objective.customerTarget}`,
        `コスト上限：${objective.costTarget} ${currency}`,
        ...(daysRemaining !== null
          ? [
              `期限：${daysRemaining}日以内`,
            ]
          : []),
        "",
        `次のアクション：${nextAction.action}`,
        `理由：${nextAction.gap.reason}`,
        ...formatCommercialGap(
          objective,
          locale,
        ),
        "",
        "Objective → Outcome → Milestone → Task → Gap → Next Action の運用ループを準備しました。",
        "Runtime は検証済みの商業結果のみを Actual に反映します。",
      ].join("\n");
    } else if (locale === "zh-CN") {
      content = [
        "商业目标已建立/更新。",
        "",
        `目标：${objective.title}`,
        `收入目标：${objective.revenueTarget} ${currency}`,
        `客户目标：${objective.customerTarget}`,
        `成本上限：${objective.costTarget} ${currency}`,
        ...(daysRemaining !== null
          ? [
              `期限：${daysRemaining} 天`,
            ]
          : []),
        "",
        `下一行动：${nextAction.action}`,
        `判断原因：${nextAction.gap.reason}`,
        ...formatCommercialGap(
          objective,
          locale,
        ),
        "",
        "Objective → Outcome → Milestone → Task → Gap → Next Action 已建立。",
        "Runtime 只会将经过验证的商业结果写入 Actual，不会虚构收入、客户或成本。",
      ].join("\n");
    } else {
      content = [
        "Commercial objective created/updated.",
        "",
        `Objective: ${objective.title}`,
        `Revenue target: ${objective.revenueTarget} ${currency}`,
        `Customer target: ${objective.customerTarget}`,
        `Cost cap: ${objective.costTarget} ${currency}`,
        ...(daysRemaining !== null
          ? [
              `Deadline: ${daysRemaining} days`,
            ]
          : []),
        "",
        `Next action: ${nextAction.action}`,
        `Reason: ${nextAction.gap.reason}`,
        ...formatCommercialGap(
          objective,
          locale,
        ),
        "",
        "Objective → Outcome → Milestone → Task → Gap → Next Action is ready.",
        "Runtime only records verified commercial results as Actuals and never fabricates revenue, customers, or costs.",
      ].join("\n");
    }

    return {
      success: true,

      content,

      code:
        "C143_17_2_COMMERCIAL_OBJECTIVE_RECONCILED",

      commercial: {
        detected: true,

        objective,

        loop,

        nextAction,
      },

      execution: {
        provider:
          "commercial-operating-layer",

        capabilityTrace: [
          "chat",
          "commercial-intent",
          "commercial-objective",
          "deadline",
          "commercial-gap",
          "outcome",
          "milestone",
          "task",
          "gap-engine",
          "next-action",
        ],
      },
    };
  }

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
     * C143.17.2
     *
     * Web verification is now evidence quality,
     * not a global Chat kill-switch.
     *
     * We NEVER fabricate live facts.
     *
     * But an unavailable or unverified Web layer
     * must not prevent the normal Runtime from
     * performing non-live reasoning.
     *
     * Runtime receives the actual Web context,
     * including success/verified/source metadata.
     * executor.ts already exposes this metadata.
     */

    if (
      !webContext.success ||
      !webContext.verified
    ) {
      console.warn(
        "[AIOS Web Intelligence] Live evidence unavailable or unverified; continuing with explicit evidence boundary.",
        {
          success:
            webContext.success,
          verified:
            webContext.verified,
          sourceCount:
            webContext.sourceCount,
          sourceHosts:
            webContext.sourceHosts,
          error:
            webContext.error,
        },
      );
    }
  }

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
          commercialOperatingLayer: true,
          commercialGap: true,
          commercialDeadline: true,
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

    const resultCode =
      "code" in result
        ? result.code
        : undefined;

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
              : resultCode ===
                    "GITHUB_READ_ROUTE_NOT_CONFIRMED" ||
                  resultCode ===
                    "PLANNER_GITHUB_READ_FAILED"
                ? 500
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
