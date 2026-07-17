import type {
  AIProvider,
} from "@/lib/ai/types";

import {
  buildRuntimePlan,
} from "./planner";

import {
  executeRuntimePlan,
} from "./executor";

import {
  updateProviderRuntimeStatus,
} from "./providerManager";

export interface RuntimeRequest {
  prompt: string;
}

export interface RuntimeResponse {
  success: boolean;

  provider: AIProvider;

  requestedProvider?: AIProvider;

  fallbackUsed?: boolean;

  error?: string;

  content: string;

  actionHandled?: boolean;

  runtime:
    "aios-alpha";

  runtimeVersion:
    "0.3";

  planId?: string;

  planType?:
    | "workspace-action"
    | "conversation";

  steps?: string[];

  timestamp: number;

  latencyMs: number;
}

export async function executeRuntime(
  request: RuntimeRequest
): Promise<RuntimeResponse> {
  const prompt =
    request.prompt.trim();

  const startedAt =
    Date.now();

  if (!prompt) {
    const timestamp =
      Date.now();

    const latencyMs =
      timestamp -
      startedAt;

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
        "请输入内容。",

      latencyMs,

      lastRequestAt:
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
        "请输入内容。",

      content:
        "请输入内容。",

      actionHandled:
        false,

      runtime:
        "aios-alpha",

      runtimeVersion:
        "0.3",

      timestamp,

      latencyMs,
    };
  }

  const plan =
    buildRuntimePlan(
      prompt
    );

  try {
    const result =
      await executeRuntimePlan(
        plan
      );

    const timestamp =
      Date.now();

    const latencyMs =
      timestamp -
      startedAt;

    updateProviderRuntimeStatus({
      provider:
        result.provider,

      requestedProvider:
        result.requestedProvider ??
        result.provider,

      fallbackUsed:
        result.fallbackUsed ??
        false,

      success:
        result.success,

      error:
        result.error,

      latencyMs,

      lastRequestAt:
        timestamp,
    });

    return {
      success:
        result.success,

      provider:
        result.provider,

      requestedProvider:
        result.requestedProvider,

      fallbackUsed:
        result.fallbackUsed,

      error:
        result.error,

      content:
        result.content,

      actionHandled:
        result.actionHandled,

      runtime:
        "aios-alpha",

      runtimeVersion:
        "0.3",

      planId:
        result.planId,

      planType:
        result.planType,

      steps:
        result.steps,

      timestamp,

      latencyMs,
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
        : "AIOS Runtime 未知错误";

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
        "AIOS Runtime 暂时不可用。",

      actionHandled:
        false,

      runtime:
        "aios-alpha",

      runtimeVersion:
        "0.3",

      planId:
        plan.id,

      planType:
        plan.type,

      steps:
        plan.steps,

      timestamp,

      latencyMs,
    };
  }
}