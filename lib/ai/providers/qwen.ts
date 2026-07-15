import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

import { AI_CONFIG } from "../config";
import { createChatCompletion } from "../client";
import { buildConversation } from "@/lib/conversation/builder";

interface QwenResponse {
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
  AI_CONFIG.providers.qwen;

export const qwenProvider: AIProviderAdapter = {
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
        provider: "qwen",
        content:
          "Qwen Provider 未启用或缺少 API Key。",
      };
    }

    if (!cleanPrompt) {
      return {
        success: false,
        provider: "qwen",
        content: "请输入内容。",
      };
    }

    const messages =
      buildConversation(
        cleanPrompt,
        20
      );

    const result =
      (await createChatCompletion({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        model: config.model,
        messages,
        temperature: 0.7,
        timeoutMs: 30000,
      })) as QwenResponse;

    if (result.error?.message) {
      throw new Error(
        result.error.message
      );
    }

    const content =
      result.choices?.[0]?.message?.content?.trim();

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