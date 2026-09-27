import {
  createChatCompletion,
} from "@/lib/ai/client";

import type {
  AIOSCNProvider,
  AIOSCNRuntimeRequest,
  AIOSCNRuntimeResponse,
} from "./aios-cn-runtime-types";

const RUNTIME_VERSION =
  "C165.1";

interface ProviderConfig {
  provider: AIOSCNProvider;
  apiKey: string;
  baseURL: string;
  model: string;
}

function getProviderConfig(
  provider: AIOSCNProvider,
): ProviderConfig | null {
  if (provider === "deepseek") {
    const apiKey =
      process.env.DEEPSEEK_API_KEY?.trim() ??
      "";

    if (!apiKey) {
      return null;
    }

    return {
      provider: "deepseek",
      apiKey,
      baseURL:
        process.env.DEEPSEEK_BASE_URL?.trim() ||
        "https://api.deepseek.com/v1",
      model:
        process.env.DEEPSEEK_MODEL?.trim() ||
        "deepseek-chat",
    };
  }

  if (provider === "qwen") {
    const apiKey =
      process.env.QWEN_API_KEY?.trim() ??
      "";

    if (!apiKey) {
      return null;
    }

    return {
      provider: "qwen",
      apiKey,
      baseURL:
        process.env.QWEN_BASE_URL?.trim() ||
        "https://dashscope.aliyuncs.com/compatible-mode/v1",
      model:
        process.env.QWEN_MODEL?.trim() ||
        "qwen-plus",
    };
  }

  return null;
}

function resolveRequestedProvider(
  provider?: AIOSCNProvider,
): AIOSCNProvider {
  if (
    provider === "deepseek" ||
    provider === "qwen"
  ) {
    return provider;
  }

  const configured =
    process.env.AIOS_CN_PROVIDER?.trim();

  if (
    configured === "deepseek" ||
    configured === "qwen"
  ) {
    return configured;
  }

  return "deepseek";
}

function resolveFallbackProvider(
  requested: AIOSCNProvider,
): AIOSCNProvider | null {
  const configured =
    process.env.AIOS_CN_FALLBACK_PROVIDER?.trim();

  if (
    configured === "deepseek" &&
    requested !== "deepseek"
  ) {
    return "deepseek";
  }

  if (
    configured === "qwen" &&
    requested !== "qwen"
  ) {
    return "qwen";
  }

  if (requested === "deepseek") {
    return "qwen";
  }

  if (requested === "qwen") {
    return "deepseek";
  }

  return null;
}

function buildResponse(
  values: Omit<
    AIOSCNRuntimeResponse,
    "runtime" | "runtimeVersion"
  >,
): AIOSCNRuntimeResponse {
  return {
    ...values,
    runtime: "aios-cn",
    runtimeVersion:
      RUNTIME_VERSION,
  };
}

export async function executeAIOSCNRuntime(
  request: AIOSCNRuntimeRequest,
): Promise<AIOSCNRuntimeResponse> {
  const startedAt =
    Date.now();

  const prompt =
    request.prompt.trim();

  const requestedProvider =
    resolveRequestedProvider(
      request.provider,
    );

  if (!prompt) {
    return buildResponse({
      success: false,
      provider: "mock",
      requestedProvider,
      fallbackUsed: false,
      content:
        "请输入内容。",
      code:
        "AIOS_CN_RUNTIME_EMPTY_PROMPT",
      error:
        "Prompt is empty.",
      latencyMs:
        Date.now() -
        startedAt,
      generatedAt:
        new Date().toISOString(),
      safetyBoundary: {
        plannerDispatched: false,
        tradingExecuted: false,
        commercialActualWritten: false,
      },
    });
  }

  const requestedConfig =
    getProviderConfig(
      requestedProvider,
    );

  if (!requestedConfig) {
    const fallbackProvider =
      resolveFallbackProvider(
        requestedProvider,
      );

    const fallbackConfig =
      fallbackProvider
        ? getProviderConfig(
            fallbackProvider,
          )
        : null;

    if (!fallbackConfig) {
      return buildResponse({
        success: false,
        provider: "mock",
        requestedProvider,
        fallbackUsed: false,
        content:
          "AIOS CN Runtime 当前没有可用的 Provider。",
        code:
          "AIOS_CN_RUNTIME_PROVIDER_UNAVAILABLE",
        error:
          "No configured CN provider is available.",
        latencyMs:
          Date.now() -
          startedAt,
        generatedAt:
          new Date().toISOString(),
        safetyBoundary: {
          plannerDispatched: false,
          tradingExecuted: false,
          commercialActualWritten: false,
        },
      });
    }

    return executeProvider(
      fallbackConfig,
      requestedProvider,
      true,
      prompt,
      request.systemPrompt,
      startedAt,
    );
  }

  try {
    return await executeProvider(
      requestedConfig,
      requestedProvider,
      false,
      prompt,
      request.systemPrompt,
      startedAt,
    );
  } catch (error) {
    const fallbackProvider =
      resolveFallbackProvider(
        requestedProvider,
      );

    const fallbackConfig =
      fallbackProvider
        ? getProviderConfig(
            fallbackProvider,
          )
        : null;

    if (!fallbackConfig) {
      const message =
        error instanceof Error
          ? error.message
          : "CN Runtime Provider request failed.";

      return buildResponse({
        success: false,
        provider:
          requestedProvider,
        requestedProvider,
        fallbackUsed: false,
        content:
          "AIOS CN Runtime 请求失败。",
        code:
          "AIOS_CN_RUNTIME_FAILED",
        error: message,
        latencyMs:
          Date.now() -
          startedAt,
        generatedAt:
          new Date().toISOString(),
        model:
          requestedConfig.model,
        safetyBoundary: {
          plannerDispatched: false,
          tradingExecuted: false,
          commercialActualWritten: false,
        },
      });
    }

    try {
      return await executeProvider(
        fallbackConfig,
        requestedProvider,
        true,
        prompt,
        request.systemPrompt,
        startedAt,
      );
    } catch (fallbackError) {
      const message =
        fallbackError instanceof Error
          ? fallbackError.message
          : "CN Runtime fallback failed.";

      return buildResponse({
        success: false,
        provider:
          fallbackConfig.provider,
        requestedProvider,
        fallbackUsed: true,
        content:
          "AIOS CN Runtime 请求失败。",
        code:
          "AIOS_CN_RUNTIME_FAILED",
        error: message,
        latencyMs:
          Date.now() -
          startedAt,
        generatedAt:
          new Date().toISOString(),
        model:
          fallbackConfig.model,
        safetyBoundary: {
          plannerDispatched: false,
          tradingExecuted: false,
          commercialActualWritten: false,
        },
      });
    }
  }
}

async function executeProvider(
  config: ProviderConfig,
  requestedProvider: AIOSCNProvider,
  fallbackUsed: boolean,
  prompt: string,
  systemPrompt: string | undefined,
  startedAt: number,
): Promise<AIOSCNRuntimeResponse> {
  const result =
    await createChatCompletion({
      apiKey:
        config.apiKey,
      baseURL:
        config.baseURL,
      model:
        config.model,
      prompt,
      systemPrompt,
      temperature:
        0.7,
      timeoutMs:
        30000,
    });

  const content =
    result.choices?.[0]
      ?.message
      ?.content
      ?.trim();

  if (!content) {
    throw new Error(
      `${config.provider} returned empty content.`,
    );
  }

  return buildResponse({
    success: true,
    provider:
      config.provider,
    requestedProvider,
    fallbackUsed,
    content,
    code:
      "AIOS_CN_RUNTIME_SUCCESS",
    latencyMs:
      Date.now() -
      startedAt,
    generatedAt:
      new Date().toISOString(),
    model:
      config.model,
    safetyBoundary: {
      plannerDispatched: false,
      tradingExecuted: false,
      commercialActualWritten: false,
    },
  });
}
