import { getMemory } from "./store";

export interface MemoryProfile {
  name?: string;
  location?: string;
  goal?: string;
  project?: string;
  preference?: string;
}

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

    const name = extractValue(text, [
      /(?:我叫|我的名字是)\s*([A-Za-z0-9_\-\u3040-\u30ff\u3400-\u9fff]+)/i,
    ]);

    const location = extractValue(text, [
      /(?:我来自|我住在|我现在在|我目前在)\s*([^，。！？\n]+)/,
    ]);

    const goal = extractValue(text, [
      /(?:我的目标是|我的目标：|我希望能够|我想要)\s*([^。！？\n]+)/,
    ]);

    const project = extractValue(text, [
      /(?:我的项目是|我正在开发|我正在做|当前项目是)\s*([^。！？\n]+)/,
    ]);

    const preference = extractValue(text, [
      /(?:我喜欢|我偏好|我的偏好是)\s*([^。！？\n]+)/,
    ]);

    // 后出现的信息覆盖旧信息，允许用户修正资料。
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
  const profile = buildMemoryProfile();

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