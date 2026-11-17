import "server-only";

import {
  getObjectiveLengthError,
} from "@/lib/autonomous-development-objective-contract";

export type AutonomousDevelopmentPromptMode =
  | "EXPLICIT_TARGET_PATCH"
  | "PLANNED_PATCH";

export type AutonomousDevelopmentExecutionKind =
  | "PRODUCT_DEVELOPMENT"
  | "READ_ONLY_AUDIT";

const READ_ONLY_AUDIT_PATTERN =
  /\b(?:read[- ]?only|readonly|audit|auditing|inspection|inspect only|no writes?|do not write|without writing|non[- ]?mutating|report only|analysis only)\b/i;

export function isReadOnlyAuditObjective(
  objective: string,
) {
  return READ_ONLY_AUDIT_PATTERN.test(
    objective,
  );
}

export function resolveAutonomousDevelopmentExecutionKind(
  objective: string,
): AutonomousDevelopmentExecutionKind {
  return isReadOnlyAuditObjective(
    objective,
  )
    ? "READ_ONLY_AUDIT"
    : "PRODUCT_DEVELOPMENT";
}

export type AutonomousDevelopmentPromptInput = {
  objective: string;
  targetPaths: string[];
  mode: AutonomousDevelopmentPromptMode;
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

export function buildAutonomousDevelopmentPrompt(
  input: AutonomousDevelopmentPromptInput,
) {
  const objective =
    normalizeObjective(
      input.objective,
    );

  const executionKind =
    resolveAutonomousDevelopmentExecutionKind(
      objective,
    );

  if (
    executionKind ===
    "READ_ONLY_AUDIT"
  ) {
    return [
      "AIOS READ-ONLY AUDIT PROMPT",
      "",
      "ROLE",
      "You are the internal read-only engineering auditor generated by AIOS.",
      "You produce an audit report only.",
      "You do not modify repository files.",
      "You do not create commits.",
      "You do not perform GitHub writes.",
      "",
      "FOUNDER OBJECTIVE",
      objective,
      "",
      "EXECUTION KIND",
      executionKind,
      "",
      "AUDIT CONTRACT",
      "1. Read the real repository source before drawing conclusions.",
      "2. Treat existing repository code as authoritative over assumptions.",
      "3. Do not generate SEARCH/REPLACE patches.",
      "4. Do not propose autonomous repository writes.",
      "5. Do not claim GitHub Readback PASS.",
      "6. Do not claim Build Verification PASS.",
      "7. Do not claim production deployment verification.",
      "8. Produce a complete, human-readable audit report.",
      "9. The report must be non-empty and must describe actual findings.",
      "10. If the audit cannot be completed, state AUDIT_BLOCKED or AUDIT_INCOMPLETE with a concrete reason.",
      "11. Preserve Founder-only access boundaries.",
      "12. Never fabricate commit SHAs, verification evidence, or deployment status.",
      "",
      "AUDIT RESULT STATES",
      "AUDIT_COMPLETE - the audit report was produced successfully.",
      "AUDIT_BLOCKED - the audit could not proceed for a concrete reason.",
      "AUDIT_INCOMPLETE - the audit started but could not be fully completed.",
      "",
      "DELIVERY CONTRACT",
      "Return the full audit report as the response body.",
      "Empty reports are rejected.",
      "Report delivery does not require a GitHub commit.",
    ].join("\n");
  }

  const targetPaths =
    uniquePaths(
      input.targetPaths,
    );

  const targetText =
    targetPaths.length > 0
      ? targetPaths.join(", ")
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
    "Do not return a complete file.",
    "Do not return a Markdown diff.",
    "Do not return placeholders, TODOs, ellipses, or omitted sections.",
    "SEARCH must be copied exactly from the current real source.",
    "SEARCH must occur exactly once.",
    "REPLACE must be complete, syntactically valid source for the replaced region.",
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
