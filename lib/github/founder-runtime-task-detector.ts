import "server-only";

export type FounderRuntimeGitHubIntent =
  | "read"
  | "write"
  | null;

export interface FounderRuntimeTaskDetection {
  isGitHubTask: boolean;
  action: FounderRuntimeGitHubIntent;
  path?: string;
  confidence: "high" | "none";
}

const PATH_PATTERN =
  /(?:^|\s)((?:app|components|docs|lib|scripts|tests|test|public|styles)\/[A-Za-z0-9._/@-]+\.[A-Za-z0-9_-]+)/;

const READ_PATTERNS = [
  // English
  /\bread\b/i,
  /\bread\s+(?:the\s+)?(?:github\s+)?(?:file|repository|repo)\b/i,
  /\binspect\b/i,
  /\banaly[sz]e\b/i,
  /\bcheck\s+(?:the\s+)?repository\b/i,

  // Chinese
  /读取/,
  /读(?:取)?/,
  /查看/,
  /查阅/,
  /检查/,
  /检视/,
  /分析/,
  /审查/,
  /查看仓库/,
  /读取仓库/,
  /读取文件/,
  /查看文件/,
  /检查文件/,
];

const WRITE_PATTERNS = [
  // English
  /\bwrite\b/i,
  /\bmodify\b/i,
  /\bupdate\b/i,
  /\bedit\b/i,
  /\bfix\b/i,
  /\bcreate\b/i,
  /\bimplement\b/i,
  /\bchange\b/i,

  // Chinese
  /写入/,
  /修改/,
  /更新/,
  /编辑/,
  /修复/,
  /创建/,
  /实现/,
  /更改/,
  /改动/,
  /覆盖/,
];

function extractPath(
  input: string,
): string | undefined {
  const match =
    input.match(
      PATH_PATTERN,
    );

  return match?.[1];
}

export function detectFounderRuntimeGitHubTask(
  input: string,
): FounderRuntimeTaskDetection {
  const text =
    input.trim();

  if (!text) {
    return {
      isGitHubTask: false,
      action: null,
      confidence: "none",
    };
  }

  const hasGitHubContext =
    /\bgithub\b/i.test(text) ||
    /github/i.test(text) ||
    /\brepository\b/i.test(text) ||
    /\brepo\b/i.test(text) ||
    /仓库/.test(text) ||
    /代码库/.test(text) ||
    /源码/.test(text);

  if (!hasGitHubContext) {
    return {
      isGitHubTask: false,
      action: null,
      confidence: "none",
    };
  }

  const path =
    extractPath(text);

  if (!path) {
    return {
      isGitHubTask: false,
      action: null,
      confidence: "none",
    };
  }

  const wantsWrite =
    WRITE_PATTERNS.some(
      (pattern) =>
        pattern.test(text),
    );

  const wantsRead =
    READ_PATTERNS.some(
      (pattern) =>
        pattern.test(text),
    );

  /*
   * WRITE always wins when both intents are present.
   *
   * This prevents a request such as:
   * "读取文件并修改它"
   * from accidentally being treated as READ only.
   */
  if (
    wantsWrite
  ) {
    return {
      isGitHubTask: true,
      action: "write",
      path,
      confidence: "high",
    };
  }

  if (
    wantsRead
  ) {
    return {
      isGitHubTask: true,
      action: "read",
      path,
      confidence: "high",
    };
  }

  return {
    isGitHubTask: false,
    action: null,
    confidence: "none",
  };
}
