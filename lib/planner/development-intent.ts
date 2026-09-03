import "server-only";

export interface PlannerDevelopmentIntent {
  isDevelopment: boolean;
  targetPaths: string[];
  objective: string;
  reason?: string;
}

const MAX_TARGET_PATHS = 8;
const MAX_TARGET_PATH_LENGTH = 240;
const MAX_OBJECTIVE_LENGTH = 1000;

const DEVELOPMENT_KEYWORDS = [
  "开发",
  "实现",
  "修改代码",
  "修改文件",
  "修复代码",
  "修复文件",
  "编程",
  "代码",
  "源码",
  "接口",
  "api",
  "route",
  "组件",
  "页面",
  "typescript",
  "javascript",
  "tsx",
  "jsx",
  "写入github",
  "github",
  "implement",
  "development",
  "develop",
  "code",
  "coding",
  "fix",
  "build",
];

function cleanText(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function normalizePath(value: string): string {
  return value
    .trim()
    .replace(/^["'`]+/, "")
    .replace(/["'`.,;，。；]+$/, "")
    .replace(/^\/+/, "");
}

function isSafeTargetPath(path: string): boolean {
  if (!path) {
    return false;
  }

  if (path.length > MAX_TARGET_PATH_LENGTH) {
    return false;
  }

  if (
    path.startsWith("/") ||
    path.includes("..") ||
    path.includes("\0") ||
    path === ".git" ||
    path.startsWith(".git/") ||
    path === ".env" ||
    path.startsWith(".env.")
  ) {
    return false;
  }

  return true;
}

function extractExplicitPaths(text: string): string[] {
  const patterns = [
    /(?:Target\s*Path|TargetPath|File|文件|路径)\s*[:：=]\s*([^\s\n\r,，；;]+)/gi,

    /(?:修改|修复|开发|实现|更新|创建|新增|重构|删除)\s+((?:app|lib|components|docs|public|src|scripts|config|types|hooks|utils|services|features)\/[^\s\n\r,，；;]+)/gi,

    /\b((?:app|lib|components|docs|public|src|scripts|config|types|hooks|utils|services|features)\/[A-Za-z0-9_./@-]+\.(?:ts|tsx|js|jsx|mjs|cjs|json|md|css|scss|yaml|yml))\b/gi,
  ];

  const paths: string[] = [];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const candidate = normalizePath(
        match[1] ?? "",
      );

      if (
        candidate &&
        isSafeTargetPath(candidate)
      ) {
        paths.push(candidate);
      }
    }
  }

  return Array.from(new Set(paths)).slice(
    0,
    MAX_TARGET_PATHS,
  );
}

function looksLikeDevelopmentGoal(
  text: string,
): boolean {
  const normalized = text.toLowerCase();

  return DEVELOPMENT_KEYWORDS.some(
    (keyword) =>
      normalized.includes(
        keyword.toLowerCase(),
      ),
  );
}

export function buildPlannerDevelopmentIntent(
  input: {
    goal: string;
    step: string;
  },
): PlannerDevelopmentIntent {
  const goal = cleanText(input.goal);
  const step = cleanText(input.step);

  const combined = [
    goal,
    step,
  ]
    .filter(Boolean)
    .join("\n");

  if (!looksLikeDevelopmentGoal(combined)) {
    return {
      isDevelopment: false,
      targetPaths: [],
      objective: "",
      reason:
        "Planner task does not appear to be a development task.",
    };
  }

  const targetPaths =
    extractExplicitPaths(combined);

  if (!targetPaths.length) {
    return {
      isDevelopment: false,
      targetPaths: [],
      objective: "",
      reason:
        "Development intent detected, but no explicit safe target path was declared.",
    };
  }

  const objective = [
    "Autonomous Development",
    `Goal: ${goal}`,
    `Development Step: ${step}`,
    `Target Paths: ${targetPaths.join(", ")}`,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, MAX_OBJECTIVE_LENGTH);

  return {
    isDevelopment: true,
    targetPaths,
    objective,
  };
}

export function buildDevelopmentMetadata(
  intent: PlannerDevelopmentIntent,
): string {
  if (
    !intent.isDevelopment ||
    !intent.targetPaths.length
  ) {
    return "";
  }

  return [
    "Development Intent: autonomous",
    `Target Path: ${intent.targetPaths.join(", ")}`,
    "Autonomous Development Eligibility: enabled",
  ].join("\n");
}
