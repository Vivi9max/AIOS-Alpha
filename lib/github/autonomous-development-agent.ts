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
const MAX_CONTEXT_FILES = 12;
const MAX_CONTEXT_FILE_CHARS = 14000;
const MAX_TARGET_CONTEXT_FILE_CHARS = 70000;
const MAX_CONTEXT_CHARS = 150000;
const MAX_TARGET_FILES = 6;
const MAX_GENERATED_FILE_CHARS = 200000;

const MAX_GENERATION_ATTEMPTS = 2;
const MAX_REPAIR_ROUNDS = 2;

const PLANNER_SYSTEM_PROMPT = [
  "AIOS Repository Development Planner",
  "",
  "你负责根据用户自然语言需求和真实仓库索引/源码上下文，决定需要修改哪些文件。",
  "不要要求用户提供 Target Path。Target Path 必须由你从真实仓库上下文中发现。",
  "只选择 app/、components/、docs/、lib/、scripts/、tests/、test/、public/、styles/ 下的文件。",
  "不得选择 package.json、lockfile、vercel.json、.env、.git、.github。",
  "优先选择现有文件。",
  "最多选择 6 个文件。",
  "选择能够形成最小完整产品变更闭环的文件，不要为了覆盖范围而增加无关文件。",
  "只输出 AIOS_PLAN_BEGIN / AIOS_PLAN_END JSON。",
].join("\n");

const FILE_SYSTEM_PROMPT = [
  "AIOS Autonomous Single File Development Agent",
  "",
  "你现在只负责生成一个指定的 exact repository file。",
  "必须输出完整文件，不得输出 diff、Markdown、解释、TODO、placeholder 或省略号。",
  "必须保持现有架构、类型、接口和 import 路径兼容。",
  "不得修改 package.json、lockfile、vercel.json、.env、.git 或 .github。",
  "不得删除现有必要功能。",
  "只输出一个 AIOS_FILE_BEGIN 文件块。",
  "格式：",
  "AIOS_FILE_BEGIN",
  "PATH: <exact repository path>",
  "CONTENT_BEGIN",
  "<complete file content>",
  "CONTENT_END",
  "AIOS_FILE_END",
].join("\n");

const REPAIR_SYSTEM_PROMPT = [
  "AIOS Autonomous Build Repair Agent",
  "",
  "根据真实 Vercel Build Error 修复当前指定源码文件。",
  "必须输出完整文件，不得输出 diff、Markdown、解释、TODO、placeholder 或省略号。",
  "保持现有架构、类型、接口和 Founder 安全边界。",
  "不得修改 package.json、lockfile、vercel.json、.env、.git 或 .github。",
  "每次只输出一个 AIOS_FILE_BEGIN 文件块。",
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

  if (
    /layout\.(tsx|ts)$/.test(lower)
  ) {
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

  const context: Array<{
    path: string;
    content: string;
    sha?: string;
  }> = [];

  let total = 0;

  for (
    const path of ordered.slice(
      0,
      MAX_CONTEXT_FILES,
    )
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
      continue;
    }

    const limit =
      targetSet.has(
        normalizePath(path),
      )
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
      break;
    }

    context.push({
      path,
      content,
      sha:
        result.data.sha,
    });

    total +=
      content.length;
  }

  return context;
}

function extractPlan(
  content: string,
) {
  const match =
    content.match(
      /AIOS_PLAN_BEGIN\s*\r?\n([\s\S]*?)\r?\nAIOS_PLAN_END/,
    );

  if (!match) {
    throw new Error(
      "AIOS_REPOSITORY_PLAN_FORMAT_INVALID",
    );
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(
      match[1]?.trim() ?? "",
    );
  } catch {
    throw new Error(
      "AIOS_REPOSITORY_PLAN_JSON_INVALID",
    );
  }

  if (
    !parsed ||
    typeof parsed !==
      "object" ||
    !Array.isArray(
      (
        parsed as {
          targetPaths?: unknown;
        }
      ).targetPaths,
    )
  ) {
    throw new Error(
      "AIOS_REPOSITORY_PLAN_TARGETS_INVALID",
    );
  }

  const paths = (
    parsed as {
      targetPaths: unknown[];
    }
  ).targetPaths
    .map(String)
    .map(normalizePath)
    .filter(isSafePath);

  const unique =
    Array.from(
      new Set(paths),
    );

  if (!unique.length) {
    throw new Error(
      "AIOS_REPOSITORY_PLAN_EMPTY",
    );
  }

  return unique.slice(
    0,
    MAX_TARGET_FILES,
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
    "Do not select files that are not necessary.",
    "Return only AIOS_PLAN_BEGIN / AIOS_PLAN_END with valid JSON.",
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
  return [
    "AUTONOMOUS DEVELOPMENT REQUEST",
    `Repository: ${REPOSITORY}`,
    `Branch: ${BRANCH}`,
    "",
    "USER REQUIREMENT:",
    objective,
    "",
    "FULL TARGET FILE SET:",
    targetPaths.join("\n"),
    "",
    `CURRENT FILE TO GENERATE: ${targetPath}`,
    "",
    "REAL REPOSITORY SOURCE CONTEXT:",
    ...context.flatMap(
      (file) => [
        `FILE: ${file.path}`,
        "CONTENT_BEGIN",
        file.content,
        "CONTENT_END",
        "",
      ],
    ),
    "Generate the complete current file from beginning to end.",
    "Do not shorten it.",
    "Do not omit unchanged code.",
    "Do not invent imports.",
    "Do not use placeholders.",
    "Do not use TODO as a substitute for implementation.",
    "Return exactly one AIOS_FILE_BEGIN block.",
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
    "TARGET FILES:",
    targetPaths.join("\n"),
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
    "CURRENT REPOSITORY CONTEXT:",
    ...context.flatMap(
      (file) => [
        `FILE: ${file.path}`,
        "CONTENT_BEGIN",
        file.content,
        "CONTENT_END",
        "",
      ],
    ),
    "Repair only the current repair file.",
    "Return one complete AIOS_FILE_BEGIN block.",
  ].join("\n");
}

function extractFile(
  content: string,
  expectedPath: string,
) {
  const match =
    content.match(
      /AIOS_FILE_BEGIN\s*\r?\nPATH:\s*([^\r\n]+)\r?\nCONTENT_BEGIN\r?\n([\s\S]*?)\r?\nCONTENT_END\r?\nAIOS_FILE_END/,
    );

  if (!match) {
    throw new Error(
      "AIOS_GENERATED_FILES_EMPTY",
    );
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

  if (!fileContent.trim()) {
    throw new Error(
      `AIOS_GENERATED_CONTENT_EMPTY: ${path}`,
    );
  }

  if (
    fileContent.length >
    MAX_GENERATED_FILE_CHARS
  ) {
    throw new Error(
      `AIOS_GENERATED_CONTENT_TOO_LARGE: ${path}`,
    );
  }

  return {
    path,
    content: fileContent,
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
            `Previous generation failed with: ${lastReason}`,
            "Regenerate the complete file.",
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
      );

    updateAutonomousDevelopmentTask(
      taskId,
      {
        phase:
          "PLANNING",
      },
    );

    const plan =
      await runBrain(
        plannerPrompt(
          objective,
          discoveredPaths,
          discoveryContext,
        ),
        PLANNER_SYSTEM_PROMPT,
      );

    if (
      !plan.success
    ) {
      throw new Error(
        plan.error ||
          "Repository planning failed.",
      );
    }

    targetPaths =
      extractPlan(
        plan.content,
      );

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
      },
    );

    const targetContext =
      await readContext(
        targetPaths,
        targetPaths,
      );

    if (
      targetContext.length ===
      0
    ) {
      throw new Error(
        "AIOS_TARGET_CONTEXT_EMPTY",
      );
    }

    updateAutonomousDevelopmentTask(
      taskId,
      {
        phase:
          "GENERATING",
        reason:
          `Generating ${targetPaths.length} target file(s).`,
      },
    );

    for (
      const targetPath of targetPaths
    ) {
      const file =
        await generateFile(
          objective,
          targetPath,
          targetPaths,
          targetContext,
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
          "feat(C167.23): stabilize autonomous development execution",
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

      const repairContext =
        await readContext(
          targetPaths,
          [repairTarget],
        );

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
          `fix(C167.23): autonomous build repair ${repairRounds}`,
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
