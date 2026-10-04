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
  getPersistentMemory,
} from "@/lib/memory/store";
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
import {
  executeChatCommercialBridge,
} from "@/lib/runtime/chat-commercial-bridge";
import {
  executeRealtimeChatBridge,
} from "@/lib/runtime/realtime-chat-bridge";
import {
  processAIOSInputs,
} from "@/lib/runtime/input/aios-input-runtime";
import {
  processAIOSUploadedFiles,
  type AIOSInputProcessingResult,
} from "@/lib/runtime/input/aios-input-processing-runtime";
import type {
  AIOSInputItem,
} from "@/lib/runtime/input/aios-input-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

interface ChatRequestBody {
  prompt?: unknown;
  inputs?: unknown;
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

function normalizeInputPayload(
  value: unknown,
): AIOSInputItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (
      item,
    ): item is AIOSInputItem =>
      typeof item === "object" &&
      item !== null,
  );
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
    deadlineAt !== undefined
      ? Math.max(
          0,
          Math.ceil(
            (deadlineAt - now) /
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
          (revenueGap /
            daysRemaining) *
            100,
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
  /*
   * C167.31.2:
   *
   * Chat now enters the realtime capability
   * boundary before Commercial, GitHub,
   * Web Intelligence, and Planner Runtime.
   *
   * Runtime-executable realtime capability:
   *   Time -> direct runtime execution.
   *
   * External-evidence realtime capability:
   *   Weather
   *   News
   *   Exchange rate
   *   Market
   *
   * These capabilities must not fall through
   * to model generation because the model must
   * not present stale memory as realtime data.
   *
   * Ordinary prompts continue to the existing
   * AIOS Runtime flow without changing the
   * existing Commercial, GitHub, Web, Planner,
   * or Execution behavior.
   */
  const realtimeBridge =
    executeRealtimeChatBridge(
      prompt,
      locale,
    );

  if (
    realtimeBridge.detected
  ) {
    return {
      success:
        realtimeBridge.success,
      content:
        realtimeBridge.content,
      code:
        realtimeBridge.code,
      realtime: {
        capability:
          realtimeBridge.capability,
        execution:
          realtimeBridge.execution,
        requiresExternalEvidence:
          realtimeBridge.requiresExternalEvidence,
        route:
          realtimeBridge.route,
        realtime:
          realtimeBridge.realtime,
      },
      execution: {
        provider:
          "realtime-capability-router",
        capabilityTrace: [
          "chat",
          "realtime-capability-router",
          realtimeBridge.capability,
          realtimeBridge.execution,
        ],
      },
    };
  }

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
      const updates:
        Parameters<
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
        Object.keys(updates).length > 0
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

    const liveCommercial =
      await executeChatCommercialBridge({
        prompt,
        objectiveId:
          objective.id,
        locale,
      });

    const currency =
      objective.currency;

    const deadlineAt =
      objective.deadlineAt;

    const daysRemaining =
      deadlineAt !== undefined
        ? Math.max(
            0,
            Math.ceil(
              (deadlineAt -
                Date.now()) /
                (24 *
                  60 *
                  60 *
                  1000),
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
        ...(liveCommercial.content
          ? [
              "",
              liveCommercial.content,
            ]
          : []),
      ].join("\n");
    } else if (
      locale === "zh-CN"
    ) {
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
        ...(liveCommercial.content
          ? [
              "",
              liveCommercial.content,
            ]
          : []),
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
        ...(liveCommercial.content
          ? [
              "",
              liveCommercial.content,
            ]
          : []),
      ].join("\n");
    }

    if (
      liveCommercial.shouldRunLiveOpportunity
    ) {
      return {
        success:
          liveCommercial.success,
        content,
        code:
          liveCommercial.success
            ? "C143_32_3_CHAT_LIVE_COMMERCIAL_PASS"
            : "C143_32_3_CHAT_LIVE_COMMERCIAL_BLOCKED",
        commercial: {
          detected: true,
          objective,
          loop,
          nextAction,
          liveOpportunity:
            liveCommercial.opportunity,
          liveBridge: {
            detected:
              liveCommercial.detected,
            status:
              liveCommercial.status,
            shouldRun:
              liveCommercial.shouldRunLiveOpportunity,
          },
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
            "live-commercial-opportunity",
          ],
        },
      };
    }

    return {
      success: true,
      content,
      code:
        "C143_32_3_COMMERCIAL_OBJECTIVE_RECONCILED",
      commercial: {
        detected: true,
        objective,
        loop,
        nextAction,
        liveOpportunity:
          null,
        liveBridge: {
          detected:
            liveCommercial.detected,
          status:
            liveCommercial.status,
          shouldRun:
            liveCommercial.shouldRunLiveOpportunity,
        },
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
          "live-commercial-opportunity-not-requested",
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
            ? "AIOS GitHub READ ルートでリクエストを確認できませんでした。"
            : locale === "zh-CN"
              ? "AIOS GitHub READ 路由未能确认该请求。为避免猜测仓库内容，本次执行已停止。"
              : "AIOS could not confirm the GitHub READ route for this request.",
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
            ? "GitHub READ の実行に失敗しました。"
            : locale === "zh-CN"
              ? "GitHub READ 执行失败。AIOS 没有使用模型猜测仓库内容。"
              : "AIOS GitHub READ execution failed. AIOS did not use the model to guess repository content.",
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

    if (
      !webContext.success ||
      !webContext.verified
    ) {
      console.warn(
        "[AIOS Web Intelligence] Live evidence unavailable or unverified.",
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
        status:
          "online",
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
          liveCommercialOpportunity: true,
          inputFoundation: true,
          realFileUpload:
            true,
          inputProcessing:
            true,
          realtimeCapabilityRouter:
            true,
          realtimeTime:
            true,
          realtimeExternalEvidenceBoundary:
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

    const isMultipart =
      contentType.includes(
        "multipart/form-data",
      );

    let prompt = "";

    let inputItems:
      AIOSInputItem[] = [];

    let uploadedFiles:
      File[] = [];

    let fileInputIds:
      string[] = [];

    let inputProcessingResult:
      AIOSInputProcessingResult |
      undefined;

    if (isMultipart) {
      const formData =
        await request.formData();

      const rawPrompt =
        formData.get(
          "prompt",
        );

      prompt =
        typeof rawPrompt ===
        "string"
          ? rawPrompt.trim()
          : "";

      const rawInputs =
        formData.get(
          "inputs",
        );

      if (
        typeof rawInputs ===
        "string"
      ) {
        try {
          inputItems =
            normalizeInputPayload(
              JSON.parse(
                rawInputs,
              ),
            );
        } catch {
          inputItems = [];
        }
      }

      const rawFileInputIds =
        formData.get(
          "fileInputIds",
        );

      if (
        typeof rawFileInputIds ===
        "string"
      ) {
        try {
          const parsed =
            JSON.parse(
              rawFileInputIds,
            );

          fileInputIds =
            Array.isArray(parsed)
              ? parsed.filter(
                  (
                    value,
                  ): value is string =>
                    typeof value ===
                      "string" &&
                    value.trim()
                      .length > 0,
                )
              : [];
        } catch {
          fileInputIds = [];
        }
      }

      uploadedFiles =
        formData
          .getAll("files")
          .filter(
            (
              value,
            ): value is File =>
              typeof value ===
                "object" &&
              value !== null &&
              typeof File !==
                "undefined" &&
              value instanceof File,
          );

      if (
        uploadedFiles.length >
          8 ||
        fileInputIds.length >
          8
      ) {
        const response =
          NextResponse.json(
            {
              success: false,
              content:
                "Too many uploaded inputs.",
              error:
                "AIOS_INPUT_TOO_MANY_FILES",
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

      if (
        uploadedFiles.length !==
        fileInputIds.length
      ) {
        const response =
          NextResponse.json(
            {
              success: false,
              content:
                "Uploaded file references do not match the submitted files.",
              error:
                "AIOS_INPUT_FILE_MAPPING_INVALID",
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

      const rebuiltInputs:
        AIOSInputItem[] =
        fileInputIds.map(
          (
            inputId,
            index,
          ) => {
            const file =
              uploadedFiles[index];

            const original =
              inputItems.find(
                (item) =>
                  item.id ===
                  inputId,
              );

            const isImage =
              file.type.startsWith(
                "image/",
              );

            return {
              id: inputId,
              kind:
                original?.kind ===
                  "image" ||
                isImage
                  ? "image"
                  : "file",
              metadata: {
                name:
                  file.name ||
                  original?.metadata
                    .name ||
                  null,
                mimeType:
                  file.type ||
                  "application/octet-stream",
                sizeBytes:
                  file.size,
                lastModifiedAt:
                  file.lastModified
                    ? new Date(
                        file.lastModified,
                      ).toISOString()
                    : null,
                source:
                  original?.metadata
                    .source ??
                  "runtime",
              },
              localReference:
                null,
              extractedText:
                null,
              processingStatus:
                "pending",
              processingError:
                null,
            };
          },
        );

      inputItems =
        rebuiltInputs;
    } else if (
      contentType.includes(
        "application/json",
      )
    ) {
      const body =
        (await request.json()) as
          ChatRequestBody;

      prompt =
        typeof body.prompt ===
        "string"
          ? body.prompt.trim()
          : "";

      inputItems =
        normalizeInputPayload(
          body.inputs,
        );
    } else {
      const response =
        NextResponse.json(
          {
            success: false,
            content:
              "Invalid request format.",
            error:
              "Content-Type must be application/json or multipart/form-data.",
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

    const locale =
      resolveRequestLocale(
        request,
      );

    const hasInputs =
      inputItems.length > 0;

    let inputResult;

    if (hasInputs) {
      inputResult =
        processAIOSInputs({
          inputs:
            inputItems,
          prompt:
            prompt || null,
          sessionId:
            identity.userId,
        });

      if (
        inputResult.code ===
        "AIOS_INPUT_REJECTED"
      ) {
        const response =
          NextResponse.json(
            {
              success: false,
              content:
                locale === "ja"
                  ? "入力ファイルを受け付けられませんでした。"
                  : locale === "zh-CN"
                    ? "输入文件无法通过 AIOS Input Foundation 验证。"
                    : "The provided inputs could not pass AIOS Input Foundation validation.",
              error:
                "AIOS_INPUT_REJECTED",
              inputResult,
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
              status: 400,
            },
          );

        return applyIdentityCookie(
          response,
          identity.userId,
        );
      }
    }

    /*
     * C164.6.1:
     * Real uploaded browser Files are now
     * passed into the server-side processing
     * runtime after Input Foundation validation.
     *
     * Processing remains transient.
     * No provider-specific multimodal model
     * execution is performed here.
     */
    if (
      isMultipart &&
      uploadedFiles.length > 0 &&
      hasInputs &&
      inputResult
    ) {
      inputProcessingResult =
        await processAIOSUploadedFiles(
          inputItems,
          uploadedFiles.map(
            (
              file,
              index,
            ) => ({
              inputId:
                fileInputIds[index] ??
                "",
              file,
            }),
          ),
        );

      inputItems =
        inputProcessingResult.inputs;

      inputResult = {
        ...inputResult,
        inputs:
          inputProcessingResult.inputs,
        limitations:
          Array.from(
            new Set([
              ...inputResult.limitations,
              ...inputProcessingResult.limitations,
            ]),
          ),
      };
    }

    if (
      !prompt &&
      !hasInputs
    ) {
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
              "Prompt or input is required.",
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

    /*
     * Input-only requests stop at
     * the Input Foundation / Processing Runtime.
     *
     * Text, CSV, and JSON may be processed
     * into transient extractedText.
     *
     * PDF parsing, image Vision/OCR,
     * DOC/DOCX/XLS/XLSX parsing and
     * provider-specific multimodal execution
     * are not claimed here.
     */
    if (
      !prompt &&
      hasInputs
    ) {
      const acceptedCount =
        inputResult?.acceptedCount ??
        0;

      const rejectedCount =
        inputResult?.rejectedCount ??
        0;

      const processedCount =
        inputProcessingResult
          ?.processedCount ??
        0;

      const pendingCount =
        inputProcessingResult
          ?.pendingCount ??
        0;

      const failedCount =
        inputProcessingResult
          ?.failedCount ??
        0;

      const content =
        locale === "ja"
          ? `入力を受け付けました。${acceptedCount} 件を登録しました。処理済み ${processedCount} 件、保留 ${pendingCount} 件、失敗 ${failedCount} 件です。画像認識・OCR・PDF/DOC/XLS 解析はまだ実行していません。`
          : locale === "zh-CN"
            ? `已接收输入。共接受 ${acceptedCount} 项。已处理 ${processedCount} 项、待处理 ${pendingCount} 项、失败 ${failedCount} 项。当前尚未执行图像识别、OCR、PDF/DOC/XLS 文档解析。`
            : `Inputs accepted. ${acceptedCount} accepted. ${processedCount} processed, ${pendingCount} pending, and ${failedCount} failed. Vision, OCR, and PDF/DOC/XLS document parsing are not executed at this stage.`;

      const response =
        NextResponse.json(
          {
            success:
              inputResult?.success ??
              false,
            content,
            code:
              inputProcessingResult
                ? "C164_6_1_INPUT_PROCESSING_BRIDGE"
                : "C164_5B_REAL_FILE_UPLOAD_BRIDGE",
            inputResult,
            inputProcessingResult,
            userId:
              identity.userId,
            identityMode:
              "anonymous-alpha",
            dataIsolated:
              true,
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
              inputResult?.success
                ? 200
                : 400,
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

    const result =
      await runWithUserContext(
        identity.userId,
        () =>
          executeChatPrompt(
            prompt,
            locale,
          ),
      );

    const conversation =
      await runWithUserContext(
        identity.userId,
        () =>
          getPersistentMemory(),
      );

    const resultCode =
      "code" in result
        ? result.code
        : undefined;

    const response =
      NextResponse.json(
        {
          ...result,
          conversation,
          inputResult,
          inputProcessingResult,
          userId:
            identity.userId,
          identityMode:
            "anonymous-alpha",
          dataIsolated:
            true,
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
