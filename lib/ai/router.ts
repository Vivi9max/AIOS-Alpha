import { providerRegistry } from "./registry";
import type { AIProviderAdapter } from "./types";

export function getProvider(): AIProviderAdapter {
  return providerRegistry.mock;
}