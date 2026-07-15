import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

import { AI_CONFIG } from "../config";

interface QwenResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: {
    message?: string;
  };
}

const config =
  AI_CONFIG.providers.qwen;

export const qwenProvider: AIProviderAdapter = {
  enabled:
    config.enabled &&
    config.apiKey.length > 0,

  async chat(
    prompt: string
  ): Promise<ChatResponse> {
    if (!this.enabled) {
      return {
        success: false,
        provider: "qwen",
        content:
          "Qwen Provider 未启用或缺少 API Key。",
      };
    }

    const response = await fetch(
      `${config.baseURL}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: "system",
              content:
                "你是 AIOS Alpha 的核心助手。请使用清晰、准确、可执行的方式回答用户。",
            },
            {
              role: "user",
              content: prompt,
            },
          ],
          temperature: 0.7,
        }),
        cache: "no-store",
      }
    );

    const data =
      (await response.json()) as QwenResponse;

    if (!response.ok) {
      throw new Error(
        data.error?.message ??
          `Qwen API Error: ${response.status}`
      );
    }

    const content =
      data.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error(
        "Qwen 返回了空内容。"
      );
    }

    return {
      success: true,
      provider: "qwen",
      content,
    };
  },
};

export default qwenProvider;