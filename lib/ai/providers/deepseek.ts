import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

import { AI_CONFIG } from "../config";
import { createChatCompletion } from "../client";

interface DeepSeekResponse {
  choices?: Array<{
    message?: {
      role?: string;
      content?: string;
    };
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: string;
  };
}

const config =
  AI_CONFIG.providers.deepseek;

export const deepseekProvider: AIProviderAdapter = {
  enabled:
    config.enabled &&
    config.apiKey.trim().length > 0,

  async chat(
    prompt: string
  ): Promise<ChatResponse> {
    const cleanPrompt = prompt.trim();

    if (!this.enabled) {
      return {
        success: false,
        provider: "deepseek",
        content:
          "DeepSeek Provider 未启用或缺少 API Key。",
      };
    }

    if (!cleanPrompt) {
      return {
        success: false,
        provider: "deepseek",
        content: "请输入内容。",
      };
    }

    const result =
      (await createChatCompletion({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        model: config.model,
        prompt: cleanPrompt,
        systemPrompt:
          "你是 AIOS Alpha 的核心助手。请准确理解上下文，并提供清晰、可靠、可执行的回答。",
        temperature: 0.7,
        timeoutMs: 30000,
      })) as DeepSeekResponse;

    if (result.error?.message) {
      throw new Error(
        result.error.message
      );
    }

    const content =
      result.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error(
        "DeepSeek 返回了空内容。"
      );
    }

    return {
      success: true,
      provider: "deepseek",
      content,
    };
  },
};

export default deepseekProvider;