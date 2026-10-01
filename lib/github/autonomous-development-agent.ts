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
const MAX_DISCOVERY_ENTRIES = 260;
const MAX_CONTEXT_FILES = 18;
const MAX_CONTEXT_FILE_CHARS = 18000;
const MAX_TARGET_CONTEXT_FILE_CHARS = 80000;
const MAX_CONTEXT_CHARS = 180000;
const MAX_TARGET_FILES = 8;
const MAX_GENERATED_FILE_CHARS = 250000;
const MAX_GENERATION_ATTEMPTS = 3;
const MAX_REPAIR_ROUNDS = 2;

const PLANNER_SYSTEM_PROMPT = [
  "AIOS Repository Development Planner",
  "",
  "你负责根据用户自然语言需求和真实仓库索引/源码上下文，决定需要修改哪些文件。",
  "不要要求用户提供 Target Path。Target Path 必须由你从真实仓库上下文中发现。",
  "只选择 app/、components/、docs/、lib/、scripts/、tests/、test/、public/、styles/ 下的文件。",
  "不得选择 package.json、lockfile、vercel.json、.env、.git、.github。",
  "优先选择现有文件，最多选择 8 个文件。",
  "只输出 AIOS_PLAN_BEGIN / AIOS_PLAN_END JSON。",
].join("\n");

const FILE_SYSTEM_PROMPT = [
  "AIOS Autonomous Single File Development Agent",
  "",
  "你现在只负责生成一个指定的 exact repository file。",
  "必须输出完整文件，不得输出 diff、Markdown、解释、TODO、placeholder 或省略号。",
  "必须保持现有架构、类型、接口和 import 路径兼容。",
  "不得修改 package.json、lockfile、vercel.json、.env、.git 或 .github。",
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
  "每次只输出一个 AIOS_FILE_BEGIN 文件块。",
].join("\n");

async function runBrain(prompt: string, systemPrompt: string) {
  return chat(prompt, { systemPrompt, historyLimit: 0 });
}

function normalizePath(value: string) {
  return value.trim().replace(/^\/+/, "").replace(/\\+/g, "/");
}

function isSafePath(path: string) {
  const normalized = normalizePath(path);
  if (!normalized || normalized.includes("..") || normalized.includes("\0")) return false;
  if (normalized.startsWith(".git/") || normalized.startsWith(".env") || normalized.startsWith(".github/")) return false;
  if (["package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "vercel.json"].includes(normalized)) return false;
  return ["app", "components", "docs", "lib", "scripts", "tests", "test", "public", "styles"].some(
    (root) => normalized === root || normalized.startsWith(`${root}/`),
  );
}

function objectiveTokens(objective: string) {
  return Array.from(
    new Set(
      objective
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fff/_-]+/gi, " ")
        .split(/\s+/)
        .filter((token) => token.length >= 2),
    ),
  );
}

function scorePath(path: string, tokens: string[]) {
  const lower = path.toLowerCase();
  let score = 0;
  for (const token of tokens) if (lower.includes(token)) score += 5;
  if (/page\.(tsx|ts)$/.test(lower)) score += 2;
  if (/route\.(tsx|ts)$/.test(lower)) score += 2;
  return score;
}

async function discoverRepositoryPaths(objective: string) {
  const roots = ["app", "components", "docs", "lib", "scripts", "tests", "test", "public", "styles"];
  const queue = roots.map((path) => ({ path, depth: 0 }));
  const discovered = new Set<string>();

  while (queue.length && discovered.size < MAX_DISCOVERY_ENTRIES) {
    const current = queue.shift();
    if (!current) break;
    const result = await listGitHubPath({ repo: REPOSITORY, path: current.path, ref: BRANCH });
    if (!result.success || !result.data) continue;

    for (const entry of result.data) {
      const path = normalizePath(entry.path);
      if (!isSafePath(path)) continue;
      if (entry.type === "dir") {
        if (current.depth < 3) queue.push({ path, depth: current.depth + 1 });
      } else if (entry.type === "file") {
        discovered.add(path);
      }
      if (discovered.size >= MAX_DISCOVERY_ENTRIES) break;
    }
  }

  const tokens = objectiveTokens(objective);
  return Array.from(discovered).sort(
    (a, b) => scorePath(b, tokens) - scorePath(a, tokens) || a.localeCompare(b),
  );
}

async function readContext(paths: string[], targetPaths: string[] = []) {
  const targetSet = new Set(targetPaths.map(normalizePath));
  const ordered = [
    ...paths.filter((path) => targetSet.has(normalizePath(path))),
    ...paths.filter((path) => !targetSet.has(normalizePath(path))),
  ];
  const context: Array<{ path: string; content: string; sha?: string }> = [];
  let total = 0;

  for (const path of ordered.slice(0, MAX_CONTEXT_FILES)) {
    const result = await readGitHubFile({ repo: REPOSITORY, path, ref: BRANCH });
    if (!result.success || !result.data) continue;
    const limit = targetSet.has(normalizePath(path)) ? MAX_TARGET_CONTEXT_FILE_CHARS : MAX_CONTEXT_FILE_CHARS;
    const content = result.data.content.slice(0, limit);
    if (total + content.length > MAX_CONTEXT_CHARS) break;
    context.push({ path, content, sha: result.data.sha });
    total += content.length;
  }
  return context;
}

function extractPlan(content: string) {
  const match = content.match(/AIOS_PLAN_BEGIN\s*\r?\n([\s\S]*?)\r?\nAIOS_PLAN_END/);
  if (!match) throw new Error("AIOS_REPOSITORY_PLAN_FORMAT_INVALID");
  let parsed: unknown;
  try { parsed = JSON.parse(match[1]?.trim() ?? ""); } catch { throw new Error("AIOS_REPOSITORY_PLAN_JSON_INVALID"); }
  if (!parsed || typeof parsed !== "object" || !Array.isArray((parsed as { targetPaths?: unknown }).targetPaths)) {
    throw new Error("AIOS_REPOSITORY_PLAN_TARGETS_INVALID");
  }
  const paths = (parsed as { targetPaths: unknown[] }).targetPaths.map(String).map(normalizePath).filter(isSafePath);
  const unique = Array.from(new Set(paths));
  if (!unique.length) throw new Error("AIOS_REPOSITORY_PLAN_EMPTY");
  return unique.slice(0, MAX_TARGET_FILES);
}

function plannerPrompt(objective: string, paths: string[], context: Array<{ path: string; content: string }>) {
  return [
    "AUTONOMOUS DEVELOPMENT REQUEST",
    `Repository: ${REPOSITORY}`,
    `Branch: ${BRANCH}`,
    "",
    "USER REQUIREMENT:", objective,
    "",
    "REPOSITORY DISCOVERY INDEX:", paths.join("\n"),
    "",
    "RELEVANT SOURCE CONTEXT:",
    ...context.flatMap((file) => [`FILE: ${file.path}`, "CONTENT_BEGIN", file.content, "CONTENT_END", ""]),
    "Choose the smallest coherent set of existing files required by the requirement.",
    "Return only AIOS_PLAN_BEGIN / AIOS_PLAN_END with valid JSON.",
  ].join("\n");
}

function filePrompt(objective: string, targetPath: string, targetPaths: string[], context: Array<{ path: string; content: string }>) {
  return [
    "AUTONOMOUS DEVELOPMENT REQUEST",
    `Repository: ${REPOSITORY}`,
    `Branch: ${BRANCH}`,
    "",
    "USER REQUIREMENT:", objective,
    "",
    "FULL TARGET FILE SET:", targetPaths.join("\n"),
    "",
    `CURRENT FILE TO GENERATE: ${targetPath}`,
    "",
    "REAL REPOSITORY SOURCE CONTEXT:",
    ...context.flatMap((file) => [`FILE: ${file.path}`, "CONTENT_BEGIN", file.content, "CONTENT_END", ""]),
    "Generate the complete current file from beginning to end.",
    "Do not shorten it, omit unchanged code, invent imports, or use placeholders.",
    "Return exactly one AIOS_FILE_BEGIN block.",
  ].join("\n");
}

function repairPrompt(objective: string, targetPath: string, targetPaths: string[], context: Array<{ path: string; content: string }>, verification: VercelBuildVerificationResult, round: number) {
  return [
    "AUTONOMOUS BUILD REPAIR REQUEST",
    `Repair round: ${round}`,
    `Repository: ${REPOSITORY}`,
    `Branch: ${BRANCH}`,
    "",
    "USER REQUIREMENT:", objective,
    "",
    `CURRENT REPAIR FILE: ${targetPath}`,
    "TARGET FILES:", targetPaths.join("\n"),
    "",
    "VERCEL STATUS:", verification.readyState || verification.status,
    "VERCEL ERROR CODE:", verification.errorCode || "unknown",
    "VERCEL ERROR MESSAGE:", verification.errorMessage || "",
    "VERCEL BUILD LOGS:", verification.buildLogs || "No build logs returned.",
    "",
    "CURRENT REPOSITORY CONTEXT:",
    ...context.flatMap((file) => [`FILE: ${file.path}`, "CONTENT_BEGIN", file.content, "CONTENT_END", ""]),
    "Repair only the current repair file and return one complete AIOS_FILE_BEGIN block.",
  ].join("\n");
}

function extractFile(content: string, expectedPath: string) {
  const match = content.match(/AIOS_FILE_BEGIN\s*\r?\nPATH:\s*([^\r\n]+)\r?\nCONTENT_BEGIN\r?\n([\s\S]*?)\r?\nCONTENT_END\r?\nAIOS_FILE_END/);
  if (!match) throw new Error("AIOS_GENERATED_FILES_EMPTY");
  const path = normalizePath(match[1] ?? "");
  if (path !== normalizePath(expectedPath) || !isSafePath(path)) throw new Error(`AIOS_GENERATED_PATH_REJECTED: ${path}`);
  const fileContent = match[2] ?? "";
  if (!fileContent.trim()) throw new Error(`AIOS_GENERATED_CONTENT_EMPTY: ${path}`);
  if (fileContent.length > MAX_GENERATED_FILE_CHARS) throw new Error(`AIOS_GENERATED_CONTENT_TOO_LARGE: ${path}`);
  return { path, content: fileContent };
}

async function generateFile(objective: string, targetPath: string, targetPaths: string[], context: Array<{ path: string; content: string }>) {
  let lastReason = "AIOS_GENERATED_FILES_EMPTY";
  for (let attempt = 1; attempt <= MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const prompt = attempt === 1
      ? filePrompt(objective, targetPath, targetPaths, context)
      : `${filePrompt(objective, targetPath, targetPaths, context)}\nPrevious generation failed with: ${lastReason}\nRegenerate the complete file.`;
    const generation = await runBrain(prompt, FILE_SYSTEM_PROMPT);
    if (!generation.success) {
      lastReason = generation.error || "AI generation failed.";
      continue;
    }
    try { return extractFile(generation.content, targetPath); }
    catch (error) { lastReason = error instanceof Error ? error.message : "Generated file could not be parsed."; }
  }
  throw new Error(`AIOS_GENERATED_FILE_FAILED: ${targetPath}: ${lastReason}`);
}

async function writeFile(objective: string, targetPaths: string[], file: { path: string; content: string }, commitMessage: string) {
  const contract = createFounderDevelopmentContract({
    objective,
    requestedFiles: targetPaths,
    actions: ["read", "write", "verify"],
    verification: ["readback", "build", "production"],
    commitMessage,
  });
  const result = await dispatchGitHubTask({
    action: "write",
    repo: REPOSITORY,
    branch: BRANCH,
    path: file.path,
    content: file.content,
    commitMessage,
    contract,
  });
  if (!result.success) throw new Error(result.error || result.code || `GitHub write failed: ${file.path}`);
  return {
    path: file.path,
    commitSha: result.write?.commitSha || "",
    readbackVerified: result.write?.readbackVerified === true,
  };
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
  buildVerification: "NOT_EXECUTED" | "PASS" | "FAIL" | "NOT_CONFIGURED" | "TIMEOUT";
  buildVerificationResult?: VercelBuildVerificationResult;
  repairRounds: number;
  reason?: string;
}

export async function executeAutonomousDevelopmentAgent(input: { objective: string; taskId?: string }): Promise<AutonomousDevelopmentAgentResult> {
  const objective = input.objective.trim().slice(0, MAX_OBJECTIVE_LENGTH);
  const changedPaths: string[] = [];
  const commitShas: string[] = [];
  let taskId = input.taskId || "";
  let discoveredPaths: string[] = [];
  let targetPaths: string[] = [];
  let readbackVerified = true;
  let verification: VercelBuildVerificationResult | undefined;
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
    buildVerification: (verification?.status || "NOT_EXECUTED") as "NOT_EXECUTED" | "PASS" | "FAIL" | "NOT_CONFIGURED" | "TIMEOUT",
    buildVerificationResult: verification,
    repairRounds,
  });

  try {
    if (!objective) throw new Error("Development objective is required.");

    let task = taskId ? getAutonomousDevelopmentTask(taskId) : null;
    if (taskId && !task) throw new Error("Autonomous development task was not found.");
    if (!task) {
      task = createAutonomousDevelopmentTask({ objective, targetPaths: [] });
      taskId = task.id;
    }
    if (task.status === "todo") claimAutonomousDevelopmentTask(taskId);

    updateAutonomousDevelopmentTask(taskId, { phase: "DISCOVERING", reason: undefined });
    discoveredPaths = await discoverRepositoryPaths(objective);
    updateAutonomousDevelopmentTask(taskId, { phase: "READING" });
    const discoveryContext = await readContext(discoveredPaths);

    updateAutonomousDevelopmentTask(taskId, { phase: "PLANNING" });
    const plan = await runBrain(plannerPrompt(objective, discoveredPaths, discoveryContext), PLANNER_SYSTEM_PROMPT);
    if (!plan.success) throw new Error(plan.error || "Repository planning failed.");
    targetPaths = extractPlan(plan.content);
    updateAutonomousDevelopmentTask(taskId, { targetPaths, phase: "READING" });

    const targetContext = await readContext(targetPaths, targetPaths);
    updateAutonomousDevelopmentTask(taskId, { phase: "GENERATING" });

    for (const targetPath of targetPaths) {
      const file = await generateFile(objective, targetPath, targetPaths, targetContext);
      updateAutonomousDevelopmentTask(taskId, { phase: "WRITING", reason: `Writing ${targetPath}` });
      const written = await writeFile(objective, targetPaths, file, "feat(C167.20): close autonomous development execution loop");
      changedPaths.push(written.path);
      if (written.commitSha) commitShas.push(written.commitSha);
      readbackVerified = readbackVerified && written.readbackVerified;
      updateAutonomousDevelopmentTask(taskId, {
        phase: "READBACK",
        commitSha: written.commitSha || undefined,
        changedPaths,
        reason: written.readbackVerified ? `Readback verified: ${targetPath}` : `Readback failed: ${targetPath}`,
      });
      if (!written.readbackVerified) throw new Error(`AUTONOMOUS_READBACK_FAILED: ${targetPath}`);
    }

    if (!commitShas.length) throw new Error("AUTONOMOUS_COMMIT_SHA_MISSING");
    updateAutonomousDevelopmentTask(taskId, { phase: "BUILD", changedPaths, commitSha: commitShas[commitShas.length - 1] });
    verification = await verifyVercelBuildForCommit({ commitSha: commitShas[commitShas.length - 1] });

    while (verification.status === "FAIL" && repairRounds < MAX_REPAIR_ROUNDS) {
      repairRounds += 1;
      updateAutonomousDevelopmentTask(taskId, { phase: "REPAIR", reason: verification.errorMessage || verification.errorCode || "Vercel build failed." });
      for (const targetPath of targetPaths) {
        const context = await readContext(targetPaths, [targetPath]);
        const generation = await runBrain(
          repairPrompt(objective, targetPath, targetPaths, context, verification, repairRounds),
          REPAIR_SYSTEM_PROMPT,
        );
        if (!generation.success) throw new Error(generation.error || `Repair generation failed: ${targetPath}`);
        const file = extractFile(generation.content, targetPath);
        const written = await writeFile(
          `${objective}\nVercel repair round ${repairRounds}.`,
          targetPaths,
          file,
          `fix(C167.20): autonomous build repair ${repairRounds}`,
        );
        changedPaths.push(written.path);
        if (written.commitSha) commitShas.push(written.commitSha);
        readbackVerified = readbackVerified && written.readbackVerified;
        if (!written.commitSha || !written.readbackVerified) throw new Error(`AUTONOMOUS_REPAIR_READBACK_FAILED: ${targetPath}`);
        updateAutonomousDevelopmentTask(taskId, { phase: "READBACK", commitSha: written.commitSha, changedPaths });
        verification = await verifyVercelBuildForCommit({ commitSha: written.commitSha });
        if (verification.status === "PASS") break;
      }
    }

    const buildPassed = verification?.status === "PASS";
    const verificationPassed = readbackVerified && buildPassed;
    const reason = verificationPassed
      ? "Commit, GitHub readback and Vercel production build verification completed."
      : verification?.errorMessage || verification?.errorCode || "Final verification failed.";

    updateAutonomousDevelopmentTask(taskId, { phase: verificationPassed ? "COMPLETED" : "BLOCKED", reason, changedPaths, commitSha: commitShas[commitShas.length - 1] });
    completeAutonomousDevelopmentTask(taskId, {
      commitSha: commitShas[commitShas.length - 1] || "",
      readbackVerified,
      verificationPassed,
      reason,
    });

    return {
      success: verificationPassed,
      code: verificationPassed ? "AUTONOMOUS_DEVELOPMENT_COMPLETED" : "AUTONOMOUS_DEVELOPMENT_BUILD_FAILED",
      taskId,
      ...resultBase(),
      verificationPassed,
      reason,
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Autonomous development execution failed.";
    if (taskId) {
      try {
        blockAutonomousDevelopmentTask(taskId, reason);
      } catch {
        // Preserve the original execution failure.
      }
    }
    return {
      success: false,
      code: "AUTONOMOUS_DEVELOPMENT_BLOCKED",
      taskId: taskId || undefined,
      ...resultBase(),
      reason,
    };
  }
}
