import type {
  AIProvider,
} from "@/lib/ai/types";

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

import {
  updateProviderRuntimeStatus,
} from "./providerManager";

export interface RuntimeRequest {
  prompt:
    string;
}

export interface RuntimeResponse {
  success:
    boolean;

  provider:
    AIProvider;

  requestedProvider?:
    AIProvider;

  fallbackUsed?:
    boolean;

  error?:
    string;

  content:
    string;

  actionHandled?:
    boolean;

  runtime:
    string;

  runtimeVersion:
    string;

  planId?:
    string;

  planType?:
    RuntimePlanType;

  goal?:
    string;

  intent?:
    PlannerIntent;

  confidence?:
    number;

  capabilities?:
    RuntimeCapability[];

  steps?:
    string[];

  timestamp:
    number;

  latencyMs:
    number;
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
        APP_CONFIG.runtimeId,

      runtimeVersion:
        APP_CONFIG.version,

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
        APP_CONFIG.runtimeId,

      runtimeVersion:
        APP_CONFIG.version,

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
        APP_CONFIG.runtimeId,

      runtimeVersion:
        APP_CONFIG.version,

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

      timestamp,

      latencyMs,
    };
  }
}