import type { AIProvider, AIProviderAdapter } from "./types";
import { providerRegistry } from "./registry";

const DEFAULT_PROVIDER: AIProvider = "mock";

export function getProvider(): AIProviderAdapter {
  return providerRegistry[DEFAULT_PROVIDER];
}