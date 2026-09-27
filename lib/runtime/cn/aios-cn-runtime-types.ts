export type AIOSCNProvider =
  | "deepseek"
  | "qwen"
  | "mock";

export interface AIOSCNRuntimeRequest {
  prompt: string;
  provider?: AIOSCNProvider;
  systemPrompt?: string;
}

export interface AIOSCNRuntimeResponse {
  success: boolean;
  provider: AIOSCNProvider;
  requestedProvider: AIOSCNProvider;
  fallbackUsed: boolean;
  content: string;
  error?: string;
  code:
    | "AIOS_CN_RUNTIME_SUCCESS"
    | "AIOS_CN_RUNTIME_EMPTY_PROMPT"
    | "AIOS_CN_RUNTIME_PROVIDER_UNAVAILABLE"
    | "AIOS_CN_RUNTIME_FAILED";
  runtime: "aios-cn";
  runtimeVersion: string;
  latencyMs: number;
  model?: string;
  generatedAt: string;
  safetyBoundary: {
    plannerDispatched: false;
    tradingExecuted: false;
    commercialActualWritten: false;
  };
}
