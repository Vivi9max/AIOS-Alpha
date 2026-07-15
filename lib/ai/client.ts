export interface ChatRequest {
  apiKey: string;
  baseURL: string;
  model: string;
  prompt: string;
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

export async function createChatCompletion(
  request: ChatRequest
): Promise<ChatCompletionResponse> {
  const apiKey = request.apiKey.trim();
  const baseURL = normalizeBaseURL(
    request.baseURL
  );
  const model = request.model.trim();
  const prompt = request.prompt.trim();

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

  if (!prompt) {
    throw new Error(
      "Prompt 不能为空。"
    );
  }

  const controller =
    new AbortController();

  const timeout = windowSafeTimeout(
    () => controller.abort(),
    request.timeoutMs ?? 30000
  );

  try {
    const messages: Array<{
      role: "system" | "user";
      content: string;
    }> = [];

    if (
      request.systemPrompt?.trim()
    ) {
      messages.push({
        role: "system",
        content:
          request.systemPrompt.trim(),
      });
    }

    messages.push({
      role: "user",
      content: prompt,
    });

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

function windowSafeTimeout(
  callback: () => void,
  delay: number
): ReturnType<typeof setTimeout> {
  return setTimeout(
    callback,
    Math.max(1000, delay)
  );
}