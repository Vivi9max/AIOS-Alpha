import type {
  AIOSInputItem,
} from "@/lib/runtime/input/aios-input-types";

import type {
  AIOSCNProvider,
} from "./aios-cn-runtime-types";

export interface AIOSCNChatRequest {
  prompt: string;
  provider?: AIOSCNProvider;
  systemPrompt?: string;
  inputs?: AIOSInputItem[];
}

export interface AIOSCNChatResponse {
  success: boolean;
  code:
    | "AIOS_CN_CHAT_COMPLETED"
    | "AIOS_CN_CHAT_INPUT_REQUIRED"
    | "AIOS_CN_CHAT_INPUT_UNDERSTANDING_FAILED"
    | "AIOS_CN_CHAT_RUNTIME_FAILED";
  content: string;
  provider?: AIOSCNProvider;
  requestedProvider?: AIOSCNProvider;
  fallbackUsed?: boolean;
  model?: string;
  inputUnderstanding?: {
    success: boolean;
    understoodCount: number;
    pendingCount: number;
    failedCount: number;
    limitations: string[];
  };
  safetyBoundary: {
    plannerDispatched: false;
    tradingExecuted: false;
    commercialActualWritten: false;
  };
  runtime: "aios-cn-chat";
  runtimeVersion: string;
  latencyMs: number;
  generatedAt: string;
}
