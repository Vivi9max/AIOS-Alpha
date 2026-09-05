import type {
  AIProvider,
} from "@/lib/ai/types";

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

import {
  updateProviderRuntimeStatus,
} from "./providerManager";

import {
  saveRuntimeTrace,
} from "./trace-store";

export interface RuntimeRequest {
  prompt: string;
  locale?: Locale;
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
  prompt: string
): string {
  return prompt
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

export async function executeRuntime(
  request: RuntimeRequest
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
      provider:
        "mock",

      requestedProvider:
        "mock",

      fallbackUsed:
        false,

      success:
        false,

      error:
        emptyMessage,

      latencyMs,

      lastRequestAt:
        timestamp,
    });

    saveRuntimeTrace({
      requestId,

      promptPreview:
        "",

      provider:
        "mock",

      success:
        false,

      fallbackUsed:
        false,

      latencyMs,

      capabilityTrace:
        [],

      error:
        emptyMessage,

      startedAt,

      completedAt:
        timestamp,
    });

    return {
      success:
        false,

      provider:
        "mock",

      requestedProvider:
        "mock",

      fallbackUsed:
        false,

      error:
        emptyMessage,

      content:
        emptyMessage,

      actionHandled:
        false,

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
      prompt
    );

  try {
    const result =
      await executeRuntimePlan(
        plan,
        locale,
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
          prompt
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
      provider:
        "mock",

      requestedProvider:
        "deepseek",

      fallbackUsed:
        false,

      success:
        false,

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
          prompt
        ),

      goal:
        plan.goal,

      intent:
        plan.intent,

      planType:
        plan.type,

      provider:
        "mock",

      success:
        false,

      fallbackUsed:
        false,

      latencyMs,

      capabilityTrace:
        [],

      error:
        errorMessage,

      startedAt,

      completedAt:
        timestamp,
    });

    return {
      success:
        false,

      provider:
        "mock",

      requestedProvider:
        "deepseek",

      fallbackUsed:
        false,

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

      capabilityTrace:
        [],

      timestamp,

      latencyMs,

      locale,
    };
  }
}
