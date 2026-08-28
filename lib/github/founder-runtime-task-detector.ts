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
  /\bread\b/i,
  /\bread\s+(?:the\s+)?(?:github\s+)?(?:file|repository|repo)\b/i,
  /\binspect\b/i,
  /\banaly[sz]e\b/i,
  /\bcheck\s+(?:the\s+)?repository\b/i,
];

const WRITE_PATTERNS = [
  /\bwrite\b/i,
  /\bmodify\b/i,
  /\bupdate\b/i,
  /\bedit\b/i,
  /\bfix\b/i,
  /\bcreate\b/i,
  /\bimplement\b/i,
  /\bchange\b/i,
];

function extractPath(input: string): string | undefined {
  const match = input.match(PATH_PATTERN);
  return match?.[1];
}

export function detectFounderRuntimeGitHubTask(
  input: string,
): FounderRuntimeTaskDetection {
  const text = input.trim();

  if (!text) {
    return {
      isGitHubTask: false,
      action: null,
      confidence: "none",
    };
  }

  const hasGitHubContext =
    /\bgithub\b/i.test(text) ||
    /\brepository\b/i.test(text) ||
    /\brepo\b/i.test(text);

  if (!hasGitHubContext) {
    return {
      isGitHubTask: false,
      action: null,
      confidence: "none",
    };
  }

  const path = extractPath(text);

  const wantsWrite =
    WRITE_PATTERNS.some((pattern) =>
      pattern.test(text),
    );

  const wantsRead =
    READ_PATTERNS.some((pattern) =>
      pattern.test(text),
    );

  if (wantsWrite && path) {
    return {
      isGitHubTask: true,
      action: "write",
      path,
      confidence: "high",
    };
  }

  if (wantsRead && path) {
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
