import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  executeAIOSCNRuntime,
} from "@/lib/runtime/cn/aios-cn-runtime";

import type {
  AIOSCNProvider,
} from "@/lib/runtime/cn/aios-cn-runtime-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

interface RequestBody {
  prompt?: unknown;
  provider?: unknown;
  systemPrompt?: unknown;
}

function resolveProvider(
  value: unknown,
): AIOSCNProvider | undefined {
  if (
    value === "deepseek" ||
    value === "qwen"
  ) {
    return value;
  }

  return undefined;
}

export async function GET() {
  const deepseekConfigured =
    Boolean(
      process.env.DEEPSEEK_API_KEY?.trim(),
    );

  const qwenConfigured =
    Boolean(
      process.env.QWEN_API_KEY?.trim(),
    );

  return NextResponse.json({
    success: true,
    service:
      "AIOS CN Runtime",
    runtime:
      "aios-cn",
    runtimeVersion:
      "C165.1",
    configuredProviders: {
      deepseek:
        deepseekConfigured,
      qwen:
        qwenConfigured,
    },
    selectedProvider:
      process.env.AIOS_CN_PROVIDER?.trim() ||
      "deepseek",
    fallbackProvider:
      process.env.AIOS_CN_FALLBACK_PROVIDER?.trim() ||
      "qwen",
    capabilities: {
      chat: true,
      inputBridge: false,
      vision: false,
      webIntelligence: false,
      plannerDispatch: false,
      tradingExecution: false,
      commercialActualWrite: false,
    },
    safetyBoundary: {
      plannerDispatched: false,
      tradingExecuted: false,
      commercialActualWritten: false,
    },
  });
}

export async function POST(
  request: NextRequest,
) {
  try {
    const body =
      (await request.json()) as RequestBody;

    const prompt =
      typeof body.prompt === "string"
        ? body.prompt
        : "";

    const systemPrompt =
      typeof body.systemPrompt === "string"
        ? body.systemPrompt
        : undefined;

    const provider =
      resolveProvider(
        body.provider,
      );

    const result =
      await executeAIOSCNRuntime({
        prompt,
        provider,
        systemPrompt,
      });

    return NextResponse.json(
      result,
      {
        status:
          result.success
            ? 200
            : 503,
      },
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "AIOS CN Runtime request failed.";

    return NextResponse.json(
      {
        success: false,
        service:
          "AIOS CN Runtime",
        runtime:
          "aios-cn",
        runtimeVersion:
          "C165.1",
        code:
          "AIOS_CN_RUNTIME_FAILED",
        error: message,
        content:
          "AIOS CN Runtime 请求失败。",
        safetyBoundary: {
          plannerDispatched: false,
          tradingExecuted: false,
          commercialActualWritten: false,
        },
      },
      {
        status: 500,
      },
    );
  }
}
