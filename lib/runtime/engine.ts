import type {
  AIProvider,
} from "@/lib/ai/types";

import {
  getActiveProvider,
} from "@/lib/ai/router";

import type {
  Locale,
} from "@/lib/i18n";

import {
  APP_CONFIG,
} from "@/lib/config/app";

import {
  buildRuntimePlan,
  type PlannerIntent,
  type RuntimeCapability,
  type RuntimePlanType,
} from "./planner";

import {
  executeRuntimePlan,
} from "./executor";

import type {
  CapabilityTrace,
} from "./capability-router";

import type {
  WebIntelligenceResult,
} from "@/lib/web-intelligence";

import {
  updateProviderRuntimeStatus,
} from "./providerManager";

import {
  saveRuntimeTrace,
} from "./trace-store";

import {
  executeRuntimeVideoRequest,
} from "./video-runtime";

export interface RuntimeRequest {
  prompt: string;
  locale?: Locale;
  webContext?: WebIntelligenceResult;
}

export interface RuntimeResponse {
  success: boolean;

  provider: AIProvider;

  requestedProvider?: AIProvider;

  fallbackUsed?: boolean;

  error?: string;

  content: string;

  actionHandled?: boolean;

  runtime: string;

  runtimeVersion: string;

  requestId: string;

  planId?: string;

  planType?: RuntimePlanType;

  goal?: string;

  intent?: PlannerIntent;

  confidence?: number;

  capabilities?: RuntimeCapability[];

  steps?: string[];

  capabilityTrace?: CapabilityTrace[];

  webIntelligence?: {
    required: boolean;
    success: boolean;
    verified: boolean;
    sourceCount: number;
    sourceHosts: string[];
  };

  liveDecision?: {
    success: boolean;
    ready: boolean;
    priority?: string;
    conclusion?: string;
    nextStep?: string;
  };

  videoResolution?: {
    detected: boolean;
    success: boolean;
    code: string;
    sourceUrl?: string;
    selectedUrl?: string;
    mediaType?: string;
    title?: string;
    candidateCount: number;
  };

  timestamp: number;

  latencyMs: number;

  locale?: Locale;
}

function createRequestId(): string {
  return [
    "request",
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 8),
  ].join("-");
}

function createPromptPreview(
  prompt: string,
): string {
  return prompt
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

export async function executeRuntime(
  request: RuntimeRequest,
): Promise<RuntimeResponse> {
  const requestId =
    createRequestId();

  const prompt =
    request.prompt.trim();

  const locale =
    request.locale ?? "en";

  const startedAt =
    Date.now();

  if (!prompt) {
    const timestamp =
      Date.now();

    const latencyMs =
      timestamp - startedAt;

    const emptyMessage =
      locale === "ja"
        ? "内容を入力してください。"
        : locale === "zh-CN"
          ? "请输入内容。"
          : "Please enter a message.";

    updateProviderRuntimeStatus({
      provider: "mock",
      requestedProvider: "mock",
      fallbackUsed: false,
      success: false,
      error: emptyMessage,
      latencyMs,
      lastRequestAt:
        timestamp,
    });

    saveRuntimeTrace({
      requestId,
      promptPreview: "",
      provider: "mock",
      success: false,
      fallbackUsed: false,
      latencyMs,
      capabilityTrace: [],
      error: emptyMessage,
      startedAt,
      completedAt:
        timestamp,
    });

    return {
      success: false,
      provider: "mock",
      requestedProvider: "mock",
      fallbackUsed: false,
      error: emptyMessage,
      content: emptyMessage,
      actionHandled: false,
      runtime:
        APP_CONFIG.runtimeId,
      runtimeVersion:
        APP_CONFIG.version,
      requestId,
      timestamp,
      latencyMs,
      locale,
    };
  }

  const plan =
    buildRuntimePlan(
      prompt,
    );

  try {
    /*
     * C144.4.9
     *
     * Video Resolver Runtime Bridge
     *
     * The Runtime first builds the normal Runtime Plan.
     * Video requests are then routed to the dedicated
     * Video Resolver capability instead of asking Brain
     * to guess or fabricate a media URL.
     *
     * Runtime pipeline:
     *
     * User Request
     *   -> Planner
     *   -> Video Intent Detection
     *   -> Video Resolver
     *   -> Candidate Selection
     *   -> Runtime Response
     */
    const videoResult =
      await executeRuntimeVideoRequest(
        plan.prompt,
        locale,
      );

    if (
      videoResult.detected
    ) {
      const timestamp =
        Date.now();

      const latencyMs =
        timestamp -
        startedAt;

      const provider =
        getActiveProvider();

      const capabilityTrace:
        CapabilityTrace[] = [
          {
            capability:
              "video.resolve",
            status:
              videoResult.success
                ? "completed"
                : "failed",
            durationMs:
              latencyMs,
            detail:
              videoResult.success
                ? "Video page resolved and Primary media candidate selected."
                : videoResult.error ??
                  videoResult.code,
          },
        ];

      updateProviderRuntimeStatus({
        provider,
        requestedProvider:
          provider,
        fallbackUsed: false,
        success:
          videoResult.success,
        error:
          videoResult.success
            ? undefined
            : videoResult.error ??
              videoResult.code,
        latencyMs,
        lastRequestAt:
          timestamp,
      });

      saveRuntimeTrace({
        requestId,
        planId:
          plan.id,
        promptPreview:
          createPromptPreview(
            prompt,
          ),
        goal:
          plan.goal,
        intent:
          plan.intent,
        planType:
          plan.type,
        provider,
        success:
          videoResult.success,
        fallbackUsed: false,
        latencyMs,
        capabilityTrace,
        error:
          videoResult.success
            ? undefined
            : videoResult.error ??
              videoResult.code,
        startedAt,
        completedAt:
          timestamp,
      });

      return {
        success:
          videoResult.success,

        provider,

        requestedProvider:
          provider,

        fallbackUsed:
          false,

        error:
          videoResult.success
            ? undefined
            : videoResult.error ??
              videoResult.code,

        content:
          videoResult.content ??
          "",

        actionHandled:
          false,

        runtime:
          APP_CONFIG.runtimeId,

        runtimeVersion:
          APP_CONFIG.version,

        requestId,

        planId:
          plan.id,

        planType:
          plan.type,

        goal:
          plan.goal,

        intent:
          plan.intent,

        confidence:
          plan.confidence,

        capabilities: [
          ...plan.capabilities,
          "video.resolve",
        ],

        steps: [
          ...plan.steps,
          "解析视频网页",
          "提取视频候选",
          "选择 Primary 视频",
        ],

        capabilityTrace,

        webIntelligence:
          undefined,

        liveDecision:
          undefined,

        videoResolution: {
          detected:
            videoResult.detected,

          success:
            videoResult.success,

          code:
            videoResult.code,

          sourceUrl:
            videoResult.sourceUrl,

          selectedUrl:
            videoResult.selectedUrl,

          mediaType:
            videoResult.mediaType,

          title:
            videoResult.title,

          candidateCount:
            videoResult.candidateCount,
        },

        timestamp,

        latencyMs,

        locale,
      };
    }

    /*
     * Existing Runtime execution path.
     *
     * Non-video requests continue through the existing
     * Workspace / Web Intelligence / Decision / Brain
     * pipeline without behavior changes.
     */
    const result =
      await executeRuntimePlan(
        plan,
        locale,
        request.webContext,
      );

    const timestamp =
      Date.now();

    const latencyMs =
      timestamp - startedAt;

    const requestedProvider =
      result.requestedProvider ??
      result.provider;

    const fallbackUsed =
      result.fallbackUsed ??
      false;

    const capabilityTrace =
      result.capabilityTrace ??
      [];

    updateProviderRuntimeStatus({
      provider:
        result.provider,
      requestedProvider,
      fallbackUsed,
      success:
        result.success,
      error:
        result.error,
      latencyMs,
      lastRequestAt:
        timestamp,
    });

    saveRuntimeTrace({
      requestId,
      planId:
        result.planId,
      promptPreview:
        createPromptPreview(
          prompt,
        ),
      goal:
        result.goal,
      intent:
        result.intent,
      planType:
        result.planType,
      provider:
        result.provider,
      success:
        result.success,
      fallbackUsed,
      latencyMs,
      capabilityTrace,
      error:
        result.error,
      startedAt,
      completedAt:
        timestamp,
    });

    return {
      success:
        result.success,

      provider:
        result.provider,

      requestedProvider,

      fallbackUsed,

      error:
        result.error,

      content:
        result.content,

      actionHandled:
        result.actionHandled,

      runtime:
        APP_CONFIG.runtimeId,

      runtimeVersion:
        APP_CONFIG.version,

      requestId,

      planId:
        result.planId,

      planType:
        result.planType,

      goal:
        result.goal,

      intent:
        result.intent,

      confidence:
        result.confidence,

      capabilities:
        result.capabilities,

      steps:
        result.steps,

      capabilityTrace,

      webIntelligence:
        result.webIntelligence,

      liveDecision:
        result.liveDecision,

      timestamp,

      latencyMs,

      locale,
    };
  } catch (error) {
    const timestamp =
      Date.now();

    const latencyMs =
      timestamp - startedAt;

    const errorMessage =
      error instanceof Error
        ? error.message
        : locale === "ja"
          ? "AIOS Runtime で不明なエラーが発生しました。"
          : locale === "zh-CN"
            ? "AIOS Runtime 未知错误"
            : "Unknown AIOS Runtime error.";

    const unavailableMessage =
      locale === "ja"
        ? "AIOS Runtime は一時的に利用できません。"
        : locale === "zh-CN"
          ? "AIOS Runtime 暂时不可用。"
          : "AIOS Runtime is temporarily unavailable.";

    updateProviderRuntimeStatus({
      provider: "mock",
      requestedProvider:
        "deepseek",
      fallbackUsed: false,
      success: false,
      error: errorMessage,
      latencyMs,
      lastRequestAt:
        timestamp,
    });

    saveRuntimeTrace({
      requestId,
      planId:
        plan.id,
      promptPreview:
        createPromptPreview(
          prompt,
        ),
      goal:
        plan.goal,
      intent:
        plan.intent,
      planType:
        plan.type,
      provider: "mock",
      success: false,
      fallbackUsed: false,
      latencyMs,
      capabilityTrace: [],
      error: errorMessage,
      startedAt,
      completedAt:
        timestamp,
    });

    return {
      success: false,

      provider: "mock",

      requestedProvider:
        "deepseek",

      fallbackUsed: false,

      error:
        errorMessage,

      content:
        unavailableMessage,

      actionHandled: false,

      runtime:
        APP_CONFIG.runtimeId,

      runtimeVersion:
        APP_CONFIG.version,

      requestId,

      planId:
        plan.id,

      planType:
        plan.type,

      goal:
        plan.goal,

      intent:
        plan.intent,

      confidence:
        plan.confidence,

      capabilities:
        plan.capabilities,

      steps:
        plan.steps,

      capabilityTrace: [],

      webIntelligence:
        request.webContext
          ? {
              required: true,
              success:
                request.webContext
                  .success,
              verified:
                request.webContext
                  .verified,
              sourceCount:
                request.webContext
                  .sourceCount,
              sourceHosts:
                request.webContext
                  .sourceHosts,
            }
          : undefined,

      liveDecision:
        undefined,

      timestamp,

      latencyMs,

      locale,
    };
  }
}
