import "server-only";

import { chat } from "@/lib/ai";
import { listGitHubPath, readGitHubFile } from "@/lib/github/bridge";
import {
  blockAutonomousDevelopmentTask,
  claimAutonomousDevelopmentTask,
  completeAutonomousDevelopmentTask,
  createAutonomousDevelopmentTask,
  getAutonomousDevelopmentTask,
  updateAutonomousDevelopmentTask,
} from "@/lib/github/autonomous-development-control-plane";
import { dispatchGitHubTask } from "@/lib/github/task-dispatch";
import { createFounderDevelopmentContract } from "@/lib/github/founder-development-contract";
import {
  verifyVercelBuildForCommit,
  type VercelBuildVerificationResult,
} from "@/lib/github/autonomous-build-verification";

const REPOSITORY = "Vivi9max/AIOS-Alpha";
const BRANCH = "main";

const MAX_OBJECTIVE_LENGTH = 4000;
const MAX_DISCOVERY_ENTRIES = 200;

const MAX_CONTEXT_FILES = 4;
const MAX_SUPPORTING_CONTEXT_FILES = 1;
const MAX_CONTEXT_FILE_CHARS = 6000;
const MAX_TARGET_CONTEXT_FILE_CHARS = 60000;
const MAX_CONTEXT_CHARS = 68000;

const MAX_TARGET_FILES = 6;
const MAX_GENERATED_FILE_CHARS = 200000;

const MAX_GENERATION_ATTEMPTS = 2;
const MAX_PLAN_ATTEMPTS = 2;
const MAX_REPAIR_ROUNDS = 2;

const PLANNER_SYSTEM_PROMPT = [
  "AIOS Repository Development Planner",
  "",
  "你负责根据用户自然语言需求和真实仓库索引/源码上下文，决定需要修改哪些文件。",
  "不要要求用户提供 Target Path。Target Path 必须由你从真实仓库上下文中发现。",
  "只选择真实仓库中已经存在的文件。",
  "只选择 app/、components/、docs/、lib/、scripts/、tests/、test/、public/、styles/ 下的文件。",
  "不得选择 package.json、lockfile、vercel.json、.env、.git、.github。",
  "优先选择现有文件。",
  "最多选择 6 个文件。",
  "选择能够形成最小完整产品变更闭环的文件，不要为了覆盖范围而增加无关文件。",
  "",
  "必须返回 JSON。",
  "首选格式：",
  "{\"targetPaths\":[\"app/example/page.tsx\"]}",
  "",
  "也允许使用 target_paths、paths、files 或 targets 作为等价字段。",
  "files 或 targets 数组中的对象可以使用 path 字段。",
  "不要返回不存在于 REPOSITORY DISCOVERY INDEX 中的路径。",
  "只输出 AIOS_PLAN_BEGIN / AIOS_PLAN_END JSON。",
].join("\n");

const FILE_SYSTEM_PROMPT = [
  "AIOS Autonomous Single File Development Agent",
  "",
  "你现在只负责生成一个指定的 exact repository file。",
  "必须输出完整文件，从第一行到最后一行。",
  "不要输出 diff。",
  "不要输出解释。",
  "不要输出 Markdown 说明文字。",
  "不要输出 TODO。",
  "不要输出 placeholder。",
  "不要使用省略号代替代码。",
  "不要省略任何未修改的现有代码。",
  "保持现有架构、类型、接口和 import 路径兼容。",
  "不得修改 package.json、lockfile、vercel.json、.env、.git 或 .github。",
  "",
  "最优先：直接返回完整源码，不要代码围栏，不要解释。",
  "如果使用代码块，只允许一个完整源码代码块。",
  "如果使用 AIOS_FILE_BEGIN 格式，也必须包含完整 CONTENT_BEGIN / CONTENT_END。",
].join("\n");

const REPAIR_SYSTEM_PROMPT = [
  "AIOS Autonomous Build Repair Agent",
  "",
  "根据真实 Vercel Build Error 修复当前指定源码文件。",
  "必须输出完整文件，从第一行到最后一行。",
  "不要输出 diff。",
  "不要输出解释。",
  "不要输出 TODO。",
  "不要输出 placeholder。",
  "不要使用省略号代替代码。",
  "不要省略任何未修改的现有代码。",
  "保持现有架构、类型、接口和 Founder 安全边界。",
  "不得修改 package.json、lockfile、vercel.json、.env、.git 或 .github。",
  "",
  "最优先：直接返回完整源码，不要代码围栏，不要解释。",
  "如果使用代码块，只允许一个完整源码代码块。",
  "如果使用 AIOS_FILE_BEGIN 格式，也必须包含完整 CONTENT_BEGIN / CONTENT_END。",
].join("\n");

async function runBrain(
  prompt: string,
  systemPrompt: string,
) {
  return chat(prompt, {
    systemPrompt,
    historyLimit: 0,
  });
}

function normalizePath(value: string) {
  return value
    .trim()
    .replace(/^\/+/, "")
    .replace(/\\+/g, "/");
}

function isSafePath(path: string) {
  const normalized = normalizePath(path);

  if (
    !normalized ||
    normalized.includes("..") ||
    normalized.includes("\0")
  ) {
    return false;
  }

  if (
    normalized.startsWith(".git/") ||
    normalized.startsWith(".env") ||
    normalized.startsWith(".github/")
  ) {
    return false;
  }

  if (
    [
      "package.json",
      "package-lock.json",
      "pnpm-lock.yaml",
      "yarn.lock",
      "vercel.json",
    ].includes(normalized)
  ) {
    return false;
  }

  return [
    "app",
    "components",
    "docs",
    "lib",
    "scripts",
    "tests",
    "test",
    "public",
    "styles",
  ].some(
    (root) =>
      normalized === root ||
      normalized.startsWith(`${root}/`),
  );
}

function objectiveTokens(objective: string) {
  return Array.from(
    new Set(
      objective
        .toLowerCase()
        .replace(
          /[^a-z0-9\u4e00-\u9fff/_-]+/gi,
          " ",
        )
        .split(/\s+/)
        .filter(
          (token) => token.length >= 2,
        ),
    ),
  );
}

function scorePath(
  path: string,
  tokens: string[],
) {
  const lower = path.toLowerCase();

  let score = 0;

  for (const token of tokens) {
    if (lower.includes(token)) {
      score += 5;
    }
  }

  if (/page\.(tsx|ts)$/.test(lower)) {
    score += 2;
  }

  if (/route\.(tsx|ts)$/.test(lower)) {
    score += 2;
  }

  if (/layout\.(tsx|ts)$/.test(lower)) {
    score += 1;
  }

  return score;
}

async function discoverRepositoryPaths(
  objective: string,
) {
  const roots = [
    "app",
    "components",
    "docs",
    "lib",
    "scripts",
    "tests",
    "test",
    "public",
    "styles",
  ];

  const queue = roots.map(
    (path) => ({
      path,
      depth: 0,
    }),
  );

  const discovered =
    new Set<string>();

  while (
    queue.length &&
    discovered.size <
      MAX_DISCOVERY_ENTRIES
  ) {
    const current =
      queue.shift();

    if (!current) {
      break;
    }

    const result =
      await listGitHubPath({
        repo: REPOSITORY,
        path: current.path,
        ref: BRANCH,
      });

    if (
      !result.success ||
      !result.data
    ) {
      continue;
    }

    for (
      const entry of result.data
    ) {
      const path =
        normalizePath(
          entry.path,
        );

      if (!isSafePath(path)) {
        continue;
      }

      if (
        entry.type === "dir"
      ) {
        if (
          current.depth < 3
        ) {
          queue.push({
            path,
            depth:
              current.depth + 1,
          });
        }
      } else if (
        entry.type === "file"
      ) {
        discovered.add(path);
      }

      if (
        discovered.size >=
        MAX_DISCOVERY_ENTRIES
      ) {
        break;
      }
    }
  }

  const tokens =
    objectiveTokens(
      objective,
    );

  return Array.from(
    discovered,
  ).sort(
    (a, b) =>
      scorePath(
        b,
        tokens,
      ) -
        scorePath(
          a,
          tokens,
        ) ||
      a.localeCompare(b),
  );
}

async function readContext(
  paths: string[],
  targetPaths: string[] = [],
  options?: {
    maxFiles?: number;
    maxSupportingFiles?: number;
  },
) {
  const targetSet =
    new Set(
      targetPaths.map(
        normalizePath,
      ),
    );

  const ordered = [
    ...paths.filter(
      (path) =>
        targetSet.has(
          normalizePath(path),
        ),
    ),
    ...paths.filter(
      (path) =>
        !targetSet.has(
          normalizePath(path),
        ),
    ),
  ];

  const maxFiles =
    options?.maxFiles ??
    MAX_CONTEXT_FILES;

  const maxSupportingFiles =
    options?.maxSupportingFiles ??
    MAX_SUPPORTING_CONTEXT_FILES;

  const context: Array<{
    path: string;
    content: string;
    sha?: string;
  }> = [];

  let total = 0;
  let supportingCount = 0;

  for (
    const path of ordered
  ) {
    const isTarget =
      targetSet.has(
        normalizePath(path),
      );

    if (
      !isTarget &&
      supportingCount >=
        maxSupportingFiles
    ) {
      continue;
    }

    if (
      context.length >=
      maxFiles
    ) {
      break;
    }

    const result =
      await readGitHubFile({
        repo: REPOSITORY,
        path,
        ref: BRANCH,
      });

    if (
      !result.success ||
      !result.data
    ) {
      continue;
    }

    const limit =
      isTarget
        ? MAX_TARGET_CONTEXT_FILE_CHARS
        : MAX_CONTEXT_FILE_CHARS;

    const content =
      result.data.content.slice(
        0,
        limit,
      );

    if (
      total + content.length >
      MAX_CONTEXT_CHARS
    ) {
      if (isTarget) {
        const remaining =
          MAX_CONTEXT_CHARS -
          total;

        if (
          remaining <= 0
        ) {
          break;
        }

        context.push({
          path,
          content:
            content.slice(
              0,
              remaining,
            ),
          sha:
            result.data.sha,
        });

        break;
      }

      continue;
    }

    context.push({
      path,
      content,
      sha:
        result.data.sha,
    });

    total +=
      content.length;

    if (!isTarget) {
      supportingCount += 1;
    }
  }

  return context;
}

function parsePlannerJson(
  raw: string,
): unknown {
  const trimmed =
    raw.trim();

  const withoutFence =
    trimmed
      .replace(
        /^```(?:json)?\s*/i,
        "",
      )
      .replace(
        /\s*```$/i,
        "",
      )
      .trim();

  try {
    return JSON.parse(
      withoutFence,
    );
  } catch {
    const objectStart =
      withoutFence.indexOf("{");
    const objectEnd =
      withoutFence.lastIndexOf("}");

    if (
      objectStart >= 0 &&
      objectEnd > objectStart
    ) {
      return JSON.parse(
        withoutFence.slice(
          objectStart,
          objectEnd + 1,
        ),
      );
    }

    throw new Error(
      "AIOS_REPOSITORY_PLAN_JSON_INVALID",
    );
  }
}

function collectPlanCandidates(
  value: unknown,
): unknown[] {
  if (
    Array.isArray(value)
  ) {
    return value;
  }

  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return [];
  }

  const record =
    value as Record<
      string,
      unknown
    >;

  const keys = [
    "targetPaths",
    "target_paths",
    "paths",
    "files",
    "targets",
    "targetFiles",
    "target_files",
  ];

  for (
    const key of keys
  ) {
    const candidate =
      record[key];

    if (
      Array.isArray(
        candidate,
      )
    ) {
      return candidate;
    }
  }

  for (
    const key of [
      "plan",
      "result",
      "data",
      "selection",
    ]
  ) {
    const nested =
      record[key];

    const candidates =
      collectPlanCandidates(
        nested,
      );

    if (
      candidates.length
    ) {
      return candidates;
    }
  }

  return [];
}

function candidateToPath(
  value: unknown,
) {
  if (
    typeof value ===
    "string"
  ) {
    return normalizePath(
      value,
    );
  }

  if (
    value &&
    typeof value ===
      "object"
  ) {
    const record =
      value as Record<
        string,
        unknown
      >;

    for (
      const key of [
        "path",
        "targetPath",
        "target_path",
        "file",
        "filename",
      ]
    ) {
      if (
        typeof record[key] ===
        "string"
      ) {
        return normalizePath(
          record[key] as string,
        );
      }
    }
  }

  return "";
}

function extractPlan(
  content: string,
  discoveredPaths: string[],
) {
  const match =
    content.match(
      /AIOS_PLAN_BEGIN\s*\r?\n([\s\S]*?)\r?\nAIOS_PLAN_END/i,
    );

  if (!match) {
    throw new Error(
      "AIOS_REPOSITORY_PLAN_FORMAT_INVALID",
    );
  }

  let parsed: unknown;

  try {
    parsed =
      parsePlannerJson(
        match[1] ?? "",
      );
  } catch {
    throw new Error(
      "AIOS_REPOSITORY_PLAN_JSON_INVALID",
    );
  }

  const discoveredSet =
    new Set(
      discoveredPaths.map(
        normalizePath,
      ),
    );

  const rawCandidates =
    collectPlanCandidates(
      parsed,
    );

  const paths =
    rawCandidates
      .map(candidateToPath)
      .filter(Boolean)
      .filter(isSafePath)
      .filter(
        (path) =>
          discoveredSet.has(
            path,
          ),
      );

  const unique =
    Array.from(
      new Set(paths),
    );

  if (
    unique.length
  ) {
    return unique.slice(
      0,
      MAX_TARGET_FILES,
    );
  }

  throw new Error(
    "AIOS_REPOSITORY_PLAN_TARGETS_INVALID",
  );
}

function plannerPrompt(
  objective: string,
  paths: string[],
  context: Array<{
    path: string;
    content: string;
  }>,
) {
  return [
    "AUTONOMOUS DEVELOPMENT REQUEST",
    `Repository: ${REPOSITORY}`,
    `Branch: ${BRANCH}`,
    "",
    "USER REQUIREMENT:",
    objective,
    "",
    "REPOSITORY DISCOVERY INDEX:",
    paths.join("\n"),
    "",
    "RELEVANT SOURCE CONTEXT:",
    ...context.flatMap(
      (file) => [
        `FILE: ${file.path}`,
        "CONTENT_BEGIN",
        file.content,
        "CONTENT_END",
        "",
      ],
    ),
    "Choose the smallest coherent set of existing files required by the requirement.",
    "Every selected path MUST appear exactly in the REPOSITORY DISCOVERY INDEX.",
    "Use the exact repository path spelling.",
    "Return only AIOS_PLAN_BEGIN / AIOS_PLAN_END with valid JSON.",
    "Preferred JSON:",
    "{\"targetPaths\":[\"exact/repository/path.tsx\"]}",
  ].join("\n");
}

function filePrompt(
  objective: string,
  targetPath: string,
  targetPaths: string[],
  context: Array<{
    path: string;
    content: string;
  }>,
) {
  const targetContext =
    context.find(
      (file) =>
        normalizePath(
          file.path,
        ) ===
        normalizePath(
          targetPath,
        ),
    );

  const supportingContext =
    context.filter(
      (file) =>
        normalizePath(
          file.path,
        ) !==
        normalizePath(
          targetPath,
        ),
    );

  return [
    "AUTONOMOUS DEVELOPMENT REQUEST",
    `Repository: ${REPOSITORY}`,
    `Branch: ${BRANCH}`,
    "",
    "USER REQUIREMENT:",
    objective,
    "",
    `CURRENT FILE TO GENERATE: ${targetPath}`,
    "",
    "THE CURRENT TARGET FILE IS THE PRIMARY SOURCE OF TRUTH.",
    "Read it completely before generating the replacement.",
    "Preserve existing functionality unless the user requirement explicitly changes it.",
    "",
    ...(targetContext
      ? [
          `TARGET FILE: ${targetContext.path}`,
          "TARGET_CONTENT_BEGIN",
          targetContext.content,
          "TARGET_CONTENT_END",
          "",
        ]
      : []),
    ...(supportingContext.length
      ? [
          "LIMITED SUPPORTING CONTEXT:",
          ...supportingContext.flatMap(
            (file) => [
              `FILE: ${file.path}`,
              "CONTENT_BEGIN",
              file.content,
              "CONTENT_END",
              "",
            ],
          ),
        ]
      : []),
    "FULL TARGET FILE SET:",
    targetPaths.join("\n"),
    "",
    "Generate the complete file from the first line to the final line.",
    "Do not shorten the file.",
    "Do not omit unchanged code.",
    "Do not invent imports.",
    "Do not use placeholders.",
    "Do not use TODO as a substitute for implementation.",
    "Do not use ... to represent omitted code.",
    "Return only the complete source file.",
    "Preferred output: raw source without Markdown fences.",
    "A single closed Markdown code block is also acceptable.",
    "Do not include an explanation before or after the source.",
  ].join("\n");
}

function repairPrompt(
  objective: string,
  targetPath: string,
  targetPaths: string[],
  context: Array<{
    path: string;
    content: string;
  }>,
  verification: VercelBuildVerificationResult,
  round: number,
) {
  const targetContext =
    context.find(
      (file) =>
        normalizePath(
          file.path,
        ) ===
        normalizePath(
          targetPath,
        ),
    );

  const supportingContext =
    context.filter(
      (file) =>
        normalizePath(
          file.path,
        ) !==
        normalizePath(
          targetPath,
        ),
    );

  return [
    "AUTONOMOUS BUILD REPAIR REQUEST",
    `Repair round: ${round}`,
    `Repository: ${REPOSITORY}`,
    `Branch: ${BRANCH}`,
    "",
    "USER REQUIREMENT:",
    objective,
    "",
    `CURRENT REPAIR FILE: ${targetPath}`,
    "",
    "VERCEL STATUS:",
    verification.readyState ||
      verification.status,
    "VERCEL ERROR CODE:",
    verification.errorCode ||
      "unknown",
    "VERCEL ERROR MESSAGE:",
    verification.errorMessage ||
      "",
    "VERCEL BUILD LOGS:",
    verification.buildLogs ||
      "No build logs returned.",
    "",
    "CURRENT REPAIR FILE:",
    ...(targetContext
      ? [
          "CONTENT_BEGIN",
          targetContext.content,
          "CONTENT_END",
          "",
        ]
      : []),
    ...(supportingContext.length
      ? [
          "LIMITED SUPPORTING CONTEXT:",
          ...supportingContext.flatMap(
            (file) => [
              `FILE: ${file.path}`,
              "CONTENT_BEGIN",
              file.content,
              "CONTENT_END",
              "",
            ],
          ),
        ]
      : []),
    "TARGET FILES:",
    targetPaths.join("\n"),
    "",
    "Repair only the current repair file.",
    "Return the entire file from the first line to the final line.",
    "Do not return a diff.",
    "Do not return an explanation.",
    "Do not use TODO.",
    "Do not use placeholders.",
    "Do not use ... to represent omitted code.",
    "Preferred output: raw source without Markdown fences.",
    "A single closed Markdown code block is also acceptable.",
  ].join("\n");
}

function removeLeadingExplanation(
  content: string,
  expectedPath: string,
) {
  let value =
    content.trim();

  const escapedPath =
    expectedPath.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

  const pathHeading =
    new RegExp(
      `^(?:FILE|PATH)\\s*:\\s*${escapedPath}\\s*\\r?\\n`,
      "i",
    );

  value =
    value.replace(
      pathHeading,
      "",
    );

  value =
    value.replace(
      /^(?:Here(?:'s| is)|Below is|Here you go)[^:\n]*(?:complete|full|updated|source)?[^:\n]*:\s*\r?\n/i,
      "",
    );

  value =
    value.replace(
      /^Complete (?:file|source)(?:\s+content)?[:\s]*\r?\n/i,
      "",
    );

  value =
    value.replace(
      /^Full (?:file|source)(?:\s+content)?[:\s]*\r?\n/i,
      "",
    );

  return value.trim();
}

function hasBalancedDelimiters(
  content: string,
) {
  const stack: string[] = [];

  let quote:
    | "'"
    | '"'
    | "`"
    | null = null;

  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (
    let index = 0;
    index < content.length;
    index += 1
  ) {
    const current =
      content[index];
    const next =
      content[index + 1];

    if (lineComment) {
      if (current === "\n") {
        lineComment = false;
      }
      continue;
    }

    if (blockComment) {
      if (
        current === "*" &&
        next === "/"
      ) {
        blockComment = false;
        index += 1;
      }
      continue;
    }

    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }

      if (
        current === "\\"
      ) {
        escaped = true;
        continue;
      }

      if (
        current === quote
      ) {
        quote = null;
      }

      continue;
    }

    if (
      current === "/" &&
      next === "/"
    ) {
      lineComment = true;
      index += 1;
      continue;
    }

    if (
      current === "/" &&
      next === "*"
    ) {
      blockComment = true;
      index += 1;
      continue;
    }

    if (
      current === "'" ||
      current === '"' ||
      current === "`"
    ) {
      quote =
        current as
          | "'"
          | '"'
          | "`";
      continue;
    }

    if (
      current === "{" ||
      current === "(" ||
      current === "["
    ) {
      stack.push(
        current,
      );
      continue;
    }

    if (
      current === "}" ||
      current === ")" ||
      current === "]"
    ) {
      const expected =
        current === "}"
          ? "{"
          : current === ")"
            ? "("
            : "[";

      if (
        stack[
          stack.length - 1
        ] !== expected
      ) {
        return false;
      }

      stack.pop();
    }
  }

  return (
    !quote &&
    !blockComment &&
    stack.length === 0
  );
}

function looksLikeSourceFile(
  content: string,
  expectedPath: string,
) {
  const value =
    content.trim();

  if (
    !value ||
    value.length < 40
  ) {
    return false;
  }

  if (
    value.length >
    MAX_GENERATED_FILE_CHARS
  ) {
    return false;
  }

  if (
    /(?:^|\n)\s*(?:\.\.\.|…)\s*(?:$|\n)/.test(
      value,
    )
  ) {
    return false;
  }

  if (
    /\b(?:truncated|truncation|omitted for brevity|rest of file omitted)\b/i.test(
      value,
    )
  ) {
    return false;
  }

  if (
    /(?:\/\/|\/\*|\*)\s*(?:TODO|FIXME|TRUNCATED|OMITTED)/i.test(
      value,
    )
  ) {
    return false;
  }

  if (
    !hasBalancedDelimiters(
      value,
    )
  ) {
    return false;
  }

  const lowerPath =
    expectedPath.toLowerCase();

  if (
    lowerPath.endsWith(
      ".tsx",
    ) ||
    lowerPath.endsWith(
      ".jsx",
    )
  ) {
    return (
      /(?:import\s+|export\s+|const\s+|function\s+|interface\s+|type\s+|return\s*\(|return\s+|<)/.test(
        value,
      )
    );
  }

  if (
    /\.(ts|js|mjs|cjs)$/i.test(
      lowerPath,
    )
  ) {
    return /(?:import\s+|export\s+|const\s+|function\s+|class\s+|type\s+|interface\s+)/.test(
      value,
    );
  }

  return true;
}

function extractStrictFile(
  content: string,
  expectedPath: string,
) {
  const match =
    content.match(
      /AIOS_FILE_BEGIN\s*\r?\nPATH:\s*([^\r\n]+)\r?\nCONTENT_BEGIN\r?\n([\s\S]*?)\r?\nCONTENT_END\r?\nAIOS_FILE_END/i,
    );

  if (!match) {
    return null;
  }

  const path =
    normalizePath(
      match[1] ?? "",
    );

  if (
    path !==
      normalizePath(
        expectedPath,
      ) ||
    !isSafePath(path)
  ) {
    throw new Error(
      `AIOS_GENERATED_PATH_REJECTED: ${path}`,
    );
  }

  const fileContent =
    match[2] ?? "";

  if (
    !looksLikeSourceFile(
      fileContent,
      expectedPath,
    )
  ) {
    throw new Error(
      `AIOS_GENERATED_CONTENT_INCOMPLETE: ${path}`,
    );
  }

  return {
    path,
    content:
      fileContent.trim(),
  };
}

function extractAnyCodeFence(
  content: string,
) {
  const closedFence =
    /```(?:tsx|typescript|ts|jsx|javascript|js|mjs|cjs)?[ \t]*\r?\n([\s\S]*?)\r?\n```/gi;

  const candidates: string[] =
    [];

  let match: RegExpExecArray | null =
    null;

  while (
    (match =
      closedFence.exec(
        content,
      )) !== null
  ) {
    const candidate =
      (
        match[1] ?? ""
      ).trim();

    if (candidate) {
      candidates.push(
        candidate,
      );
    }
  }

  if (
    candidates.length
  ) {
    return (
      candidates.find(
        (candidate) =>
          /(?:import\s+|export\s+|const\s+|function\s+|interface\s+|type\s+|return\s+|<)/.test(
            candidate,
          ),
      ) ||
      candidates[0]
    );
  }

  const openFence =
    content.match(
      /```(?:tsx|typescript|ts|jsx|javascript|js|mjs|cjs)?[ \t]*\r?\n/i,
    );

  if (
    openFence &&
    openFence.index !==
      undefined
  ) {
    const start =
      openFence.index +
      openFence[0].length;

    const remainder =
      content
        .slice(start)
        .trim();

    if (
      remainder
    ) {
      return remainder;
    }
  }

  return null;
}

function extractRawSource(
  content: string,
  expectedPath: string,
) {
  let value =
    removeLeadingExplanation(
      content,
      expectedPath,
    );

  const lines =
    value.split(/\r?\n/);

  const sourceStart =
    lines.findIndex(
      (line) => {
        const trimmed =
          line.trim();

        return (
          /^["']use client["'];?$/.test(
            trimmed,
          ) ||
          /^import\s/.test(
            trimmed,
          ) ||
          /^export\s/.test(
            trimmed,
          ) ||
          /^const\s/.test(
            trimmed,
          ) ||
          /^type\s/.test(
            trimmed,
          ) ||
          /^interface\s/.test(
            trimmed,
          ) ||
          /^function\s/.test(
            trimmed,
          ) ||
          /^class\s/.test(
            trimmed,
          ) ||
          /^\/\*/.test(
            trimmed,
          ) ||
          /^\/\//.test(
            trimmed,
          )
        );
      },
    );

  if (
    sourceStart > 0
  ) {
    const prefix =
      lines
        .slice(
          0,
          sourceStart,
        )
        .join("\n")
        .trim();

    if (
      !prefix ||
      /^(?:Here|Below|Complete|Full|Updated|Source|Code)/i.test(
        prefix,
      )
    ) {
      value =
        lines
          .slice(
            sourceStart,
          )
          .join("\n")
          .trim();
    }
  }

  return value;
}

function extractFile(
  content: string,
  expectedPath: string,
) {
  const strict =
    extractStrictFile(
      content,
      expectedPath,
    );

  if (strict) {
    return strict;
  }

  const fenced =
    extractAnyCodeFence(
      content,
    );

  if (fenced) {
    const candidate =
      removeLeadingExplanation(
        fenced,
        expectedPath,
      );

    if (
      looksLikeSourceFile(
        candidate,
        expectedPath,
      )
    ) {
      return {
        path:
          normalizePath(
            expectedPath,
          ),
        content:
          candidate,
      };
    }
  }

  let raw =
    extractRawSource(
      content,
      expectedPath,
    );

  if (
    raw.startsWith(
      "AIOS_FILE_BEGIN",
    )
  ) {
    throw new Error(
      "AIOS_GENERATED_FILES_INCOMPLETE",
    );
  }

  raw =
    raw.replace(
      /^```(?:tsx|typescript|ts|jsx|javascript|js|mjs|cjs)?\s*/i,
      "",
    );

  raw =
    raw.replace(
      /\s*```\s*$/i,
      "",
    );

  raw =
    removeLeadingExplanation(
      raw,
      expectedPath,
    );

  if (
    !looksLikeSourceFile(
      raw,
      expectedPath,
    )
  ) {
    throw new Error(
      "AIOS_GENERATED_FILES_EMPTY",
    );
  }

  return {
    path:
      normalizePath(
        expectedPath,
      ),
    content:
      raw,
  };
}

async function generateFile(
  objective: string,
  targetPath: string,
  targetPaths: string[],
  context: Array<{
    path: string;
    content: string;
  }>,
) {
  let lastReason =
    "AIOS_GENERATED_FILES_EMPTY";

  for (
    let attempt = 1;
    attempt <=
    MAX_GENERATION_ATTEMPTS;
    attempt += 1
  ) {
    const prompt =
      attempt === 1
        ? filePrompt(
            objective,
            targetPath,
            targetPaths,
            context,
          )
        : [
            filePrompt(
              objective,
              targetPath,
              targetPaths,
              context,
            ),
            "",
            `Previous generation was rejected with: ${lastReason}`,
            "Return the entire complete source file again.",
            "Return raw source only.",
            "Do not return a marker fragment.",
            "Do not return a partial file.",
            "Do not explain the correction.",
          ].join("\n");

    const generation =
      await runBrain(
        prompt,
        FILE_SYSTEM_PROMPT,
      );

    if (
      !generation.success
    ) {
      lastReason =
        generation.error ||
        "AI generation failed.";
      continue;
    }

    try {
      return extractFile(
        generation.content,
        targetPath,
      );
    } catch (error) {
      lastReason =
        error instanceof Error
          ? error.message
          : "Generated file could not be parsed.";
    }
  }

  throw new Error(
    `AIOS_GENERATED_FILE_FAILED: ${targetPath}: ${lastReason}`,
  );
}

async function writeFile(
  objective: string,
  targetPaths: string[],
  file: {
    path: string;
    content: string;
  },
  commitMessage: string,
) {
  const contract =
    createFounderDevelopmentContract({
      objective,
      requestedFiles:
        targetPaths,
      actions: [
        "read",
        "write",
        "verify",
      ],
      verification: [
        "readback",
        "build",
        "production",
      ],
      commitMessage,
    });

  const result =
    await dispatchGitHubTask({
      action: "write",
      repo: REPOSITORY,
      branch: BRANCH,
      path: file.path,
      content: file.content,
      commitMessage,
      contract,
    });

  if (!result.success) {
    throw new Error(
      result.error ||
        result.code ||
        `GitHub write failed: ${file.path}`,
    );
  }

  return {
    path: file.path,
    commitSha:
      result.write
        ?.commitSha || "",
    readbackVerified:
      result.write
        ?.readbackVerified ===
      true,
  };
}

function selectRepairTarget(
  targetPaths: string[],
  verification:
    VercelBuildVerificationResult,
) {
  const logs = [
    verification.errorMessage ||
      "",
    verification.buildLogs ||
      "",
  ]
    .join("\n")
    .toLowerCase();

  const matched =
    targetPaths.find(
      (path) =>
        logs.includes(
          path.toLowerCase(),
        ),
    );

  if (matched) {
    return matched;
  }

  const buildPathMatch =
    logs.match(
      /(?:\.\/)?((?:app|components|lib|docs|scripts|tests|test|public|styles)\/[a-zA-Z0-9_./-]+\.(?:ts|tsx|js|jsx|mjs|cjs|css))/,
    );

  if (
    buildPathMatch
  ) {
    const normalized =
      normalizePath(
        buildPathMatch[1],
      );

    const exact =
      targetPaths.find(
        (path) =>
          path ===
          normalized,
      );

    if (exact) {
      return exact;
    }
  }

  return targetPaths[0] || null;
}

export interface AutonomousDevelopmentAgentResult {
  success: boolean;
  code: string;
  taskId?: string;
  repository: string;
  branch: string;
  objective: string;
  discoveredPaths: string[];
  targetPaths: string[];
  changedPaths: string[];
  commitShas: string[];
  readbackVerified: boolean;
  verificationPassed: boolean;
  buildVerification:
    | "NOT_EXECUTED"
    | "PASS"
    | "FAIL"
    | "NOT_CONFIGURED"
    | "TIMEOUT";
  buildVerificationResult?: VercelBuildVerificationResult;
  repairRounds: number;
  reason?: string;
}

export async function executeAutonomousDevelopmentAgent(
  input: {
    objective: string;
    taskId?: string;
  },
): Promise<AutonomousDevelopmentAgentResult> {
  const objective =
    input.objective
      .trim()
      .slice(
        0,
        MAX_OBJECTIVE_LENGTH,
      );

  const changedPaths: string[] =
    [];

  const commitShas: string[] =
    [];

  let taskId =
    input.taskId || "";

  let discoveredPaths: string[] =
    [];

  let targetPaths: string[] =
    [];

  let readbackVerified = true;

  let verification:
    | VercelBuildVerificationResult
    | undefined;

  let repairRounds = 0;

  const resultBase = () => ({
    repository: REPOSITORY,
    branch: BRANCH,
    objective,
    discoveredPaths,
    targetPaths,
    changedPaths,
    commitShas,
    readbackVerified,
    verificationPassed: false,
    buildVerification:
      (verification?.status ||
        "NOT_EXECUTED") as
        | "NOT_EXECUTED"
        | "PASS"
        | "FAIL"
        | "NOT_CONFIGURED"
        | "TIMEOUT",
    buildVerificationResult:
      verification,
    repairRounds,
  });

  try {
    if (!objective) {
      throw new Error(
        "Development objective is required.",
      );
    }

    let task =
      taskId
        ? getAutonomousDevelopmentTask(
            taskId,
          )
        : null;

    if (
      taskId &&
      !task
    ) {
      throw new Error(
        "Autonomous development task was not found.",
      );
    }

    if (!task) {
      task =
        createAutonomousDevelopmentTask({
          objective,
          targetPaths: [],
        });

      taskId = task.id;
    }

    if (
      task.status ===
      "todo"
    ) {
      claimAutonomousDevelopmentTask(
        taskId,
      );
    }

    updateAutonomousDevelopmentTask(
      taskId,
      {
        phase:
          "DISCOVERING",
        reason:
          undefined,
      },
    );

    discoveredPaths =
      await discoverRepositoryPaths(
        objective,
      );

    if (
      discoveredPaths.length ===
      0
    ) {
      throw new Error(
        "AIOS_REPOSITORY_DISCOVERY_EMPTY",
      );
    }

    updateAutonomousDevelopmentTask(
      taskId,
      {
        phase:
          "READING",
      },
    );

    const discoveryContext =
      await readContext(
        discoveredPaths,
        [],
        {
          maxFiles:
            MAX_CONTEXT_FILES,
          maxSupportingFiles:
            MAX_SUPPORTING_CONTEXT_FILES,
        },
      );

    updateAutonomousDevelopmentTask(
      taskId,
      {
        phase:
          "PLANNING",
      },
    );

    let planError =
      "AIOS_REPOSITORY_PLAN_TARGETS_INVALID";

    for (
      let planAttempt = 1;
      planAttempt <=
      MAX_PLAN_ATTEMPTS;
      planAttempt += 1
    ) {
      const plan =
        await runBrain(
          [
            plannerPrompt(
              objective,
              discoveredPaths,
              discoveryContext,
            ),
            "",
            planAttempt > 1
              ? `Previous planner result was rejected with: ${planError}. Regenerate using exact paths from the discovery index.`
              : "",
          ]
            .filter(Boolean)
            .join("\n"),
          PLANNER_SYSTEM_PROMPT,
        );

      if (
        !plan.success
      ) {
        planError =
          plan.error ||
          "Repository planning failed.";
        continue;
      }

      try {
        targetPaths =
          extractPlan(
            plan.content,
            discoveredPaths,
          );
        break;
      } catch (error) {
        planError =
          error instanceof Error
            ? error.message
            : "Repository plan target validation failed.";
        targetPaths = [];
      }
    }

    if (
      targetPaths.length ===
      0
    ) {
      throw new Error(
        planError,
      );
    }

    if (
      targetPaths.length >
      MAX_TARGET_FILES
    ) {
      targetPaths =
        targetPaths.slice(
          0,
          MAX_TARGET_FILES,
        );
    }

    updateAutonomousDevelopmentTask(
      taskId,
      {
        targetPaths,
        phase:
          "READING",
        reason:
          `AIOS selected ${targetPaths.length} verified repository target file(s).`,
      },
    );

    updateAutonomousDevelopmentTask(
      taskId,
      {
        phase:
          "GENERATING",
        reason:
          `Generating ${targetPaths.length} target file(s) with target-first context.`,
      },
    );

    for (
      const targetPath of targetPaths
    ) {
      const targetContext =
        await readContext(
          [targetPath],
          [targetPath],
          {
            maxFiles: 1,
            maxSupportingFiles: 0,
          },
        );

      if (
        targetContext.length ===
        0
      ) {
        throw new Error(
          `AIOS_TARGET_CONTEXT_EMPTY: ${targetPath}`,
        );
      }

      const generationContext =
        targetContext;

      const file =
        await generateFile(
          objective,
          targetPath,
          targetPaths,
          generationContext,
        );

      updateAutonomousDevelopmentTask(
        taskId,
        {
          phase:
            "WRITING",
          reason:
            `Writing ${targetPath}`,
        },
      );

      const written =
        await writeFile(
          objective,
          targetPaths,
          file,
          "fix(C167.26): harden autonomous generation parsing",
        );

      changedPaths.push(
        written.path,
      );

      if (
        written.commitSha
      ) {
        commitShas.push(
          written.commitSha,
        );
      }

      readbackVerified =
        readbackVerified &&
        written.readbackVerified;

      updateAutonomousDevelopmentTask(
        taskId,
        {
          phase:
            "READBACK",
          commitSha:
            written.commitSha ||
            undefined,
          changedPaths,
          reason:
            written.readbackVerified
              ? `Readback verified: ${targetPath}`
              : `Readback failed: ${targetPath}`,
        },
      );

      if (
        !written.readbackVerified
      ) {
        throw new Error(
          `AUTONOMOUS_READBACK_FAILED: ${targetPath}`,
        );
      }
    }

    if (
      !commitShas.length
    ) {
      throw new Error(
        "AUTONOMOUS_COMMIT_SHA_MISSING",
      );
    }

    let latestCommitSha =
      commitShas[
        commitShas.length - 1
      ];

    updateAutonomousDevelopmentTask(
      taskId,
      {
        phase:
          "BUILD",
        changedPaths,
        commitSha:
          latestCommitSha,
        reason:
          "Running Vercel production build verification.",
      },
    );

    verification =
      await verifyVercelBuildForCommit({
        commitSha:
          latestCommitSha,
      });

    while (
      verification.status ===
        "FAIL" &&
      repairRounds <
        MAX_REPAIR_ROUNDS
    ) {
      repairRounds += 1;

      const repairTarget =
        selectRepairTarget(
          targetPaths,
          verification,
        );

      if (
        !repairTarget
      ) {
        break;
      }

      const repairReason =
        verification.errorMessage ||
        verification.errorCode ||
        "Vercel build failed.";

      updateAutonomousDevelopmentTask(
        taskId,
        {
          phase:
            "REPAIR",
          reason:
            `Repair round ${repairRounds}: ${repairTarget}. ${repairReason}`,
        },
      );

      const targetContext =
        await readContext(
          [repairTarget],
          [repairTarget],
          {
            maxFiles: 1,
            maxSupportingFiles: 0,
          },
        );

      const repairContext =
        targetContext;

      const generation =
        await runBrain(
          repairPrompt(
            objective,
            repairTarget,
            targetPaths,
            repairContext,
            verification,
            repairRounds,
          ),
          REPAIR_SYSTEM_PROMPT,
        );

      if (
        !generation.success
      ) {
        throw new Error(
          generation.error ||
            `Repair generation failed: ${repairTarget}`,
        );
      }

      const file =
        extractFile(
          generation.content,
          repairTarget,
        );

      const written =
        await writeFile(
          `${objective}\nVercel repair round ${repairRounds}.`,
          targetPaths,
          file,
          `fix(C167.26): autonomous build repair ${repairRounds}`,
        );

      changedPaths.push(
        written.path,
      );

      if (
        written.commitSha
      ) {
        commitShas.push(
          written.commitSha,
        );
        latestCommitSha =
          written.commitSha;
      }

      readbackVerified =
        readbackVerified &&
        written.readbackVerified;

      updateAutonomousDevelopmentTask(
        taskId,
        {
          phase:
            "READBACK",
          commitSha:
            written.commitSha,
          changedPaths,
          reason:
            written.readbackVerified
              ? `Repair readback verified: ${repairTarget}`
              : `Repair readback failed: ${repairTarget}`,
        },
      );

      if (
        !written.commitSha ||
        !written.readbackVerified
      ) {
        throw new Error(
          `AUTONOMOUS_REPAIR_READBACK_FAILED: ${repairTarget}`,
        );
      }

      updateAutonomousDevelopmentTask(
        taskId,
        {
          phase:
            "BUILD",
          commitSha:
            latestCommitSha,
          changedPaths,
          reason:
            `Verifying repair round ${repairRounds}.`,
        },
      );

      verification =
        await verifyVercelBuildForCommit({
          commitSha:
            latestCommitSha,
        });
    }

    const buildPassed =
      verification?.status ===
      "PASS";

    const verificationPassed =
      readbackVerified &&
      buildPassed;

    const reason =
      verificationPassed
        ? "Commit, GitHub readback and Vercel production build verification completed."
        : verification?.errorMessage ||
          verification?.errorCode ||
          "Final verification failed.";

    updateAutonomousDevelopmentTask(
      taskId,
      {
        phase:
          verificationPassed
            ? "COMPLETED"
            : "BLOCKED",
        reason,
        changedPaths,
        commitSha:
          latestCommitSha,
      },
    );

    completeAutonomousDevelopmentTask(
      taskId,
      {
        commitSha:
          latestCommitSha,
        readbackVerified,
        verificationPassed,
        reason,
      },
    );

    return {
      success:
        verificationPassed,
      code:
        verificationPassed
          ? "AUTONOMOUS_DEVELOPMENT_COMPLETED"
          : "AUTONOMOUS_DEVELOPMENT_BUILD_FAILED",
      taskId,
      ...resultBase(),
      verificationPassed,
      reason,
    };
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : "Autonomous development execution failed.";

    if (taskId) {
      try {
        blockAutonomousDevelopmentTask(
          taskId,
          reason,
        );
      } catch {
        // Preserve the original execution failure.
      }
    }

    return {
      success: false,
      code:
        "AUTONOMOUS_DEVELOPMENT_BLOCKED",
      taskId:
        taskId || undefined,
      ...resultBase(),
      reason,
    };
  }
}
