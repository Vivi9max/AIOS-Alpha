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
  const matches = [
    ...prompt.matchAll(
      /我叫\s*([A-Za-z0-9_\-\u4e00-\u9fff]+)/g
    ),
  ];

  if (matches.length === 0) {
    return null;
  }

  return matches[matches.length - 1][1];
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

    const asksName =
      currentMessage.includes("我叫什么") ||
      currentMessage.includes("我的名字") ||
      currentMessage
        .toLowerCase()
        .includes("what is my name");

    if (asksName) {
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