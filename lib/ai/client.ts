export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatRequest {
  apiKey: string;
  baseURL: string;
  model: string;
  prompt?: string;
  messages?: ChatMessage[];
  systemPrompt?: string;
  temperature?: number;
  timeoutMs?: number;
}

export interface ChatCompletionResponse {
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

function normalizeBaseURL(
  baseURL: string
): string {
  return baseURL
    .trim()
    .replace(/\/+$/, "");
}

function normalizeMessages(
  messages: ChatMessage[]
): ChatMessage[] {
  return messages
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))
    .filter(
      (message) =>
        message.content.length > 0
    );
}

function buildPayloadMessages(
  request: ChatRequest
): ChatMessage[] {
  if (
    Array.isArray(request.messages) &&
    request.messages.length > 0
  ) {
    return normalizeMessages(
      request.messages
    );
  }

  const messages: ChatMessage[] = [];

  const systemPrompt =
    request.systemPrompt?.trim();

  const prompt =
    request.prompt?.trim();

  if (systemPrompt) {
    messages.push({
      role: "system",
      content: systemPrompt,
    });
  }

  if (prompt) {
    messages.push({
      role: "user",
      content: prompt,
    });
  }

  return messages;
}

export async function createChatCompletion(
  request: ChatRequest
): Promise<ChatCompletionResponse> {
  const apiKey = request.apiKey.trim();

  const baseURL = normalizeBaseURL(
    request.baseURL
  );

  const model = request.model.trim();

  const messages =
    buildPayloadMessages(request);

  if (!apiKey) {
    throw new Error(
      "AI Provider API Key 缺失。"
    );
  }

  if (!baseURL) {
    throw new Error(
      "AI Provider Base URL 缺失。"
    );
  }

  if (!model) {
    throw new Error(
      "AI Provider Model 缺失。"
    );
  }

  if (messages.length === 0) {
    throw new Error(
      "对话内容不能为空。"
    );
  }

  const controller =
    new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    Math.max(
      1000,
      request.timeoutMs ?? 30000
    )
  );

  try {
    const response = await fetch(
      `${baseURL}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${apiKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          temperature:
            request.temperature ?? 0.7,
        }),
        cache: "no-store",
        signal: controller.signal,
      }
    );

    let data:
      | ChatCompletionResponse
      | null = null;

    try {
      data =
        (await response.json()) as ChatCompletionResponse;
    } catch {
      data = null;
    }

    if (!response.ok) {
      throw new Error(
        data?.error?.message ??
          `AI Provider 请求失败：${response.status}`
      );
    }

    if (!data) {
      throw new Error(
        "AI Provider 返回了无效数据。"
      );
    }

    return data;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Error(
        "AI Provider 请求超时。"
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}