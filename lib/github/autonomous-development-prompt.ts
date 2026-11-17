import "server-only";

import {
  getObjectiveLengthError,
} from "@/lib/autonomous-development-objective-contract";

export type AutonomousDevelopmentPromptMode =
  | "EXPLICIT_TARGET_PATCH"
  | "PLANNED_PATCH";

export type AutonomousDevelopmentTargetOperation =
  | "CREATE"
  | "REPLACE";

export type AutonomousDevelopmentTarget = {
  path: string;
  operation: AutonomousDevelopmentTargetOperation;
};

export type AutonomousDevelopmentPromptInput = {
  objective: string;
  targetPaths: string[];
  mode: AutonomousDevelopmentPromptMode;
  targetOperations?: AutonomousDevelopmentTargetOperation[];
};

const MAX_TARGET_PATHS = 6;

function normalizePath(value: string) {
  return value
    .trim()
    .replace(/^\/+/, "")
    .replace(/\\+/g, "/");
}

function uniquePaths(paths: string[]) {
  return Array.from(
    new Set(
      paths
        .map(normalizePath)
        .filter(Boolean),
    ),
  ).slice(0, MAX_TARGET_PATHS);
}

const CREATE_INTENT_PATTERN =
  /\b(?:create|creating|add|adding|introduce|introducing|new file|new module|scaffold|scaffolding|generate)\b|(?:创建|新建|新增|添加|建立|生成)/i;

const REPLACE_INTENT_PATTERN =
  /\b(?:modify|modifying|update|updating|edit|editing|change|changing|replace|replacing|refactor|refactoring|patch|patching|fix|fixing|extend|extending|existing file|existing module)\b|(?:修改|更新|编辑|替换|重构|调整|扩展现有|现有文件|现有模块)/i;

function classifyPathOperation(
  objective: string,
  path: string,
): AutonomousDevelopmentTargetOperation | null {
  const escapedPath =
    path.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    );

  const pattern =
    new RegExp(
      escapedPath,
      "g",
    );

  const operations =
    new Set<AutonomousDevelopmentTargetOperation>();

  let match:
    | RegExpExecArray
    | null = null;

  while (
    (match =
      pattern.exec(
        objective,
      )) !== null
  ) {
    if (
      isNegatedExplicitPath(
        objective,
        match.index,
      )
    ) {
      continue;
    }

    const contextStart =
      Math.max(
        0,
        match.index - 160,
      );

    const contextEnd =
      Math.min(
        objective.length,
        match.index + path.length + 160,
      );

    const context =
      objective.slice(
        contextStart,
        contextEnd,
      );

    const hasCreate =
      CREATE_INTENT_PATTERN.test(
        context,
      );

    const hasReplace =
      REPLACE_INTENT_PATTERN.test(
        context,
      );

    if (hasCreate && !hasReplace) {
      operations.add("CREATE");
    } else if (hasReplace && !hasCreate) {
      operations.add("REPLACE");
    } else if (hasCreate && hasReplace) {
      operations.add("CREATE");
      operations.add("REPLACE");
    }
  }

  if (operations.size === 0) {
    return null;
  }

  if (operations.size > 1) {
    throw new Error(
      `Ambiguous target operation for path: ${path}. The objective classifies this path as both CREATE and REPLACE.`,
    );
  }

  return Array.from(
    operations,
  )[0];
}

function resolveTargetOperations(
  objective: string,
  targetPaths: string[],
  explicitOperations?:
    | AutonomousDevelopmentTargetOperation[]
    | undefined,
): AutonomousDevelopmentTarget[] {
  if (
    explicitOperations &&
    explicitOperations.length > 0 &&
    explicitOperations.length !==
      targetPaths.length
  ) {
    throw new Error(
      "Target operation count does not match target path count.",
    );
  }

  const seenPaths =
    new Set<string>();

  return targetPaths.map(
    (path, index) => {
      if (seenPaths.has(path)) {
        throw new Error(
          `Duplicate target path: ${path}`,
        );
      }

      seenPaths.add(path);

      const explicit =
        explicitOperations?.[index];

      if (explicit) {
        if (
          explicit !== "CREATE" &&
          explicit !== "REPLACE"
        ) {
          throw new Error(
            `Invalid target operation: ${String(explicit)}`,
          );
        }

        return {
          path,
          operation: explicit,
        };
      }

      const inferred =
        classifyPathOperation(
          objective,
          path,
        );

      if (!inferred) {
        return {
          path,
          operation: "REPLACE",
        };
      }

      return {
        path,
        operation: inferred,
      };
    },
  );
}

function normalizeObjective(value: string) {
  const normalized = value.trim();
  const error = getObjectiveLengthError(normalized);

  if (error) {
    throw new Error(error);
  }

  return normalized;
}

function isNegatedExplicitPath(
  objective: string,
  matchStart: number,
) {
  const contextStart =
    Math.max(0, matchStart - 180);

  const context =
    objective.slice(
      contextStart,
      matchStart,
    );

  const normalized =
    context
      .toLowerCase()
      .replace(
        /[`"'“”‘’]/g,
        " ",
      )
      .replace(/\s+/g, " ")
      .trim();

  if (!normalized) {
    return false;
  }

  const boundaryIndex =
    Math.max(
      normalized.lastIndexOf("."),
      normalized.lastIndexOf(":"),
      normalized.lastIndexOf(";"),
      normalized.lastIndexOf("\n"),
    );

  const recent =
    normalized.slice(
      boundaryIndex + 1,
    );

  const negativePattern =
    /\b(?:do not|don't|never|must not|mustn't|not allowed|forbidden|exclude|excluded|excluding|outside|without|avoid|leave out|do not modify|don't modify|do not change|don't change|do not touch|don't touch)\b/i;

  return negativePattern.test(
    recent,
  );
}

function extractRepositoryPathMatches(
  objective: string,
) {
  const normalizedObjective =
    objective
      .replace(
        /[`"'“”‘’]/g,
        " ",
      );

  /*
   * C169.8 FIX:
   * Allow dots inside the filename stem.
   *
   * Previously:
   * docs/C169.8-staging-smoke-test.md
   *
   * Could be truncated to:
   * docs/C169.8
   *
   * The updated expression supports versioned and multi-dot
   * filenames while retaining the final file extension check.
   */
  const pattern =
    /\b(?:app|components|docs|lib|scripts|tests|test|public|styles)\/[A-Za-z0-9_@+./-]+\.[A-Za-z0-9]+\b/g;

  const matches: string[] = [];

  let match:
    | RegExpExecArray
    | null = null;

  while (
    (match =
      pattern.exec(
        normalizedObjective,
      )) !== null
  ) {
    const rawValue =
      match[0] || "";

    if (
      isNegatedExplicitPath(
        normalizedObjective,
        match.index,
      )
    ) {
      continue;
    }

    const normalizedValue =
      rawValue.replace(
        /[.,;:!?)}\]]+$/,
        "",
      );

    if (normalizedValue) {
      matches.push(
        normalizedValue,
      );
    }
  }

  return matches;
}

function buildIntentRules() {
  return [
    "AIOS must treat the Founder Objective as an intent, not merely as a file-edit instruction.",
    "The objective may describe a product idea, UX improvement, bug, workflow, capability, architecture change, or desired outcome.",
    "Do not require the Founder to know the repository structure.",
    "Do not require the Founder to provide implementation details when the objective is sufficiently understandable.",
    "Infer the smallest reasonable implementation boundary from the real repository.",
    "Preserve the existing product direction and existing architectural boundaries.",
    "When the objective is ambiguous but still safely actionable, choose the smallest reversible implementation that directly advances the stated outcome.",
    "Do not invent requirements that materially change the objective.",
    "Do not invent external services, credentials, permissions, dependencies, or product capabilities.",
    "If a required capability is genuinely unavailable or unsafe to infer, stop and block with a concrete reason.",
  ].join("\n");
}

function buildExecutionLoop() {
  return [
    "AIOS EXECUTION LOOP",
    "",
    "PHASE 1 - UNDERSTAND",
    "Translate the Founder Objective into a concrete intended outcome.",
    "Identify what should become different after successful execution.",
    "",
    "PHASE 2 - INSPECT",
    "Read the real GitHub repository before making implementation decisions.",
    "Use existing routes, components, services, types, APIs, storage, permissions, and design patterns whenever possible.",
    "",
    "PHASE 3 - PLAN",
    "Select the smallest coherent set of real repository files.",
    "Do not choose files merely because they are nearby.",
    "Do not invent paths.",
    "",
    "PHASE 4 - EXECUTE",
    "Generate precise SEARCH/REPLACE patches against the exact source that was read.",
    "Keep unrelated implementation unchanged.",
    "",
    "PHASE 5 - VALIDATE",
    "Validate source completeness, path safety, API compatibility, type compatibility, and the existing Autonomous Development Safety Gate before any write.",
    "",
    "PHASE 6 - DELIVER",
    "Write through the AIOS GitHub execution boundary.",
    "Read the written source back from GitHub.",
    "Capture the resulting commit SHA.",
    "",
    "PHASE 7 - VERIFY",
    "Verify the resulting commit through the existing Vercel production build verification.",
    "",
    "PHASE 8 - RECOVER",
    "If verification fails, inspect the actual failure and make the smallest safe repair.",
    "Do not restart the entire development process unnecessarily.",
    "Repeat the repair and verification loop within the configured safety limits.",
    "",
    "PHASE 9 - COMPLETE",
    "Only report completion when GitHub readback and final production verification have both passed.",
    "Otherwise preserve the blocked state and explain the concrete execution reason.",
  ].join("\n");
}

function buildOutcomeContract() {
  return [
    "FOUNDER OUTCOME CONTRACT",
    "",
    "Before implementation, AIOS should internally answer:",
    "1. What outcome is the Founder actually asking for?",
    "2. What existing AIOS capability should own that outcome?",
    "3. Which real repository files are responsible for that capability?",
    "4. What is the smallest implementation that moves the product toward the requested outcome?",
    "5. What existing behavior must remain unchanged?",
    "6. What evidence will prove that the implementation succeeded?",
    "",
    "The answers are internal execution context.",
    "They do not need to be exposed to the Founder unless they materially affect execution, safety, or verification.",
  ].join("\n");
}

function buildProgressPolicy() {
  return [
    "PROGRESS POLICY",
    "",
    "AIOS should behave as an execution system rather than a one-shot code generator.",
    "After each meaningful phase, preserve the current task state and continue from the latest verified state.",
    "Do not discard successful previous work merely because a later phase encounters an error.",
    "When a repair is required, operate on the latest real repository state.",
    "Never apply a patch against stale source after another autonomous write has changed the file.",
    "A successful intermediate commit may be used as the starting point for subsequent repair or continuation.",
    "Completion means the requested outcome has been implemented and independently verified, not merely that a patch was generated.",
  ].join("\n");
}

function buildTargetResolutionRules(
  mode: AutonomousDevelopmentPromptMode,
) {
  if (
    mode ===
    "EXPLICIT_TARGET_PATCH"
  ) {
    return [
      "The Founder Objective contains explicit repository paths.",
      "Treat those paths as the primary execution boundary.",
      "Read the exact target file(s) from the real GitHub repository.",
      "Do not perform recursive repository discovery when the explicit targets are sufficient.",
      "Do not ask the Founder to restate paths that are already present in the objective.",
    ].join("\n");
  }

  return [
    "The Founder Objective does not contain a complete explicit target path.",
    "Use the real repository index and the existing Planner to determine the smallest valid target set.",
    "Repository structure, existing types, interfaces, and current implementation are authoritative.",
    "Never invent repository paths.",
    "Do not assume that the first file matching the wording of the objective is necessarily the correct owner of the capability.",
  ].join("\n");
}

export function extractExplicitRepositoryPaths(
  objective: string,
) {
  return uniquePaths(
    extractRepositoryPathMatches(
      objective,
    ),
  );
}

export function extractExplicitRepositoryTargets(
  objective: string,
): AutonomousDevelopmentTarget[] {
  const paths =
    uniquePaths(
      extractRepositoryPathMatches(
        objective,
      ),
    );

  return resolveTargetOperations(
    objective,
    paths,
  );
}

export function buildAutonomousDevelopmentPrompt(
  input: AutonomousDevelopmentPromptInput,
) {
  const objective =
    normalizeObjective(
      input.objective,
    );

  const targetPaths =
    uniquePaths(
      input.targetPaths,
    );

  const resolvedTargets =
    targetPaths.length > 0
      ? resolveTargetOperations(
          objective,
          targetPaths,
          input.targetOperations,
        )
      : [];

  const targetText =
    resolvedTargets.length > 0
      ? resolvedTargets
          .map(
            (target) =>
              `${target.operation}: ${target.path}`,
          )
          .join(", ")
      : "AIOS must determine the smallest valid target files from the real repository.";

  const targetResolutionRules =
    buildTargetResolutionRules(
      input.mode,
    );

  return [
    "AIOS DEVELOPMENT PROMPT",
    "",
    "ROLE",
    "You are the internal development planner generated by AIOS.",
    "You are responsible for converting a Founder-level idea or development request into a safe executable development contract.",
    "You are not the final code writer.",
    "The final code must be generated only from the current real repository source.",
    "",
    "FOUNDER OBJECTIVE",
    objective,
    "",
    "EXECUTION MODE",
    input.mode,
    "",
    "TARGET PATHS",
    targetText,
    "",
    "INTENT INTERPRETATION",
    buildIntentRules(),
    "",
    "OUTCOME CONTRACT",
    buildOutcomeContract(),
    "",
    "TARGET RESOLUTION RULES",
    targetResolutionRules,
    "",
    buildExecutionLoop(),
    "",
    buildProgressPolicy(),
    "",
    "DEVELOPMENT CONTRACT",
    "1. Read the current real source before changing anything.",
    "2. Treat existing repository code as authoritative over assumptions.",
    "3. Never regenerate an entire large source file when a precise patch is sufficient.",
    "4. Generate minimal SEARCH/REPLACE operations against the exact current source.",
    "5. SEARCH text must come from the current real file and must be unique.",
    "5a. For CREATE targets, generate a complete source file without reading a nonexistent file.",
    "5b. For REPLACE targets, read the complete real source before generating the patch.",
    "6. Preserve existing APIs, data interfaces, types, routes, state logic, permissions, and unrelated functionality.",
    "7. Do not modify files outside the resolved target set.",
    "8. Do not add dependencies unless the Founder Objective explicitly requires them and the existing architecture cannot satisfy the objective.",
    "9. Reuse existing AIOS architecture before introducing new abstractions.",
    "10. Preserve multilingual behavior and existing product navigation unless the objective explicitly changes them.",
    "11. Preserve Founder-only security boundaries for internal development capabilities.",
    "12. Preserve the existing GitHub execution boundary: AIOS is the execution authority for autonomous repository writes.",
    "13. Keep implementation compatible with the existing Next.js application and WorkspaceShell/design system.",
    "14. Validate the final source before GitHub write.",
    "15. Run GitHub readback after every autonomous write.",
    "16. Run the existing Vercel production build verification after the final write.",
    "17. If Vercel reports a build failure, inspect the actual failure and repair the smallest affected target.",
    "18. Continue from the latest verified repository state during repair.",
    "19. Stop and block instead of inventing files, APIs, credentials, permissions, or unsupported capabilities.",
    "",
    "PATCH CONTRACT",
    "The code-generation stage must return only AIOS_PATCH_BEGIN / AIOS_PATCH_END blocks.",
    "Do not return a Markdown diff.",
    "Do not return placeholders, TODOs, ellipses, or omitted sections.",
    "",
    "REPLACE operation:",
    "The target file must already exist in the real repository.",
    "SEARCH must be copied exactly from the current real source.",
    "SEARCH must occur exactly once.",
    "SEARCH must not be empty.",
    "REPLACE must contain the complete intended replacement region.",
    "REPLACE must be complete, syntactically valid source for the replaced region.",
    "",
    "CREATE operation:",
    "The target path must be explicitly classified as a new file.",
    "The target file must not already exist in the real repository.",
    "Do not provide SEARCH text for a CREATE operation.",
    "REPLACE must contain the complete intended file source, not a partial patch.",
    "The source must be complete, syntactically valid, and free of protocol delimiters.",
    "Never overwrite an existing file through CREATE.",
    "Never treat a missing REPLACE target as CREATE.",
    "",
    "The parser validates the operation against the resolved target type, not merely the model-generated operation label.",
    "",
    "SAFETY CONTRACT",
    "All GitHub writes remain inside the Founder-authorized repository and main branch.",
    "The final source must pass the existing Autonomous Development Safety Gate.",
    "No autonomous execution may bypass the existing read, write, readback, or verification boundaries.",
    "",
    "VERIFICATION CONTRACT",
    "Real GitHub source -> intent interpretation -> repository inspection -> target planning -> minimal patch -> source validation -> safety gate -> AIOS GitHub write -> GitHub readback -> Vercel production verification -> repair if necessary -> completion.",
    "",
    "COMPLETION CONTRACT",
    "Do not declare success because code generation succeeded.",
    "Do not declare success because a GitHub commit exists.",
    "Do not declare success because a deployment exists.",
    "Declare success only after the requested development outcome has been implemented, the written source has been read back successfully, and the final commit has passed the existing production verification.",
  ].join("\n");
}
