import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

function extractCurrentMessage(
  prompt: string
): string {
  const marker =
    "CURRENT_USER_MESSAGE:";

  const index =
    prompt.lastIndexOf(marker);

  if (index === -1) {
    return prompt.trim();
  }

  return prompt
    .slice(index + marker.length)
    .trim();
}

function extractRememberedName(
  prompt: string
): string | null {
  const patterns = [
    /我叫\s*([A-Za-z\u4e00-\u9fa5]+)/i,
    /我是\s*([A-Za-z\u4e00-\u9fa5]+)/i,
    /你叫\s*([A-Za-z\u4e00-\u9fa5]+)/i,
  ];

  for (const pattern of patterns) {
    const match = prompt.match(pattern);

    if (match?.[1]) {
      return match[1]
        .replace(/[。,.，！!？?]/g, "")
        .trim();
    }
  }

  return null;
}

function createMockReply(
  prompt: string
): string {
  const message =
    extractCurrentMessage(prompt);

  const rememberedName =
    extractRememberedName(prompt);

  if (
    /我叫什[么麼]|我是谁|你记得我吗/i.test(
      message
    )
  ) {
    if (rememberedName) {
      return `你叫 ${rememberedName}。`;
    }

    return "我还不知道你的名字。";
  }

  const nameMatch =
    message.match(
      /(?:我叫|我是)\s*([A-Za-z\u4e00-\u9fa5]+)/
    );

  if (nameMatch?.[1]) {
    const name = nameMatch[1]
      .replace(/[。,.，！!？?]/g, "")
      .trim();

    return `记住了，你叫 ${name}。`;
  }

  if (/你好|hello|hi/i.test(message)) {
    return "你好，我是 AIOS Alpha。";
  }

  return [
    "🤖 AIOS Mock Provider",
    "",
    `已收到：${message}`,
  ].join("\n");
}

export const mockProvider: AIProviderAdapter = {
  enabled: true,

  async chat(
    prompt: string
  ): Promise<ChatResponse> {
    return {
      success: true,
      provider: "mock",
      content:
        createMockReply(prompt),
    };
  },
};

export default mockProvider;