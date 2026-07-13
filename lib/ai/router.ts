import type { AIProviderAdapter } from "./types";
import { mockProvider } from "./providers/mock";

export function getProvider(): AIProviderAdapter {
  return mockProvider;
}