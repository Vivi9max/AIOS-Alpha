import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

function findName(prompt: string) {
  const matches = [
    ...prompt.matchAll(
      /我叫\s*([^\s，。！？\n]+)/g
    ),
  ];

  return matches.length > 0
    ? matches[matches.length - 1][1]
    : null;
}

export const mockProvider: AIProviderAdapter = {
  enabled: true,

  async chat(
    prompt: string
  ): Promise<ChatResponse> {
    const name = findName(prompt);

    const asksName =
      prompt.includes("我叫什么") ||
      prompt.includes("我的名字") ||
      prompt
        .toLowerCase()
        .includes("what is my name");

    if (asksName) {
      return {
        success: true,
        provider: "mock",
        content: name
          ? `你叫 ${name}。`
          : "我还不知道你的名字。",
      };
    }

    if (name) {
      return {
        success: true,
        provider: "mock",
        content: `记住了，你叫 ${name}。`,
      };
    }

    return {
      success: true,
      provider: "mock",
      content: `🤖 AIOS Mock Provider\n\n${prompt}`,
    };
  },
};