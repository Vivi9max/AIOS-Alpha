import OpenAI from "openai";
import type { AIProvider } from "./types";
import { AI_CONFIG } from "./config";

export function createClient(provider: AIProvider) {
  const config = AI_CONFIG[provider];

  if (!config.apiKey) {
    throw new Error(`${provider} API Key is missing.`);
  }

  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });
}