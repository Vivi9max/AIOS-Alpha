#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_FILE = fileURLToPath(import.meta.url);
const require = createRequire(import.meta.url);
const ts = require("typescript");

const LIMITS = Object.freeze({
  maxTrackedFiles: 20000,
  maxFileBytes: 2 * 1024 * 1024,
  maxTotalBytes: 100 * 1024 * 1024,
  maxContextChars: 200000,
  maxGraphFiles: 12000,
  maxTestCandidates: 40,
});

const ROOT_CONFIGS = [
  "package.json",
  "tsconfig.json",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "eslint.config.js",
  "eslint.config.mjs",
  ".gitignore",
];

function fail(code, message) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function runGit(root, args, options = {}) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: options.encoding ?? "utf8",
      maxBuffer: 32 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stderr = error?.stderr?.toString?.() ?? "";
    fail(
      "AIOS_ENGINEERING_GIT_FAILED",
      `Git command failed: git ${args.join(" ")}\n${stderr}`,
    );
  }
}

function normalizeRepoPath(value) {
  return value.split(path.sep).join("/");
}

function isWithinRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) &&
      relative !== ".." &&
      !path.isAbsolute(relative))
  );
}

function sha256(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function getGitState(root) {
  const rootReal = fs.realpathSync(root);
  const inside = runGit(rootReal, ["rev-parse", "--show-toplevel"]).trim();
  const gitRoot = fs.realpathSync(inside);

  if (gitRoot !== rootReal) {
    fail(
      "AIOS_ENGINEERING_ROOT_MISMATCH",
      "The supplied directory is not the Git repository root.",
    );
  }

  const status = runGit(rootReal, [
    "status",
    "--porcelain",
    "--untracked-files=no",
  ]);

  if (status.trim().length > 0) {
    fail(
      "AIOS_ENGINEERING_TRACKED_WORKTREE_DIRTY",
      "Tracked worktree changes detected. Commit or revert them before creating an engineering context.",
    );
  }

  const head = runGit(rootReal, ["rev-parse", "HEAD"]).trim();
  const branch = runGit(rootReal, [
    "branch",
    "--show-current",
  ]).trim();

  if (!/^[0-9a-f]{40,64}$/i.test(head)) {
    fail(
      "AIOS_ENGINEERING_HEAD_INVALID",
      "Git returned an invalid HEAD commit identifier.",
    );
  }

  const rawFiles = runGit(
    rootReal,
    ["ls-files", "-z"],
    { encoding: "buffer" },
  );

  const files = rawFiles
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map(normalizeRepoPath)
    .sort();

  if (files.length === 0) {
    fail(
      "AIOS_ENGINEERING_TRACKED_FILES_EMPTY",
      "Git returned no tracked files.",
    );
  }

  if (files.length > LIMITS.maxTrackedFiles) {
    fail(
      "AIOS_ENGINEERING_FILE_LIMIT",
      `Tracked file count ${files.length} exceeds ${LIMITS.maxTrackedFiles}.`,
    );
  }

  return {
    root: rootReal,
    head,
    branch: branch || "(detached HEAD)",
    files,
  };
}

function collectTrackedFileMetadata(gitState) {
  const entries = [];
  let totalBytes = 0;

  for (const repoPath of gitState.files) {
    const absolutePath = path.resolve(gitState.root, repoPath);

    if (!isWithinRoot(gitState.root, absolutePath)) {
      fail(
        "AIOS_ENGINEERING_PATH_ESCAPE",
        `Tracked path escapes repository root: ${repoPath}`,
      );
    }

    let stat;

    try {
      stat = fs.lstatSync(absolutePath);
    } catch {
      fail(
        "AIOS_ENGINEERING_TRACKED_FILE_MISSING",
        `Tracked file is missing from the worktree: ${repoPath}`,
      );
    }

    if (stat.isSymbolicLink() || !stat.isFile()) {
      fail(
        "AIOS_ENGINEERING_UNSUPPORTED_FILE_TYPE",
        `Tracked path is not a regular file: ${repoPath}`,
      );
    }

    if (stat.size > LIMITS.maxFileBytes) {
      fail(
        "AIOS_ENGINEERING_FILE_TOO_LARGE",
        `${repoPath} is ${stat.size} bytes; limit is ${LIMITS.maxFileBytes}.`,
      );
    }

    totalBytes += stat.size;

    if (totalBytes > LIMITS.maxTotalBytes) {
      fail(
        "AIOS_ENGINEERING_TOTAL_SIZE_LIMIT",
        `Tracked worktree exceeds ${LIMITS.maxTotalBytes} bytes.`,
      );
    }

    const content = fs.readFileSync(absolutePath);
    const blobSha = runGit(gitState.root, [
      "rev-parse",
      `HEAD:${repoPath}`,
    ]).trim();

    if (!/^[0-9a-f]{40,64}$/i.test(blobSha)) {
      fail(
        "AIOS_ENGINEERING_BLOB_SHA_INVALID",
        `Unable to resolve Git blob SHA for ${repoPath}.`,
      );
    }

    entries.push({
      path: repoPath,
      bytes: content.length,
      sha256: sha256(content),
      blobSha,
    });
  }

  return {
    entries,
    totalBytes,
  };
}

function loadTypeScriptProject(root) {
  const configPath = path.join(root, "tsconfig.json");

  if (!fs.existsSync(configPath)) {
    fail(
      "AIOS_ENGINEERING_TSCONFIG_MISSING",
      "tsconfig.json was not found at the repository root.",
    );
  }

  const configRead = ts.readConfigFile(
    configPath,
    ts.sys.readFile,
  );

  if (configRead.error) {
    fail(
      "AIOS_ENGINEERING_TSCONFIG_INVALID",
      ts.flattenDiagnosticMessageText(
        configRead.error.messageText,
        "\n",
      ),
    );
  }

  const parsed = ts.parseJsonConfigFileContent(
    configRead.config,
    ts.sys,
    root,
    undefined,
    configPath,
  );

  if (parsed.errors.length > 0) {
    const messages = parsed.errors
      .map((diagnostic) =>
        ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          "\n",
        ),
      )
      .join("\n");

    fail(
      "AIOS_ENGINEERING_TSCONFIG_PARSE_FAILED",
      messages,
    );
  }

  const rootNames = parsed.fileNames.map((file) =>
    path.resolve(file),
  );

  if (rootNames.length === 0) {
    fail(
      "AIOS_ENGINEERING_TSCONFIG_EMPTY",
      "tsconfig.json resolved to zero source files.",
    );
  }

  const program = ts.createProgram({
    rootNames,
    options: parsed.options,
  });

  const sourceFiles = program
    .getSourceFiles()
    .filter((sourceFile) => !sourceFile.isDeclarationFile)
    .filter((sourceFile) =>
      isWithinRoot(root, path.resolve(sourceFile.fileName)),
    );

  if (sourceFiles.length > LIMITS.maxGraphFiles) {
    fail(
      "AIOS_ENGINEERING_GRAPH_LIMIT",
      `TypeScript graph has ${sourceFiles.length} files; limit is ${LIMITS.maxGraphFiles}.`,
    );
  }

  return {
    program,
    sourceFiles,
    compilerOptions: parsed.options,
  };
}

function getModuleSpecifiers(sourceFile) {
  const specifiers = new Set();

  for (const statement of sourceFile.statements) {
    if (
      (ts.isImportDeclaration(statement) ||
        ts.isExportDeclaration(statement)) &&
      statement.moduleSpecifier &&
      ts.isStringLiteralLike(statement.moduleSpecifier)
    ) {
      specifiers.add(statement.moduleSpecifier.text);
    }
  }

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      node.arguments.length > 0 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      const expression = node.expression;

      if (
        expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(expression) &&
          expression.text === "require")
      ) {
        specifiers.add(node.arguments[0].text);
      }
    }

    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal)
    ) {
      specifiers.add(node.argument.literal.text);
    }

    ts.forEachChild(node, visit);
  }

  ts.forEachChild(sourceFile, visit);
  return [...specifiers].sort();
}

function toRepoPath(root, absolutePath) {
  const relative = path.relative(root, absolutePath);
  return normalizeRepoPath(relative);
}

function buildDependencyGraph(root, project, trackedSet) {
  const dependencies = new Map();
  const reverseDependencies = new Map();
  const unresolvedInternal = [];

  for (const sourceFile of project.sourceFiles) {
    const sourcePath = toRepoPath(root, sourceFile.fileName);

    if (!trackedSet.has(sourcePath)) {
      continue;
    }

    const resolvedPaths = new Set();

    for (const specifier of getModuleSpecifiers(sourceFile)) {
      const resolution = ts.resolveModuleName(
        specifier,
        sourceFile.fileName,
        project.compilerOptions,
        ts.sys,
      );

      const resolved = resolution.resolvedModule?.resolvedFileName;

      if (!resolved) {
        if (
          specifier.startsWith(".") ||
          specifier.startsWith("@/")
        ) {
          unresolvedInternal.push({
            from: sourcePath,
            specifier,
          });
        }

        continue;
      }

      const absoluteResolved = path.resolve(resolved);

      if (!isWithinRoot(root, absoluteResolved)) {
        continue;
      }

      const targetPath = toRepoPath(root, absoluteResolved);

      if (!trackedSet.has(targetPath)) {
        continue;
      }

      if (targetPath === sourcePath) {
        continue;
      }

      resolvedPaths.add(targetPath);

      if (!reverseDependencies.has(targetPath)) {
        reverseDependencies.set(targetPath, new Set());
      }

      reverseDependencies.get(targetPath).add(sourcePath);
    }

    dependencies.set(sourcePath, resolvedPaths);
  }

  if (unresolvedInternal.length > 0) {
    const details = unresolvedInternal
      .map((item) => `${item.from} -> ${item.specifier}`)
      .join("\n");

    fail(
      "AIOS_ENGINEERING_INTERNAL_DEPENDENCY_UNRESOLVED",
      `Unresolved internal TypeScript dependencies:\n${details}`,
    );
  }

  return {
    dependencies,
    reverseDependencies,
  };
}

function serializeGraph(graph) {
  const dependencies = {};

  for (const [file, values] of graph.dependencies) {
    dependencies[file] = [...values].sort();
  }

  const reverseDependencies = {};

  for (const [file, values] of graph.reverseDependencies) {
    reverseDependencies[file] = [...values].sort();
  }

  return {
    dependencies,
    reverseDependencies,
  };
}

export function buildRepositoryIndex(root = process.cwd()) {
  const gitState = getGitState(root);
  const metadata = collectTrackedFileMetadata(gitState);
  const trackedSet = new Set(gitState.files);
  const project = loadTypeScriptProject(gitState.root);
  const graph = buildDependencyGraph(
    gitState.root,
    project,
    trackedSet,
  );

  return {
    schemaVersion: 1,
    repositoryRoot: gitState.root,
    head: gitState.head,
    branch: gitState.branch,
    generatedAt: new Date().toISOString(),
    trackedFileCount: metadata.entries.length,
    trackedBytes: metadata.totalBytes,
    trackedFiles: metadata.entries,
    typescriptSourceCount: project.sourceFiles.length,
    graph: serializeGraph(graph),
  };
}

function assertTargetPath(targetPath) {
  if (
    typeof targetPath !== "string" ||
    targetPath.length === 0 ||
    path.isAbsolute(targetPath) ||
    targetPath.includes("\0") ||
    targetPath.split(/[\\/]/).includes("..")
  ) {
    fail(
      "AIOS_ENGINEERING_TARGET_PATH_INVALID",
      "Target must be a repository-relative path without traversal segments.",
    );
  }

  return normalizeRepoPath(targetPath);
}

function findTestCandidates(targetPath, trackedFiles) {
  const base = path.posix.basename(targetPath);
  const stem = base.replace(/\.(tsx?|jsx?)$/, "");
  const directory = path.posix.dirname(targetPath);

  const candidates = trackedFiles.filter((candidate) => {
    const lower = candidate.toLowerCase();
    const candidateBase = path.posix.basename(lower);

    const testLike =
      /\.(test|spec)\.(tsx?|jsx?)$/.test(candidateBase) ||
      lower.includes("/__tests__/") ||
      lower.startsWith("tests/") ||
      lower.startsWith("test/");

    if (!testLike) {
      return false;
    }

    return (
      candidateBase.includes(stem.toLowerCase()) ||
      path.posix.dirname(candidate) === directory ||
      lower.includes("autonomous-development")
    );
  });

  return candidates
    .sort()
    .slice(0, LIMITS.maxTestCandidates);
}

function readBoundedText(root, repoPath) {
  const absolutePath = path.resolve(root, repoPath);

  if (!isWithinRoot(root, absolutePath)) {
    fail(
      "AIOS_ENGINEERING_CONTEXT_PATH_ESCAPE",
      `Context path escapes repository: ${repoPath}`,
    );
  }

  const stat = fs.statSync(absolutePath);

  if (!stat.isFile() || stat.size > LIMITS.maxFileBytes) {
    fail(
      "AIOS_ENGINEERING_CONTEXT_FILE_INVALID",
      `Context file is missing, not regular, or too large: ${repoPath}`,
    );
  }

  return fs.readFileSync(absolutePath, "utf8");
}

export function inspectRepositoryTarget(
  root,
  targetPath,
  repositoryIndex = undefined,
) {
  const gitState = getGitState(root);
  const index = repositoryIndex ?? buildRepositoryIndex(gitState.root);
  const normalizedTarget = assertTargetPath(targetPath);

  if (index.head !== gitState.head) {
    fail(
      "AIOS_ENGINEERING_INDEX_STALE",
      "Repository index HEAD does not match the current repository HEAD.",
    );
  }

  const trackedSet = new Set(gitState.files);

  if (!trackedSet.has(normalizedTarget)) {
    fail(
      "AIOS_ENGINEERING_TARGET_NOT_TRACKED",
      `Target is not a tracked repository file: ${normalizedTarget}`,
    );
  }

  const targetAbsolute = path.resolve(gitState.root, normalizedTarget);
  const project = loadTypeScriptProject(gitState.root);
  const sourceFile = project.sourceFiles.find(
    (item) => path.resolve(item.fileName) === targetAbsolute,
  );

  if (!sourceFile) {
    fail(
      "AIOS_ENGINEERING_TARGET_NOT_TYPESCRIPT",
      `Target is not included in the configured TypeScript project: ${normalizedTarget}`,
    );
  }

  const graph = buildDependencyGraph(
    gitState.root,
    project,
    trackedSet,
  );

  const directDependencies = [
    ...(graph.dependencies.get(normalizedTarget) ?? new Set()),
  ].sort();

  const reverseImporters = [
    ...(graph.reverseDependencies.get(normalizedTarget) ?? new Set()),
  ].sort();

  const testCandidates = findTestCandidates(
    normalizedTarget,
    gitState.files,
  );

  const configFiles = ROOT_CONFIGS.filter((file) =>
    trackedSet.has(file),
  );

  const sections = [];
  const addSection = (heading, content) => {
    const section = `\n## ${heading}\n\n${content}\n`;
    sections.push(section);
  };

  addSection("Target", normalizedTarget);
  addSection(
    "Direct dependencies",
    directDependencies.length
      ? directDependencies.map((item) => `- ${item}`).join("\n")
      : "(none resolved)",
  );
  addSection(
    "Reverse importers",
    reverseImporters.length
      ? reverseImporters.map((item) => `- ${item}`).join("\n")
      : "(none resolved)",
  );
  addSection(
    "Likely tests",
    testCandidates.length
      ? testCandidates.map((item) => `- ${item}`).join("\n")
      : "(no likely test files found)",
  );
  addSection(
    "Root configuration",
    configFiles.map((item) => `- ${item}`).join("\n"),
  );

  const targetContent = readBoundedText(
    gitState.root,
    normalizedTarget,
  );

  addSection(
    `Target source: ${normalizedTarget}`,
    `\`\`\`\n${targetContent}\n\`\`\``,
  );

  for (const dependency of directDependencies) {
    addSection(
      `Dependency source: ${dependency}`,
      `\`\`\`\n${readBoundedText(gitState.root, dependency)}\n\`\`\``,
    );
  }

  for (const importer of reverseImporters) {
    addSection(
      `Reverse importer source: ${importer}`,
      `\`\`\`\n${readBoundedText(gitState.root, importer)}\n\`\`\``,
    );
  }

  for (const testFile of testCandidates) {
    addSection(
      `Test candidate source: ${testFile}`,
      `\`\`\`\n${readBoundedText(gitState.root, testFile)}\n\`\`\``,
    );
  }

  for (const configFile of configFiles) {
    addSection(
      `Configuration source: ${configFile}`,
      `\`\`\`\n${readBoundedText(gitState.root, configFile)}\n\`\`\``,
    );
  }

  const context = sections.join("");

  if (context.length > LIMITS.maxContextChars) {
    fail(
      "AIOS_ENGINEERING_CONTEXT_TOO_LARGE",
      `Target context is ${context.length} characters; limit is ${LIMITS.maxContextChars}. No truncation was performed.`,
    );
  }

  return {
    schemaVersion: 1,
    repository: {
      head: gitState.head,
      branch: gitState.branch,
    },
    target: normalizedTarget,
    directDependencies,
    reverseImporters,
    likelyTests: testCandidates,
    rootConfigurations: configFiles,
    contextCharacters: context.length,
    context,
  };
}

function parseArgs(argv) {
  const [command, ...rest] = argv;

  if (command === "snapshot" && rest.length === 0) {
    return { command };
  }

  if (
    command === "inspect" &&
    rest.length === 1 &&
    !rest[0].startsWith("-")
  ) {
    return {
      command,
      targetPath: rest[0],
    };
  }

  fail(
    "AIOS_ENGINEERING_USAGE",
    [
      "Usage:",
      "  node scripts/aios-engineering-context.mjs snapshot",
      "  node scripts/aios-engineering-context.mjs inspect <repository-relative-file>",
    ].join("\n"),
  );
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const root = process.cwd();

  if (args.command === "snapshot") {
    const result = buildRepositoryIndex(root);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  if (args.command === "inspect") {
    const result = inspectRepositoryTarget(
      root,
      args.targetPath,
    );
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  }
}

const invokedPath = process.argv[1]
  ? path.resolve(process.argv[1])
  : "";

if (
  invokedPath &&
  pathToFileURL(invokedPath).href === pathToFileURL(SCRIPT_FILE).href
) {
  try {
    main();
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? error.code
        : "AIOS_ENGINEERING_CONTEXT_FAILED";

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    process.stderr.write(`${code}: ${message}\n`);
    process.exitCode = 1;
  }
}
