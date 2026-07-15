import {
  runBrain,
  type BrainResponse,
} from "../brain";

import {
  updateProviderRuntimeStatus,
} from "./providerManager";

export interface RuntimeRequest {
  prompt: string;
}

export interface RuntimeResponse
  extends BrainResponse {
  runtime: "aios-alpha";
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

    updateProviderRuntimeStatus({
      provider: "mock",
      requestedProvider: "mock",
      fallbackUsed: false,
      success: false,
      error: "请输入内容。",
      latencyMs:
        timestamp - startedAt,
      lastRequestAt: timestamp,
    });

    return {
      success: false,
      provider: "mock",
      requestedProvider: "mock",
      fallbackUsed: false,
      error: "请输入内容。",
      content: "请输入内容。",
      runtime: "aios-alpha",
      timestamp,
      latencyMs:
        timestamp - startedAt,
    };
  }

  try {
    const result =
      await runBrain({
        prompt,
      });

    const timestamp =
      Date.now();

    const latencyMs =
      timestamp - startedAt;

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
      ...result,
      runtime: "aios-alpha",
      timestamp,
      latencyMs,
    };
  } catch (error) {
    const timestamp =
      Date.now();

    const latencyMs =
      timestamp - startedAt;

    const errorMessage =
      error instanceof Error
        ? error.message
        : "AIOS Runtime 未知错误";

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

    return {
      success: false,
      provider: "mock",
      requestedProvider:
        "deepseek",
      fallbackUsed: false,
      error: errorMessage,
      content:
        "AIOS Runtime 暂时不可用。",
      runtime: "aios-alpha",
      timestamp,
      latencyMs,
    };
  }
}