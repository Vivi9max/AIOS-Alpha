import { getMemory } from "./store";

export interface MemoryProfile {
  name?: string;
  location?: string;
  goal?: string;
  project?: string;
  preference?: string;
}

const INVALID_NAMES = new Set([
  "谁",
  "什么",
  "哪位",
  "哪个",
  "本人",
]);

function cleanValue(
  value: string
): string | undefined {
  const cleaned = value
    .trim()
    .replace(
      /^[：:\s]+|[。！？，,.!?]+$/g,
      ""
    );

  if (!cleaned) {
    return undefined;
  }

  return cleaned.slice(0, 200);
}

function isValidName(
  value: string
): boolean {
  const name = value.trim();

  if (!name || INVALID_NAMES.has(name)) {
    return false;
  }

  if (
    /^(谁|什么|哪位|哪个)$/i.test(name)
  ) {
    return false;
  }

  return name.length <= 40;
}

function extractName(
  text: string
): string | undefined {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const explicitMatch = line.match(
      /^(?:我叫|我的名字是)\s*([A-Za-z0-9_\-\u3040-\u30ff\u3400-\u9fff]+)[。！？，,.!?\s]*$/i
    );

    if (explicitMatch?.[1]) {
      const name = cleanValue(
        explicitMatch[1]
      );

      if (name && isValidName(name)) {
        return name;
      }
    }

    const identityMatch = line.match(
      /^我是\s*([A-Za-z0-9_\-\u3040-\u30ff\u3400-\u9fff]+)[。！？，,.!?\s]*$/i
    );

    if (identityMatch?.[1]) {
      const name = cleanValue(
        identityMatch[1]
      );

      if (name && isValidName(name)) {
        return name;
      }
    }
  }

  return undefined;
}

function extractValue(
  text: string,
  patterns: RegExp[]
): string | undefined {
  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match?.[1]) {
      return cleanValue(match[1]);
    }
  }

  return undefined;
}

export function buildMemoryProfile(): MemoryProfile {
  const profile: MemoryProfile = {};

  const userMemory = getMemory().filter(
    (item) => item.role === "user"
  );

  for (const item of userMemory) {
    const text = item.content.trim();

    const name = extractName(text);

    const location = extractValue(text, [
      /(?:^|\n)(?:我来自|我住在|我现在在|我目前在)\s*([^，。！？\n]+)/,
    ]);

    const goal = extractValue(text, [
      /(?:^|\n)(?:我的目标是|我的目标：|我希望能够|我想要)\s*([^。！？\n]+)/,
    ]);

    const project = extractValue(text, [
      /(?:^|\n)(?:我的项目是|我正在开发|我正在做|当前项目是)\s*([^。！？\n]+)/,
    ]);

    const preference = extractValue(text, [
      /(?:^|\n)(?:我喜欢|我偏好|我的偏好是)\s*([^。！？\n]+)/,
    ]);

    if (name) {
      profile.name = name;
    }

    if (location) {
      profile.location = location;
    }

    if (goal) {
      profile.goal = goal;
    }

    if (project) {
      profile.project = project;
    }

    if (preference) {
      profile.preference = preference;
    }
  }

  return profile;
}

export function buildMemoryProfileText(): string {
  const profile =
    buildMemoryProfile();

  return [
    profile.name
      ? `用户姓名：${profile.name}`
      : "",
    profile.location
      ? `所在地：${profile.location}`
      : "",
    profile.goal
      ? `长期目标：${profile.goal}`
      : "",
    profile.project
      ? `当前项目：${profile.project}`
      : "",
    profile.preference
      ? `用户偏好：${profile.preference}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");
}