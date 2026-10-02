import "server-only";

import { chat } from "@/lib/ai";
import {
  listGitHubPath,
  readGitHubFile,
} from "@/lib/github/bridge";
import {
  blockAutonomousDevelopmentTask,
  claimAutonomousDevelopmentTask,
  completePersistentAutonomousDevelopmentTask,
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
import {
  buildAutonomousDevelopmentPrompt,
  extractExplicitRepositoryPaths,
} from "@/lib/github/autonomous-development-prompt";
import {
  runAutonomousDevelopmentSafetyGate,
} from "@/lib/github/autonomous-development-safety-gate";

const REPOSITORY = "Vivi9max/AIOS-Alpha";
const BRANCH = "main";

const MAX_OBJECTIVE_LENGTH = 4000;
const MAX_DISCOVERY_ENTRIES = 220;
const MAX_TARGET_FILES = 6;

const MAX_PLANNER_CONTEXT_CHARS = 24000;
const MAX_TARGET_CONTEXT_CHARS = 200000;

const MAX_PATCH_CHARS = 30000;
const MAX_PATCH_OPERATIONS = 8;

const MAX_PLAN_ATTEMPTS = 2;
const MAX_PATCH_ATTEMPTS = 3;
const MAX_REPAIR_ROUNDS = 2;

/*
 * Hard ceiling on the total number of autonomous GitHub writes that a
 * single development run may perform. This bounds the blast radius of
 * an autonomous execution even when discovery, planning, patching and
 * build repair are all combined, and it is intentionally independent
 * from the per-stage attempt limits above.
 */
const MAX_AUTONOMOUS_WRITES = 12;

/*
 * Discovery is intentionally bounded.
 *
 * The previous implementation performed repository traversal as a
 * fully serial queue. In a large repository this could require
 * hundreds of sequential GitHub API round trips before the Planner
 * was even called.
 *
 * Keep the traversal breadth-first and bounded while allowing a
 * small number of independent GitHub directory reads at the same
 * time.
 */
const DISCOVERY_CONCURRENCY = 6;
const MAX_DISCOVERY_DEPTH = 4;

const PLANNER_SYSTEM_PROMPT = [
  "AIOS Repository Development Planner",
  "",
  "根据用户需求和真实仓库索引选择需要修改的现有文件。",
  "只选择真实存在的文件。",
  "只允许 app/、components/、docs/、lib/、scripts/、tests/、test/、public/、styles/。",
  "不得选择 package.json、lockfile、vercel.json、.env、.git、.github。",
  "优先选择最小且完整的修改范围。",
  "最多选择 6 个文件。",
  "",
  "必须返回：",
  "AIOS_PLAN_BEGIN",
  "{\"targetPaths\":[\"exact/repository/path.tsx\"]}",
  "AIOS_PLAN_END",
  "",
  "targetPaths 必须使用真实仓库中的精确路径。",
].join("\n");

const PATCH_SYSTEM_PROMPT = [
  "AIOS Autonomous Development Patch Agent",
  "",
  "你不是完整文件生成器。",
  "你只负责针对现有真实源码生成精确 SEARCH/REPLACE patch。",
  "",
  "禁止返回完整文件。",
  "禁止返回 diff。",
  "禁止返回 Markdown code fence。",
  "禁止返回解释。",
  "禁止使用 TODO。",
  "禁止使用 placeholder。",
  "禁止使用省略号。",
  "",
  "SEARCH 必须来自当前真实文件并且完全匹配。",
  "SEARCH 必须足够独特，不能产生多个匹配。",
  "REPLACE 是最终希望写入的源码。",
  "如果只需要修改一个小区域，只返回一个 patch。",
  "最多返回 8 个 patch。",
  "每个 patch 必须严格使用：",
  "",
  "AIOS_PATCH_BEGIN",
  "PATH: app/example/page.tsx",
  "OPERATION: replace",
  "SEARCH_BEGIN",
  "exact existing source",
  "SEARCH_END",
  "REPLACE_BEGIN",
  "replacement source",
  "REPLACE_END",
  "AIOS_PATCH_END",
  "",
  "优先修改最小必要范围。",
  "保持现有 API、数据接口、类型和其他模块不变。",
].join("\n");

const REPAIR_SYSTEM_PROMPT = [
  "AIOS Autonomous Build Repair Patch Agent",
  "",
  "根据 Vercel Build Error 修复当前真实源码。",
  "只生成 SEARCH/REPLACE patch。",
  "不要生成完整文件。",
  "不要生成 diff。",
  "不要输出解释。",
  "SEARCH 必须精确来自当前真实源码。",
  "REPLACE 必须是完整可编译源码片段。",
  "最多 8 个 patch。",
  "",
  "格式：",
  "AIOS_PATCH_BEGIN",
  "PATH: exact/repository/path.tsx",
  "OPERATION: replace",
  "SEARCH_BEGIN",
  "exact existing source",
  "SEARCH_END",
  "REPLACE_BEGIN",
  "replacement source",
  "REPLACE_END",
  "AIOS_PATCH_END",
].join("\n");

type PatchOperation = {
  path: string;
  operation: "replace";
  search: string;
  replace: string;
};

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
  const normalized =
    normalizePath(path);

  if (
    !normalized ||
    normalized.includes("..") ||
    normalized.includes("\0") ||
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
    "app/",
    "components/",
    "docs/",
    "lib/",
    "scripts/",
    "tests/",
    "test/",
    "public/",
    "styles/",
  ].some((prefix) =>
    normalized.startsWith(prefix),
  );
}

function objectiveTokens(
  objective: string,
) {
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
          (token) =>
            token.length >= 2,
        ),
    ),
  );
}

function scorePath(
  path: string,
  tokens: string[],
) {
  const lower =
    path.toLowerCase();

  let score = 0;

  for (const token of tokens) {
    if (
      lower.includes(token)
    ) {
      score += 5;
    }
  }

  if (
    /page\.(tsx|ts)$/.test(
      lower,
    )
  ) {
    score += 2;
  }

  if (
    /route\.(tsx|ts)$/.test(
      lower,
    )
  ) {
    score += 2;
  }

  return score;
}

type DiscoveryNode = {
  path: string;
  depth: number;
};

type DiscoveryEntry = {
  type: string;
  name: string;
  path: string;
  sha: string;
  size: number;
  html_url?: string;
};

async function discoverPath(
  node: DiscoveryNode,
): Promise<{
  node: DiscoveryNode;
  entries: DiscoveryEntry[];
}> {
  const result =
    await listGitHubPath({
      repo: REPOSITORY,
      path: node.path,
      ref: BRANCH,
    });

  if (
    !result.success ||
    !result.data
  ) {
    return {
      node,
      entries: [],
    };
  }

  return {
    node,
    entries:
      result.data as DiscoveryEntry[],
  };
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

  const discovered =
    new Set<string>();

  let frontier: DiscoveryNode[] =
    roots.map((path) => ({
      path,
      depth: 0,
    }));

  /*
   * Breadth-first discovery keeps the repository index deterministic.
   * Each frontier is processed in bounded parallel batches rather than
   * issuing one GitHub request after another.
   */
  while (
    frontier.length > 0 &&
    discovered.size <
      MAX_DISCOVERY_ENTRIES
  ) {
    const nextFrontier:
      DiscoveryNode[] = [];

    for (
      let start = 0;
      start < frontier.length &&
      discovered.size <
        MAX_DISCOVERY_ENTRIES;
      start +=
        DISCOVERY_CONCURRENCY
    ) {
      const batch =
        frontier.slice(
          start,
          start +
            DISCOVERY_CONCURRENCY,
        );

      const results =
        await Promise.all(
          batch.map(
            discoverPath,
          ),
        );

      for (
        const result of results
      ) {
        for (
          const entry of result.entries
        ) {
          const path =
            normalizePath(
              entry.path,
            );

          if (
            !isSafePath(path)
          ) {
            continue;
          }

          if (
            entry.type ===
            "dir"
          ) {
            if (
              result.node.depth <
              MAX_DISCOVERY_DEPTH
            ) {
              nextFrontier.push({
                path,
                depth:
                  result.node.depth +
                  1,
              });
            }

            continue;
          }

          if (
            entry.type ===
            "file"
          ) {
            discovered.add(
              path,
            );
          }

          if (
            discovered.size >=
            MAX_DISCOVERY_ENTRIES
          ) {
            break;
          }
        }

        if (
          discovered.size >=
          MAX_DISCOVERY_ENTRIES
        ) {
          break;
        }
      }
    }

    /*
     * Remove duplicate directories before the next breadth level.
     * This prevents multiple parent listings from causing the same
     * directory to be queried more than once.
     */
    const uniqueNext =
      new Map<
        string,
        DiscoveryNode
      >();

    for (
      const node of nextFrontier
    ) {
      if (
        !uniqueNext.has(
          node.path,
        )
      ) {
        uniqueNext.set(
          node.path,
          node,
        );
      }
    }

    frontier =
      Array.from(
        uniqueNext.values(),
      );
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

async function readFile(
  path: string,
) {
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
    throw new Error(
      `AIOS_TARGET_READ_FAILED: ${path}: ${
        "error" in result
          ? result.error
          : "GitHub file read failed."
      }`,
    );
  }

  return result.data;
}

function buildPlannerPrompt(
  objective: string,
  discoveredPaths: string[],
  developmentPrompt: string,
) {
  const context =
    discoveredPaths.join(
      "\n",
    );

  return [
    developmentPrompt,
    "",
    "AUTONOMOUS DEVELOPMENT REQUEST",
    `Repository: ${REPOSITORY}`,
    `Branch: ${BRANCH}`,
    "",
    "USER OBJECTIVE:",
    objective,
    "",
    "REAL REPOSITORY FILE INDEX:",
    context.slice(
      0,
      MAX_PLANNER_CONTEXT_CHARS,
    ),
    "",
    "Select the smallest coherent set of existing files.",
    "Do not invent paths.",
    "Return only AIOS_PLAN_BEGIN / AIOS_PLAN_END.",
  ].join("\n");
}

function parsePlannerResult(
  content: string,
  discoveredPaths: string[],
) {
  const match =
    content.match(
      /AIOS_PLAN_BEGIN\s*([\s\S]*?)AIOS_PLAN_END/i,
    );

  if (!match) {
    throw new Error(
      "AIOS_REPOSITORY_PLAN_FORMAT_INVALID",
    );
  }

  let parsed:
    | Record<string, unknown>
    | null = null;

  const raw =
    (match[1] || "")
      .trim()
      .replace(
        /^```json\s*/i,
        "",
      )
      .replace(
        /\s*```$/i,
        "",
      )
      .trim();

  try {
    const candidate =
      JSON.parse(raw);

    if (
      candidate &&
      typeof candidate ===
        "object"
    ) {
      parsed =
        candidate as Record<
          string,
          unknown
        >;
    }
  } catch {
    const start =
      raw.indexOf("{");
    const end =
      raw.lastIndexOf("}");

    if (
      start >= 0 &&
      end > start
    ) {
      try {
        const candidate =
          JSON.parse(
            raw.slice(
              start,
              end + 1,
            ),
          );

        if (
          candidate &&
          typeof candidate ===
            "object"
        ) {
          parsed =
            candidate as Record<
              string,
              unknown
            >;
        }
      } catch {
        parsed = null;
      }
    }
  }

  if (!parsed) {
    throw new Error(
      "AIOS_REPOSITORY_PLAN_JSON_INVALID",
    );
  }

  const candidateValue =
    parsed.targetPaths ??
    parsed.target_paths ??
    parsed.paths ??
    parsed.files ??
    parsed.targets;

  const rawPaths =
    Array.isArray(
      candidateValue,
    )
      ? candidateValue
      : [];

  const discovered =
    new Set(
      discoveredPaths.map(
        normalizePath,
      ),
    );

  const targetPaths =
    rawPaths
      .map((value) => {
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
              typeof record[
                key
              ] === "string"
            ) {
              return normalizePath(
                record[
                  key
                ] as string,
              );
            }
          }
        }

        return "";
      })
      .filter(Boolean)
      .filter(isSafePath)
      .filter((path) =>
        discovered.has(path),
      );

  const unique =
    Array.from(
      new Set(
        targetPaths,
      ),
    ).slice(
      0,
      MAX_TARGET_FILES,
    );

  if (
    unique.length ===
    0
  ) {
    throw new Error(
      "AIOS_REPOSITORY_PLAN_TARGETS_INVALID",
    );
  }

  return unique;
}

function buildPatchPrompt(
  objective: string,
  targetPath: string,
  targetContent: string,
  developmentPrompt: string,
) {
  const boundedContent =
    targetContent.slice(
      0,
      MAX_TARGET_CONTEXT_CHARS,
    );

  return [
    developmentPrompt,
    "",
    "AUTONOMOUS DEVELOPMENT PATCH REQUEST",
    `Repository: ${REPOSITORY}`,
    `Branch: ${BRANCH}`,
    `Target: ${targetPath}`,
    "",
    "USER OBJECTIVE:",
    objective,
    "",
    "CURRENT REAL FILE:",
    "CURRENT_FILE_BEGIN",
    boundedContent,
    "CURRENT_FILE_END",
    "",
    "Generate only the minimal SEARCH/REPLACE patch required by the development prompt.",
    "Do not regenerate the entire file.",
    "SEARCH must be copied exactly from CURRENT REAL FILE.",
    "SEARCH must occur exactly once.",
    "Keep unrelated code unchanged.",
    "Preserve all existing API/data interfaces.",
    "Preserve all existing imports unless the patch genuinely requires a new import.",
    "If an import is required, include it through a separate small patch.",
    "Return only AIOS_PATCH_BEGIN / AIOS_PATCH_END.",
  ].join("\n");
}

function parsePatchBlocks(
  content: string,
  expectedPath: string,
) {
  if (
    content.length >
    MAX_PATCH_CHARS
  ) {
    throw new Error(
      "AIOS_PATCH_RESPONSE_TOO_LARGE",
    );
  }

  const blocks:
    PatchOperation[] = [];

  const pattern =
    /AIOS_PATCH_BEGIN\s*\r?\n([\s\S]*?)\r?\nAIOS_PATCH_END/gi;

  let match:
    | RegExpExecArray
    | null = null;

  while (
    (match =
      pattern.exec(
        content,
      )) !== null
  ) {
    const block =
      match[1] || "";

    const pathMatch =
      block.match(
        /PATH:\s*([^\r\n]+)/i,
      );

    const operationMatch =
      block.match(
        /OPERATION:\s*([^\r\n]+)/i,
      );

    const searchMatch =
      block.match(
        /SEARCH_BEGIN\s*\r?\n([\s\S]*?)\r?\nSEARCH_END/i,
      );

    const replaceMatch =
      block.match(
        /REPLACE_BEGIN\s*\r?\n([\s\S]*?)\r?\nREPLACE_END/i,
      );

    if (
      !pathMatch ||
      !operationMatch ||
      !searchMatch ||
      !replaceMatch
    ) {
      throw new Error(
        "AIOS_PATCH_FORMAT_INVALID",
      );
    }

    const path =
      normalizePath(
        pathMatch[1] || "",
      );

    const operation =
      (
        operationMatch[1] ||
        ""
      )
        .trim()
        .toLowerCase();

    const search =
      searchMatch[1] || "";

    const replace =
      replaceMatch[1] || "";

    if (
      path !==
      normalizePath(
        expectedPath,
      )
    ) {
      throw new Error(
        `AIOS_PATCH_PATH_REJECTED: ${path}`,
      );
    }

    if (
      !isSafePath(path)
    ) {
      throw new Error(
        `AIOS_PATCH_UNSAFE_PATH: ${path}`,
      );
    }

    if (
      operation !==
      "replace"
    ) {
      throw new Error(
        `AIOS_PATCH_OPERATION_REJECTED: ${operation}`,
      );
    }

    if (!search) {
      throw new Error(
        "AIOS_PATCH_SEARCH_EMPTY",
      );
    }

    if (
      search.length >
      MAX_PATCH_CHARS
    ) {
      throw new Error(
        "AIOS_PATCH_SEARCH_TOO_LARGE",
      );
    }

    blocks.push({
      path,
      operation: "replace",
      search,
      replace,
    });

    if (
      blocks.length >
      MAX_PATCH_OPERATIONS
    ) {
      throw new Error(
        "AIOS_PATCH_OPERATION_LIMIT_EXCEEDED",
      );
    }
  }

  if (
    blocks.length === 0
  ) {
    throw new Error(
      "AIOS_PATCH_EMPTY",
    );
  }

  return blocks;
}

function validatePatchSearches(
  original: string,
  operations: PatchOperation[],
) {
  for (
    const operation of operations
  ) {
    const firstIndex =
      original.indexOf(
        operation.search,
      );

    if (
      firstIndex < 0
    ) {
      throw new Error(
        `AIOS_PATCH_SEARCH_NOT_FOUND: ${operation.path}`,
      );
    }

    const secondIndex =
      original.indexOf(
        operation.search,
        firstIndex +
          operation.search
            .length,
      );

    if (
      secondIndex >= 0
    ) {
      throw new Error(
        `AIOS_PATCH_SEARCH_NOT_UNIQUE: ${operation.path}`,
      );
    }
  }
}

function applyPatchOperations(
  original: string,
  operations: PatchOperation[],
) {
  let content =
    original;

  for (
    const operation of operations
  ) {
    const firstIndex =
      content.indexOf(
        operation.search,
      );

    if (
      firstIndex < 0
    ) {
      throw new Error(
        `AIOS_PATCH_SEARCH_NOT_FOUND: ${operation.path}`,
      );
    }

    const secondIndex =
      content.indexOf(
        operation.search,
        firstIndex +
          operation.search
            .length,
      );

    if (
      secondIndex >= 0
    ) {
      throw new Error(
        `AIOS_PATCH_SEARCH_NOT_UNIQUE: ${operation.path}`,
      );
    }

    content =
      content.slice(
        0,
        firstIndex,
      ) +
      operation.replace +
      content.slice(
        firstIndex +
          operation.search
            .length,
      );
  }

  return content;
}

function validateFinalSource(
  path: string,
  content: string,
) {
  const normalized =
    content.replace(
      /\r\n/g,
      "\n",
    );

  if (
    !normalized.trim()
  ) {
    throw new Error(
      `AIOS_FINAL_SOURCE_EMPTY: ${path}`,
    );
  }

  if (
    normalized.length >
    200000
  ) {
    throw new Error(
      `AIOS_FINAL_SOURCE_TOO_LARGE: ${path}`,
    );
  }

  if (
    /(?:^|\n)\s*(?:\.\.\.|\u2026)\s*(?:$|\n)/.test(
      normalized,
    )
  ) {
    throw new Error(
      `AIOS_FINAL_SOURCE_CONTAINS_ELLIPSIS: ${path}`,
    );
  }

  const incompleteMarkerPattern =
    /(?:^|\n)\s*(?:TRUNCATED|OMITTED\s+FOR\s+BREVITY)\s*(?:$|\n)/i;

  if (
    incompleteMarkerPattern.test(
      normalized,
    )
  ) {
    throw new Error(
      `AIOS_FINAL_SOURCE_INCOMPLETE: ${path}`,
    );
  }

  const stack: string[] =
    [];

  let quote:
    | "'"
    | "\""
    | "`"
    | null = null;

  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (
    let index = 0;
    index < normalized.length;
    index += 1
  ) {
    const current =
      normalized[index];

    const next =
      normalized[index + 1];

    if (lineComment) {
      if (
        current === "\n"
      ) {
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
      current === "\"" ||
      current === "`"
    ) {
      quote =
        current as
          | "'"
          | "\""
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
        throw new Error(
          `AIOS_FINAL_SOURCE_DELIMITER_INVALID: ${path}`,
        );
      }

      stack.pop();
    }
  }

  if (
    quote ||
    blockComment ||
    stack.length > 0
  ) {
    throw new Error(
      `AIOS_FINAL_SOURCE_INCOMPLETE: ${path}`,
    );
  }

  return normalized;
}

async function generatePatch(
  objective: string,
  targetPath: string,
  currentContent: string,
  developmentPrompt: string,
  repairContext?: string,
) {
  let lastError =
    "AIOS_PATCH_EMPTY";

  for (
    let attempt = 1;
    attempt <=
    MAX_PATCH_ATTEMPTS;
    attempt += 1
  ) {
    const prompt =
      [
        buildPatchPrompt(
          objective,
          targetPath,
          currentContent,
          developmentPrompt,
        ),
        repairContext
          ? [
              "",
              "PREVIOUS PATCH FAILURE:",
              repairContext,
              "",
              "Regenerate a smaller exact patch.",
            ].join("\n")
          : "",
        attempt > 1
          ? [
              "",
              "PREVIOUS PATCH ATTEMPT ERROR:",
              lastError,
              "",
              "IMPORTANT:",
              "The previous patch was rejected.",
              "Fix the exact reported patch error.",
              "Do not output a complete file.",
              "Return only exact SEARCH/REPLACE operations.",
            ].join("\n")
          : "",
      ]
        .filter(Boolean)
        .join("\n");

    const response =
      await runBrain(
        prompt,
        repairContext
          ? REPAIR_SYSTEM_PROMPT
          : PATCH_SYSTEM_PROMPT,
      );

    if (
      !response.success
    ) {
      lastError =
        response.error ||
        "AIOS patch generation failed.";

      continue;
    }

    try {
      const operations =
        parsePatchBlocks(
          response.content,
          targetPath,
        );

      validatePatchSearches(
        currentContent,
        operations,
      );

      return operations;
    } catch (error) {
      lastError =
        error instanceof Error
          ? error.message
          : "AIOS patch validation failed.";
    }
  }

  throw new Error(
    `AIOS_PATCH_GENERATION_FAILED: Failed to generate a valid SEARCH/REPLACE patch for "${targetPath}" after ${MAX_PATCH_ATTEMPTS} attempt(s). Last error: ${lastError}`,
  );
}

function buildAutonomousCommitMessage(
  objective: string,
  repairRound?: number,
) {
  const normalized = objective
    .replace(
      /[^a-zA-Z0-9 _-]+/g,
      " ",
    )
    .trim()
    .replace(
      /\s+/g,
      " ",
    );

  const summary =
    normalized
      .slice(0, 72)
      .trim()
      .replace(
        /\s+/g,
        "-",
      )
      .toLowerCase();

  if (repairRound) {
    return `fix(C167.28.4): autonomous build repair ${repairRound}${summary ? ` ${summary}` : ""}`;
  }

  return `feat(C167.28.4): autonomous development${summary ? ` ${summary}` : ""}`;
}

async function loadSafetyGateRepositoryContext(
  targetPaths: string[],
  originalContents: Record<string, string>,
  patchedContents: Record<string, string>,
) {
  const i18nPath =
    "lib/i18n/index.ts";

  if (
    !targetPaths.includes(
      i18nPath,
    ) &&
    !patchedContents[
      i18nPath
    ]
  ) {
    const currentI18n =
      await readFile(
        i18nPath,
      );

    originalContents[
      i18nPath
    ] =
      currentI18n.content;

    patchedContents[
      i18nPath
    ] =
      currentI18n.content;
  }
}

function runSafetyGateOrThrow(
  objective: string,
  targetPaths: string[],
  originalContents: Record<string, string>,
  patchedContents: Record<string, string>,
) {
  const gate =
    runAutonomousDevelopmentSafetyGate(
      {
        objective,
        targetPaths,
        originalContents,
        patchedContents,
      },
    );

  if (!gate.passed) {
    throw new Error(
      `AUTONOMOUS_SAFETY_GATE_BLOCKED: ${gate.errors.join(" | ") || gate.reason}`,
    );
  }

  return gate;
}

async function writeFinalFile(
  objective: string,
  targetPaths: string[],
  path: string,
  content: string,
  commitMessage: string,
) {
  const contract =
    createFounderDevelopmentContract(
      {
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
      },
    );

  const result =
    await dispatchGitHubTask(
      {
        action: "write",
        repo: REPOSITORY,
        branch: BRANCH,
        path,
        content,
        commitMessage,
        contract,
      },
    );

  if (
    !result.success
  ) {
    throw new Error(
      result.error ||
        result.code ||
        `GitHub write failed: ${path}`,
    );
  }

  return {
    path,
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

  const exact =
    targetPaths.find(
      (path) =>
        logs.includes(
          path.toLowerCase(),
        ),
    );

  if (exact) {
    return exact;
  }

  const match =
    logs.match(
      /(?:\.\/)?((?:app|components|lib|docs|scripts|tests|test|public|styles)\/[a-zA-Z0-9_./-]+\.(?:ts|tsx|js|jsx|mjs|cjs|css))/,
    );

  if (match) {
    const path =
      normalizePath(
        match[1],
      );

    const selected =
      targetPaths.find(
        (candidate) =>
          candidate ===
          path,
      );

    if (selected) {
      return selected;
    }
  }

  return (
    targetPaths[0] ||
    null
  );
}

export interface AutonomousDevelopmentAgentResult {
  success: boolean;
  code: string;
  taskId?: string;
  repository: string;
  branch: string;
  objective: string;
  developmentPrompt: string;
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

  const enforceAutonomousWriteBudget =
    () => {
      if (
        changedPaths.length >=
        MAX_AUTONOMOUS_WRITES
      ) {
        throw new Error(
          `AUTONOMOUS_WRITE_BUDGET_EXCEEDED: ${changedPaths.length} of ${MAX_AUTONOMOUS_WRITES} allowed autonomous writes were used before completion.`,
        );
      }
    };

  let taskId =
    input.taskId || "";

  let developmentPrompt =
    "";

  let discoveredPaths: string[] =
    [];

  let targetPaths: string[] =
    [];

  let readbackVerified =
    true;

  let verification:
    | VercelBuildVerificationResult
    | undefined;

  let repairRounds = 0;

  const resultBase = () => ({
    repository: REPOSITORY,
    branch: BRANCH,
    objective,
    developmentPrompt,
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
        createAutonomousDevelopmentTask(
          {
            objective,
            targetPaths: [],
          },
        );

      taskId =
        task.id;
    }

    if (
      task.status ===
      "todo"
    ) {
      claimAutonomousDevelopmentTask(
        taskId,
      );
    }

    const explicitTargets =
      extractExplicitRepositoryPaths(
        objective,
      )
        .filter(isSafePath)
        .slice(
          0,
          MAX_TARGET_FILES,
        );

    const hasExplicitTargets =
      explicitTargets.length >
      0;

    developmentPrompt =
      buildAutonomousDevelopmentPrompt(
        {
          objective,
          targetPaths:
            explicitTargets,
          mode:
            hasExplicitTargets
              ? "EXPLICIT_TARGET_PATCH"
              : "PLANNED_PATCH",
        },
      );

    updateAutonomousDevelopmentTask(
      taskId,
      {
        targetPaths:
          explicitTargets,
        reason:
          hasExplicitTargets
            ? `AIOS generated its Development Prompt and resolved ${explicitTargets.length} explicit target file(s).`
            : "AIOS generated its Development Prompt and will resolve targets from the real repository.",
      },
    );

    if (
      hasExplicitTargets
    ) {
      targetPaths =
        explicitTargets;

      updateAutonomousDevelopmentTask(
        taskId,
        {
          targetPaths,
          phase:
            "READING",
          reason:
            `AIOS skipped recursive discovery and planner because the objective explicitly identified ${targetPaths.length} repository target file(s).`,
        },
      );
    } else {
      updateAutonomousDevelopmentTask(
        taskId,
        {
          phase:
            "DISCOVERING",
          reason:
            "AIOS is discovering real repository paths because the objective did not provide an explicit target path.",
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
            "PLANNING",
          reason:
            "AIOS is selecting the smallest valid repository target set from its generated Development Prompt.",
        },
      );

      let plannerError =
        "AIOS_REPOSITORY_PLAN_TARGETS_INVALID";

      for (
        let attempt = 1;
        attempt <=
        MAX_PLAN_ATTEMPTS;
        attempt += 1
      ) {
        const response =
          await runBrain(
            [
              buildPlannerPrompt(
                objective,
                discoveredPaths,
                developmentPrompt,
              ),
              attempt > 1
                ? [
                    "",
                    `Previous planning attempt failed: ${plannerError}`,
                    "Return exact existing repository paths only.",
                  ].join("\n")
                : "",
            ]
              .filter(Boolean)
              .join("\n"),
            PLANNER_SYSTEM_PROMPT,
          );

        if (
          !response.success
        ) {
          plannerError =
            response.error ||
            "AIOS planner failed.";

          continue;
        }

        try {
          targetPaths =
            parsePlannerResult(
              response.content,
              discoveredPaths,
            );

          break;
        } catch (error) {
          plannerError =
            error instanceof Error
              ? error.message
              : "AIOS planner target validation failed.";

          targetPaths = [];
        }
      }

      if (
        targetPaths.length ===
        0
      ) {
        throw new Error(
          plannerError,
        );
      }
    }

    if (
      targetPaths.length ===
      0
    ) {
      throw new Error(
        "AIOS_TARGET_RESOLUTION_EMPTY",
      );
    }

    updateAutonomousDevelopmentTask(
      taskId,
      {
        targetPaths,
        phase:
          "READING",
        reason:
          `AIOS selected ${targetPaths.length} verified target file(s).`,
      },
    );

    const originalContents:
      Record<string, string> =
      {};

    const patchedContents:
      Record<string, string> =
      {};

    for (
      const targetPath of targetPaths
    ) {
      updateAutonomousDevelopmentTask(
        taskId,
        {
          phase:
            "READING",
          reason:
            `Reading the complete current file: ${targetPath}`,
        },
      );

      const current =
        await readFile(
          targetPath,
        );

      const currentContent =
        current.content;

      if (
        !currentContent.trim()
      ) {
        throw new Error(
          `AIOS_TARGET_FILE_EMPTY: ${targetPath}`,
        );
      }

      originalContents[
        targetPath
      ] =
        currentContent;

      updateAutonomousDevelopmentTask(
        taskId,
        {
          phase:
            "GENERATING",
          reason:
            `AIOS is generating a minimal patch from its Development Prompt for ${targetPath}.`,
        },
      );

      const patches =
        await generatePatch(
          objective,
          targetPath,
          currentContent,
          developmentPrompt,
        );

      const patchedContent =
        applyPatchOperations(
          currentContent,
          patches,
        );

      const finalContent =
        validateFinalSource(
          targetPath,
          patchedContent,
        );

      if (
        finalContent ===
        currentContent
      ) {
        throw new Error(
          `AIOS_PATCH_NO_CHANGE: ${targetPath}`,
        );
      }

      patchedContents[
        targetPath
      ] =
        finalContent;
    }

    await loadSafetyGateRepositoryContext(
      targetPaths,
      originalContents,
      patchedContents,
    );

    updateAutonomousDevelopmentTask(
      taskId,
      {
        phase:
          "GENERATING",
        reason:
          "AIOS is running the cross-file Autonomous Development Safety Gate before any GitHub write.",
      },
    );

    runSafetyGateOrThrow(
      objective,
      targetPaths,
      originalContents,
      patchedContents,
    );

    updateAutonomousDevelopmentTask(
      taskId,
      {
        phase:
          "WRITING",
        reason:
          "Autonomous Development Safety Gate passed. AIOS is now writing the prevalidated changes.",
      },
    );

    for (
      const targetPath of targetPaths
    ) {
      enforceAutonomousWriteBudget();

      const finalContent =
        patchedContents[
          targetPath
        ];

      const written =
        await writeFinalFile(
          objective,
          targetPaths,
          targetPath,
          finalContent,
          buildAutonomousCommitMessage(
            objective,
          ),
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
              ? `GitHub readback verified: ${targetPath}`
              : `GitHub readback failed: ${targetPath}`,
        },
      );

      if (
        !written.readbackVerified
      ) {
        throw new Error(
          `AUTONOMOUS_READBACK_FAILED: GitHub readback did not confirm the written content for "${targetPath}". The commit may not match the intended patch.`,
        );
      }
    }

    if (
      commitShas.length ===
      0
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
        commitSha:
          latestCommitSha,
        changedPaths,
        reason:
          "Running Vercel production build verification.",
      },
    );

    verification =
      await verifyVercelBuildForCommit(
        {
          commitSha:
            latestCommitSha,
        },
      );

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

      updateAutonomousDevelopmentTask(
        taskId,
        {
          phase:
            "REPAIR",
          reason:
            `Vercel build repair ${repairRounds}: ${repairTarget}`,
        },
      );

      const current =
        await readFile(
          repairTarget,
        );

      const repairContext = [
        `Vercel status: ${verification.status}`,
        `Vercel error code: ${
          verification.errorCode ||
          "unknown"
        }`,
        `Vercel error message: ${
          verification.errorMessage ||
          "unknown"
        }`,
        "Vercel build logs:",
        verification.buildLogs ||
          "No build logs returned.",
      ].join("\n");

      const patches =
        await generatePatch(
          [
            objective,
            "",
            "Repair the Vercel build failure.",
            repairContext,
          ].join("\n"),
          repairTarget,
          current.content,
          developmentPrompt,
          repairContext,
        );

      const patchedContent =
        applyPatchOperations(
          current.content,
          patches,
        );

      const finalContent =
        validateFinalSource(
          repairTarget,
          patchedContent,
        );

      if (
        finalContent ===
        current.content
      ) {
        throw new Error(
          `AIOS_REPAIR_PATCH_NO_CHANGE: ${repairTarget}`,
        );
      }

      const repairOriginalContents:
        Record<string, string> =
        {
          [repairTarget]:
            current.content,
        };

      const repairPatchedContents:
        Record<string, string> =
        {
          [repairTarget]:
            finalContent,
        };

      await loadSafetyGateRepositoryContext(
        [repairTarget],
        repairOriginalContents,
        repairPatchedContents,
      );

      updateAutonomousDevelopmentTask(
        taskId,
        {
          phase:
            "GENERATING",
          reason:
            `AIOS is running the Autonomous Development Safety Gate for repair round ${repairRounds} before any GitHub write.`,
        },
      );

      runSafetyGateOrThrow(
        [
          objective,
          "",
          "Repair the Vercel build failure.",
          repairContext,
        ].join("\n"),
        [repairTarget],
        repairOriginalContents,
        repairPatchedContents,
      );

      enforceAutonomousWriteBudget();

      updateAutonomousDevelopmentTask(
        taskId,
        {
          phase:
            "WRITING",
          reason:
            `Writing build repair patch: ${repairTarget}`,
        },
      );

      const written =
        await writeFinalFile(
          `${objective}\nVercel repair round ${repairRounds}.`,
          targetPaths,
          repairTarget,
          finalContent,
          buildAutonomousCommitMessage(
            objective,
            repairRounds,
          ),
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

      if (
        !written.readbackVerified
      ) {
        throw new Error(
          `AUTONOMOUS_REPAIR_READBACK_FAILED: GitHub readback did not confirm the repair patch for "${repairTarget}" during build repair round ${repairRounds}.`,
        );
      }

      updateAutonomousDevelopmentTask(
        taskId,
        {
          phase:
            "READBACK",
          commitSha:
            latestCommitSha,
          changedPaths,
          reason:
            `Repair readback verified: ${repairTarget}`,
        },
      );

      updateAutonomousDevelopmentTask(
        taskId,
        {
          phase:
            "BUILD",
          commitSha:
            latestCommitSha,
          changedPaths,
          reason:
            `Verifying autonomous repair round ${repairRounds}.`,
        },
      );

      verification =
        await verifyVercelBuildForCommit(
          {
            commitSha:
              latestCommitSha,
          },
        );
    }

    const buildPassed =
      verification?.status ===
      "PASS";

    const verificationPassed =
      readbackVerified &&
      buildPassed;

    const reason =
      verificationPassed
        ? "Autonomous self-generated development prompt, patch execution, GitHub readback and Vercel production verification completed."
        : verification?.errorMessage ||
          verification?.errorCode ||
          "Final autonomous verification failed.";

    updateAutonomousDevelopmentTask(
      taskId,
      {
        phase:
          verificationPassed
            ? "COMPLETED"
            : "BLOCKED",
        reason,
        commitSha:
          latestCommitSha,
        changedPaths,
      },
    );

    if (
      verificationPassed
    ) {
      await completePersistentAutonomousDevelopmentTask(
        taskId,
        {
          commitSha:
            latestCommitSha,
          readbackVerified,
          verificationPassed,
          reason,
        },
      );
    }

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
