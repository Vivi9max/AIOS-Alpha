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

import {
  executeRuntimeVideoEvidence,
  type VideoEvidenceRuntimeResult,
} from "./video-evidence-runtime";

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

  videoProcessing?: {
    success: boolean;
    code: string;
    container?: string;
    durationSeconds?: number;
    width?: number;
    height?: number;
    videoCodec?: string;
    audioCodec?: string;
    frameRate?: number;
    videoTrackCount: number;
    audioTrackCount: number;
    bytesRead: number;
  };

  videoEvidence?: {
    success: boolean;
    code: string;

    sampleCount: number;

    successfulSampleCount: number;

    totalBytesRead: number;

    sampleTimesSeconds: number[];

    byteRangesVerified: boolean;

    temporalSamplingPlanned: boolean;

    visualFramesDecoded: boolean;

    audioDecoded: boolean;

    semanticUnderstandingReady: boolean;
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

function buildVideoEvidenceTraceDetail(
  evidence:
    | VideoEvidenceRuntimeResult
    | undefined,
): string {
  if (!evidence) {
    return "Video evidence sampling was not executed.";
  }

  return [
    "video.evidence",
    `status=${evidence.code}`,
    `samples=${evidence.successfulSampleCount}/${evidence.sampleCount}`,
    `bytes=${evidence.totalBytesRead}`,
    `byteRangesVerified=${evidence.evidence.byteRangesVerified}`,
    `visualFramesDecoded=${evidence.evidence.visualFramesDecoded}`,
    `audioDecoded=${evidence.evidence.audioDecoded}`,
    `semanticUnderstandingReady=${evidence.evidence.semanticUnderstandingReady}`,
  ].join(" | ");
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
      timestamp -
      startedAt;

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

      const provider =
        getActiveProvider();

      let videoEvidence:
        | VideoEvidenceRuntimeResult
        | undefined;

      if (
        videoResult.success &&
        videoResult.selectedUrl &&
        videoResult.processing
      ) {
        videoEvidence =
          await executeRuntimeVideoEvidence(
            videoResult.selectedUrl,

            videoResult.mediaType ??
              "unknown",

            {
              durationSeconds:
                videoResult.processing
                  .durationSeconds,

              contentLength:
                videoResult.media
                  ?.contentLength,
            },
          );
      }

      const latencyMs =
        Date.now() -
        startedAt;

      const capabilityTrace:
        CapabilityTrace[] = [
          {
            capability:
              plan.capabilities[0],

            status:
              videoResult.success &&
              (
                !videoEvidence ||
                videoEvidence.success
              )
                ? "completed"
                : "failed",

            durationMs:
              latencyMs,

            detail:
              [
                "video.resolve",
                videoResult.success
                  ? "Video page resolved, Primary media selected, actual media read, and video processing completed."
                  : videoResult.error ??
                    videoResult.code,

                buildVideoEvidenceTraceDetail(
                  videoEvidence,
                ),
              ].join(
                " | ",
              ),
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

        capabilities:
          plan.capabilities,

        steps: [
          ...plan.steps,

          "解析视频网页",

          "提取视频候选",

          "选择 Primary 视频",

          "实际媒体读取",

          "媒体 Metadata 处理",

          "Video Track 处理",

          "Video Evidence Sampling",
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

        videoProcessing:
          videoResult.processing
            ? {
                success:
                  videoResult.processing
                    .success,

                code:
                  videoResult.processing
                    .code,

                container:
                  videoResult.processing
                    .container,

                durationSeconds:
                  videoResult.processing
                    .durationSeconds,

                width:
                  videoResult.processing
                    .width,

                height:
                  videoResult.processing
                    .height,

                videoCodec:
                  videoResult.processing
                    .videoCodec,

                audioCodec:
                  videoResult.processing
                    .audioCodec,

                frameRate:
                  videoResult.processing
                    .frameRate,

                videoTrackCount:
                  videoResult.processing
                    .videoTrackCount,

                audioTrackCount:
                  videoResult.processing
                    .audioTrackCount,

                bytesRead:
                  videoResult.processing
                    .bytesRead,
              }
            : undefined,

        videoEvidence:
          videoEvidence
            ? {
                success:
                  videoEvidence.success,

                code:
                  videoEvidence.code,

                sampleCount:
                  videoEvidence.sampleCount,

                successfulSampleCount:
                  videoEvidence
                    .successfulSampleCount,

                totalBytesRead:
                  videoEvidence
                    .totalBytesRead,

                sampleTimesSeconds:
                  videoEvidence.timeline
                    ?.sampleTimesSeconds ??
                  [],

                byteRangesVerified:
                  videoEvidence.evidence
                    .byteRangesVerified,

                temporalSamplingPlanned:
                  videoEvidence.evidence
                    .temporalSamplingPlanned,

                visualFramesDecoded:
                  videoEvidence.evidence
                    .visualFramesDecoded,

                audioDecoded:
                  videoEvidence.evidence
                    .audioDecoded,

                semanticUnderstandingReady:
                  videoEvidence.evidence
                    .semanticUnderstandingReady,
              }
            : undefined,

        timestamp,

        latencyMs,

        locale,
      };
    }

    const result =
      await executeRuntimePlan(
        plan,
        locale,
        request.webContext,
      );

    const timestamp =
      Date.now();

    const latencyMs =
      timestamp -
      startedAt;

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
      timestamp -
      startedAt;

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

      error:
        errorMessage,

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

      error:
        errorMessage,

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
