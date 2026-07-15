import { getProvider } from "@/lib/ai/router";
import { getMemory } from "@/lib/memory/store";

export interface RuntimeModuleStatus {
  enabled: boolean;
  status: "ready" | "disabled";
}

export interface RuntimeStatus {
  success: true;
  runtime: "aios-alpha";
  version: "0.2";
  status: "online";
  provider: string;
  memoryCount: number;
  modules: {
    brain: RuntimeModuleStatus;
    memory: RuntimeModuleStatus;
    tasks: RuntimeModuleStatus;
  };
  timestamp: number;
}

export function getRuntimeStatus(): RuntimeStatus {
  const memory = getMemory();

  return {
    success: true,
    runtime: "aios-alpha",
    version: "0.2",
    status: "online",
    provider: getProvider(),
    memoryCount: memory.length,
    modules: {
      brain: {
        enabled: true,
        status: "ready",
      },
      memory: {
        enabled: true,
        status: "ready",
      },
      tasks: {
        enabled: true,
        status: "ready",
      },
    },
    timestamp: Date.now(),
  };
}