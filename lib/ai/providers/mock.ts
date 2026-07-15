import type {
  AIProviderAdapter,
  ChatResponse,
} from "../types";

import { buildMemoryProfile } from "@/lib/memory/index";

const INVALID_NAMES = new Set([
  "谁",
  "什么",
  "哪位",
  "哪个",
]);

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

function cleanValue(
  value: string
): string {
  return value
    .trim()
    .replace(
      /^[：:\s]+|[。！？，,.!?]+$/g,
      ""
    );
}

function extractName(
  message: string
): string | undefined {
  const lines = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const match = line.match(
      /^(?:我叫|我的名字是|我是)\s*([A-Za-z0-9_\-\u3040-\u30ff\u3400-\u9fff]+)[。！？，,.!?\s]*$/i
    );

    if (!match?.[1]) {
      continue;
    }

    const name = cleanValue(
      match[1]
    );

    if (
      name &&
      !INVALID_NAMES.has(name)
    ) {
      return name;
    }
  }

  return undefined;
}

function extractLocation(
  message: string
): string | undefined {
  const match = message.match(
    /(?:^|\n)(?:我来自|我住在|我现在在|我目前在)\s*([^，。！？\n]+)/
  );

  return match?.[1]
    ? cleanValue(match[1])
    : undefined;
}

function extractProject(
  message: string
): string | undefined {
  const match = message.match(
    /(?:^|\n)(?:我的项目是|我正在开发|我正在做|当前项目是)\s*([^，。！？\n]+)/
  );

  return match?.[1]
    ? cleanValue(match[1])
    : undefined;
}

function extractGoal(
  message: string
): string | undefined {
  const match = message.match(
    /(?:^|\n)(?:我的目标是|我希望能够|我想要)\s*([^，。！？\n]+)/
  );

  return match?.[1]
    ? cleanValue(match[1])
    : undefined;
}

function buildIntroduction(): string {
  const profile =
    buildMemoryProfile();

  const details = [
    profile.name
      ? `你叫 ${profile.name}`
      : "",
    profile.location
      ? `你来自或目前位于 ${profile.location}`
      : "",
    profile.project
      ? `你当前的项目是 ${profile.project}`
      : "",
    profile.goal
      ? `你的目标是 ${profile.goal}`
      : "",
    profile.preference
      ? `你的偏好是 ${profile.preference}`
      : "",
  ].filter(Boolean);

  if (details.length === 0) {
    return [
      "我目前还没有足够的信息介绍你。",
      "你可以告诉我你的名字、所在地、项目或目标。",
    ].join("\n");
  }

  return [
    profile.name
      ? `你好，${profile.name}。`
      : "你好。",
    "",
    "根据目前保存的记忆：",
    "",
    ...details.map(
      (detail) => `• ${detail}`
    ),
  ].join("\n");
}

function createMockReply(
  prompt: string
): string {
  const message =
    extractCurrentMessage(prompt);

  if (!message) {
    return "请输入内容。";
  }

  const profile =
    buildMemoryProfile();

  if (
    /介绍一下我|介绍我|总结一下我/i.test(
      message
    )
  ) {
    return buildIntroduction();
  }

  if (
    /我叫什[么麼]|我的名字是什么|我是谁/i.test(
      message
    )
  ) {
    return profile.name
      ? `你叫 ${profile.name}。`
      : "我还不知道你的名字。";
  }

  const name = extractName(message);
  const location =
    extractLocation(message);
  const project =
    extractProject(message);
  const goal = extractGoal(message);

  const remembered: string[] = [];

  if (name) {
    remembered.push(
      `你的名字是 ${name}`
    );
  }

  if (location) {
    remembered.push(
      `你来自或目前位于 ${location}`
    );
  }

  if (project) {
    remembered.push(
      `你当前的项目是 ${project}`
    );
  }

  if (goal) {
    remembered.push(
      `你的目标是 ${goal}`
    );
  }

  if (remembered.length > 0) {
    return [
      "记住了：",
      "",
      ...remembered.map(
        (item) => `• ${item}`
      ),
    ].join("\n");
  }

  if (
    /我来自哪里|我住在哪里|我在哪里/i.test(
      message
    )
  ) {
    return profile.location
      ? `你来自或目前位于 ${profile.location}。`
      : "我还不知道你的所在地。";
  }

  if (
    /我的项目是什么|我在做什么项目|当前项目是什么/i.test(
      message
    )
  ) {
    return profile.project
      ? `你当前的项目是 ${profile.project}。`
      : "我还不知道你当前的项目。";
  }

  if (
    /我的目标是什么|你记得我的目标吗/i.test(
      message
    )
  ) {
    return profile.goal
      ? `你的目标是 ${profile.goal}。`
      : "我还不知道你的目标。";
  }

  if (
    /你记得我吗|你了解我吗/i.test(
      message
    )
  ) {
    const hasProfile =
      profile.name ||
      profile.location ||
      profile.project ||
      profile.goal ||
      profile.preference;

    return hasProfile
      ? "记得。我已经保存了部分与你有关的信息。"
      : "我目前还没有保存足够的个人信息。";
  }

  if (/你好|hello|hi/i.test(message)) {
    return profile.name
      ? `你好，${profile.name}。我是 AIOS Alpha。`
      : "你好，我是 AIOS Alpha。";
  }

  return [
    "🤖 AIOS Mock Provider",
    "",
    `已收到：${message}`,
    "",
    "当前仍在使用 Mock 模型。",
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