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

import {
  executeRuntimeVideoFrames,
  type VideoFrameRuntimeResult,
} from "./video-frame-runtime";

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

  videoFrames?: {
    success: boolean;
    code: string;

    frameCount: number;

    successfulFrameCount: number;

    totalBytesRead: number;

    framesDecoded: boolean;

    imagesExtracted: boolean;

    dimensionsDetected: boolean;

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

function buildVideoFrameTraceDetail(
  frames:
    | VideoFrameRuntimeResult
    | undefined,
): string {
  if (!frames) {
    return "Video frame extraction was not executed.";
  }

  return [
    "video.frames",
    `status=${frames.code}`,
    `frames=${frames.successfulFrameCount}/${frames.frameCount}`,
    `bytes=${frames.totalBytesRead}`,
    `framesDecoded=${frames.visualEvidence.framesDecoded}`,
    `imagesExtracted=${frames.visualEvidence.imagesExtracted}`,
    `dimensionsDetected=${frames.visualEvidence.dimensionsDetected}`,
    `semanticUnderstandingReady=${frames.visualEvidence.semanticUnderstandingReady}`,
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
      const provider =
        getActiveProvider();

      let videoEvidence:
        | VideoEvidenceRuntimeResult
        | undefined;

      let videoFrames:
        | VideoFrameRuntimeResult
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

      if (
        videoEvidence?.success &&
        videoResult.selectedUrl &&
        videoResult.processing
      ) {
        videoFrames =
          await executeRuntimeVideoFrames(
            videoResult.selectedUrl,

            videoResult.mediaType ??
              "unknown",

            {
              durationSeconds:
                videoResult.processing
                  .durationSeconds,
            },
          );
      }

      const timestamp =
        Date.now();

      const latencyMs =
        timestamp -
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
              ) &&
              (
                !videoFrames ||
                videoFrames.success
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

                buildVideoFrameTraceDetail(
                  videoFrames,
                ),
              ].join(
                " | ",
              ),
          },
        ];

      const runtimeSuccess =
        videoResult.success &&
        (
          !videoEvidence ||
          videoEvidence.success
        ) &&
        (
          !videoFrames ||
          videoFrames.success ||
          videoFrames.code ===
            "C144_7_VIDEO_FRAME_DECODER_UNAVAILABLE"
        );

      updateProviderRuntimeStatus({
        provider,

        requestedProvider:
          provider,

        fallbackUsed: false,

        success:
          runtimeSuccess,

        error:
          runtimeSuccess
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
          runtimeSuccess,

        fallbackUsed: false,

        latencyMs,

        capabilityTrace,

        error:
          runtimeSuccess
            ? undefined
            : videoResult.error ??
              videoResult.code,

        startedAt,

        completedAt:
          timestamp,
      });

      return {
        success:
          runtimeSuccess,

        provider,

        requestedProvider:
          provider,

        fallbackUsed:
          false,

        error:
          runtimeSuccess
            ? undefined
            : videoResult.error ??
              videoResult.code,

        content:
          [
            videoResult.content ??
              "",

            ...(videoEvidence
              ? [
                  "",
                  "Video Evidence Sampling",
                  `处理代码：${videoEvidence.code}`,
                  `采样：${videoEvidence.successfulSampleCount}/${videoEvidence.sampleCount}`,
                  `采样字节：${videoEvidence.totalBytesRead}`,
                  `采样时间点：${
                    videoEvidence.timeline
                      ?.sampleTimesSeconds
                      ?.map(
                        (value) =>
                          `${value.toFixed(3)}s`,
                      )
                      .join(", ") ??
                    "未提供"
                  }`,
                  `Byte Range 验证：${
                    videoEvidence.evidence
                      .byteRangesVerified
                      ? "成功"
                      : "未完成"
                  }`,
                  `Temporal Sampling：${
                    videoEvidence.evidence
                      .temporalSamplingPlanned
                      ? "已建立"
                      : "未建立"
                  }`,
                  `Visual Frames Decoded：${
                    videoEvidence.evidence
                      .visualFramesDecoded
                      ? "true"
                      : "false"
                  }`,
                  `Audio Decoded：${
                    videoEvidence.evidence
                      .audioDecoded
                      ? "true"
                      : "false"
                  }`,
                  `Semantic Understanding Ready：${
                    videoEvidence.evidence
                      .semanticUnderstandingReady
                      ? "true"
                      : "false"
                  }`,
                ]
              : []),

            ...(videoFrames
              ? [
                  "",
                  "Video Frame Extraction",
                  `处理代码：${videoFrames.code}`,
                  `Frame：${videoFrames.successfulFrameCount}/${videoFrames.frameCount}`,
                  `帧读取字节：${videoFrames.totalBytesRead}`,
                  `Frames Decoded：${
                    videoFrames.visualEvidence
                      .framesDecoded
                      ? "true"
                      : "false"
                  }`,
                  `Images Extracted：${
                    videoFrames.visualEvidence
                      .imagesExtracted
                      ? "true"
                      : "false"
                  }`,
                  `Dimensions Detected：${
                    videoFrames.visualEvidence
                      .dimensionsDetected
                      ? "true"
                      : "false"
                  }`,
                  `Semantic Understanding Ready：${
                    videoFrames.visualEvidence
                      .semanticUnderstandingReady
                      ? "true"
                      : "false"
                  }`,
                ]
              : []),
          ].join("\n"),

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

          "Video Frame Extraction",
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

        videoFrames:
          videoFrames
            ? {
                success:
                  videoFrames.success,

                code:
                  videoFrames.code,

                frameCount:
                  videoFrames.frameCount,

                successfulFrameCount:
                  videoFrames
                    .successfulFrameCount,

                totalBytesRead:
                  videoFrames
                    .totalBytesRead,

                framesDecoded:
                  videoFrames.visualEvidence
                    .framesDecoded,

                imagesExtracted:
                  videoFrames.visualEvidence
                    .imagesExtracted,

                dimensionsDetected:
                  videoFrames.visualEvidence
                    .dimensionsDetected,

                semanticUnderstandingReady:
                  videoFrames.visualEvidence
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

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    const provider =
      getActiveProvider();

    updateProviderRuntimeStatus({
      provider,

      requestedProvider:
        provider,

      fallbackUsed: false,

      success: false,

      error: message,

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

      success: false,

      fallbackUsed: false,

      latencyMs,

      capabilityTrace: [],

      error: message,

      startedAt,

      completedAt:
        timestamp,
    });

    const localizedError =
      locale === "ja"
        ? `ランタイム実行に失敗しました：${message}`
        : locale === "zh-CN"
          ? `运行时执行失败：${message}`
          : `Runtime execution failed: ${message}`;

    return {
      success: false,

      provider,

      requestedProvider:
        provider,

      fallbackUsed: false,

      error: message,

      content:
        localizedError,

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

      timestamp,

      latencyMs,

      locale,
    };
  }
}
