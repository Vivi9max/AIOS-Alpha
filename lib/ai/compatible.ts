import OpenAI from "openai";

import { AI_CONFIG } from "./config";
import type { ChatResponse, AIProvider } from "./types";

export async function compatibleChat(
  provider: AIProvider,
  prompt: string
): Promise<ChatResponse> {
  const config = AI_CONFIG[provider];

  if (provider === "mock") {
    return {
      success: true,
      content: `🤖 Mock Provider\n\n${prompt}`,
    };
  }

  if (!config.apiKey) {
    throw new Error(`${provider} API Key is missing.`);
  }

  const client = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
  });

  const response = await client.chat.completions.create({
    model: config.model,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  return {
    success: true,
    content: response.choices[0]?.message?.content ?? "",
  };
}