import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

function getCurrentMessage(
  prompt: string
): string {
  const marker = "CURRENT_USER_MESSAGE:";
  const index = prompt.lastIndexOf(marker);

  if (index === -1) {
    return prompt.trim();
  }

  return prompt
    .slice(index + marker.length)
    .trim();
}

function findRememberedName(
  prompt: string
): string | null {
  const names: string[] = [];

  for (const rawLine of prompt.split("\n")) {
    const line = rawLine
      .replace(/^(user|assistant):\s*/i, "")
      .trim();

    const match = line.match(
      /^我叫\s*(?!什么|啥|谁)([A-Za-z0-9_\-\u4e00-\u9fff]+)[。！!，,\s]*$/
    );

    if (match?.[1]) {
      names.push(match[1]);
    }
  }

  return names.length > 0
    ? names[names.length - 1]
    : null;
}

function isNameQuestion(
  message: string
): boolean {
  const normalized = message
    .trim()
    .toLowerCase();

  return (
    normalized.includes("我叫什么") ||
    normalized.includes("我的名字") ||
    normalized.includes("你记得我叫什么") ||
    normalized.includes("what is my name")
  );
}

export const mockProvider: AIProviderAdapter = {
  enabled: true,

  async chat(
    prompt: string
  ): Promise<ChatResponse> {
    const currentMessage =
      getCurrentMessage(prompt);

    const rememberedName =
      findRememberedName(prompt);

    if (isNameQuestion(currentMessage)) {
      return {
        success: true,
        provider: "mock",
        content: rememberedName
          ? `你叫 ${rememberedName}。`
          : "我还不知道你的名字。",
      };
    }

    const currentName =
      findRememberedName(currentMessage);

    if (currentName) {
      return {
        success: true,
        provider: "mock",
        content: `记住了，你叫 ${currentName}。`,
      };
    }

    return {
      success: true,
      provider: "mock",
      content:
        `🤖 AIOS Mock Provider\n\n${currentMessage}`,
    };
  },
};