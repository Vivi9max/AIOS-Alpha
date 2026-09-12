import {
  storage,
} from "@/lib/server-storage";

export interface WebIntelligenceHealthState {
  success: boolean;
  verified: boolean;
  sourceCount: number;
  independentHosts: number;
  provider: string;
  latencyMs: number;
  code: string;
  timestamp: number;
}

const WEB_INTELLIGENCE_HEALTH_KEY =
  "aios:web-intelligence:health";

export async function saveWebIntelligenceHealth(
  state: WebIntelligenceHealthState,
): Promise<void> {
  await storage.set(
    WEB_INTELLIGENCE_HEALTH_KEY,
    state,
  );
}

export async function getWebIntelligenceHealth(): Promise<
  WebIntelligenceHealthState | null
> {
  return storage.get<WebIntelligenceHealthState>(
    WEB_INTELLIGENCE_HEALTH_KEY,
  );
}
