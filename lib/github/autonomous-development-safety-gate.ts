import "server-only";

type SafetyGateInput = {
  objective: string;
  targetPaths: string[];
  originalContents: Record<string, string>;
  patchedContents: Record<string, string>;
};

type SafetyGateChecks = {
  paths: boolean;
  sourceIntegrity: boolean;
  patchChange: boolean;
  i18nContracts: boolean;
  dangerousMarkers: boolean;
};

export type AutonomousDevelopmentSafetyGateResult = {
  passed: boolean;
  code:
    | "AUTONOMOUS_SAFETY_GATE_PASS"
    | "AUTONOMOUS_SAFETY_GATE_BLOCKED";
  reason: string;
  checks: SafetyGateChecks;
  errors: string[];
};

const MAX_FILES = 6;
const MAX_FILE_SIZE = 200000;
const MAX_OBJECTIVE_LENGTH = 4000;

const ALLOWED_PREFIXES = [
  "app/",
  "components/",
  "docs/",
  "lib/",
  "scripts/",
  "tests/",
  "test/",
  "public/",
  "styles/",
];

const FORBIDDEN_PATHS = [
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "vercel.json",
];

function normalizePath(value: string): string {
  return value
    .trim()
    .replace(/^\/+/, "")
    .replace(/\\+/g, "/");
}

function isSafePath(path: string): boolean {
  const normalized = normalizePath(path);

  if (!normalized) {
    return false;
  }

  if (
    normalized.includes("..") ||
    normalized.includes("\0") ||
    normalized.startsWith(".git/") ||
    normalized.startsWith(".env") ||
    normalized.startsWith(".github/")
  ) {
    return false;
  }

  if (FORBIDDEN_PATHS.includes(normalized)) {
    return false;
  }

  return ALLOWED_PREFIXES.some((prefix) =>
    normalized.startsWith(prefix),
  );
}

function hasDangerousMarkers(content: string): boolean {
  const markers = [
    "SEARCH_END_REPLACE",
    "SEARCH_END_REPLACE_BEGIN",
    "REPLACE_END_REPLACE",
    "OMITTED " + "FOR BREVITY",
    "TRUNC" + "ATED",
    "PLACEHOLDER",
    "TODO_REPLACE",
    "AIOS_PATCH_" + "BEGIN",
    "AIOS_PATCH_" + "END",
  ];

  return markers.some((marker) =>
    content.includes(marker),
  );
}

function hasBalancedSource(content: string): boolean {
  type Delimiter = "{" | "(" | "[";

  function isOpeningDelimiter(
    value: string,
  ): value is Delimiter {
    return (
      value === "{" ||
      value === "(" ||
      value === "["
    );
  }

  function expectedOpeningDelimiter(
    value: string,
  ): Delimiter {
    if (value === "}") {
      return "{";
    }

    if (value === ")") {
      return "(";
    }

    return "[";
  }

  function scanQuotedString(
    start: number,
    quote: "'" | "\"",
  ): number {
    let index = start + 1;

    while (index < content.length) {
      const current = content[index];

      if (current === "\\") {
        index += 2;
        continue;
      }

      if (current === quote) {
        return index + 1;
      }

      if (
        current === "\n" ||
        current === "\r"
      ) {
        return -1;
      }

      index += 1;
    }

    return -1;
  }

  function scanBlockComment(
    start: number,
  ): number {
    let index = start + 2;

    while (index < content.length) {
      if (
        content[index] === "*" &&
        content[index + 1] === "/"
      ) {
        return index + 2;
      }

      index += 1;
    }

    return -1;
  }

  function scanLineComment(
    start: number,
  ): number {
    let index = start + 2;

    while (index < content.length) {
      if (
        content[index] === "\n" ||
        content[index] === "\r"
      ) {
        return index;
      }

      index += 1;
    }

    return content.length;
  }

  function scanTemplate(
    start: number,
  ): number {
    let index = start + 1;

    while (index < content.length) {
      const current = content[index];

      if (current === "\\") {
        index += 2;
        continue;
      }

      if (current === "`") {
        return index + 1;
      }

      if (
        current === "$" &&
        content[index + 1] === "{"
      ) {
        const expressionEnd =
          scanTemplateExpression(index + 2);

        if (expressionEnd < 0) {
          return -1;
        }

        index = expressionEnd;
        continue;
      }

      index += 1;
    }

    return -1;
  }

  function scanTemplateExpression(
    start: number,
  ): number {
    const stack: Delimiter[] = ["{"];
    let index = start;

    while (index < content.length) {
      const current = content[index];
      const next = content[index + 1];

      if (
        current === "/" &&
        next === "/"
      ) {
        index = scanLineComment(index);
        continue;
      }

      if (
        current === "/" &&
        next === "*"
      ) {
        index = scanBlockComment(index);

        if (index < 0) {
          return -1;
        }

        continue;
      }

      if (
        current === "'" ||
        current === "\""
      ) {
        index = scanQuotedString(
          index,
          current,
        );

        if (index < 0) {
          return -1;
        }

        continue;
      }

      if (current === "`") {
        index = scanTemplate(index);

        if (index < 0) {
          return -1;
        }

        continue;
      }

      if (isOpeningDelimiter(current)) {
        stack.push(current);
        index += 1;
        continue;
      }

      if (
        current === "}" ||
        current === ")" ||
        current === "]"
      ) {
        const expected =
          expectedOpeningDelimiter(
            current,
          );

        if (
          stack[stack.length - 1] !==
          expected
        ) {
          return -1;
        }

        stack.pop();
        index += 1;

        if (stack.length === 0) {
          return index;
        }

        continue;
      }

      index += 1;
    }

    return -1;
  }

  const stack: Delimiter[] = [];
  let index = 0;

  while (index < content.length) {
    const current = content[index];
    const next = content[index + 1];

    if (
      current === "/" &&
      next === "/"
    ) {
      index = scanLineComment(index);
      continue;
    }

    if (
      current === "/" &&
      next === "*"
    ) {
      index = scanBlockComment(index);

      if (index < 0) {
        return false;
      }

      continue;
    }

    if (
      current === "'" ||
      current === "\""
    ) {
      index = scanQuotedString(
        index,
        current,
      );

      if (index < 0) {
        return false;
      }

      continue;
    }

    if (current === "`") {
      index = scanTemplate(index);

      if (index < 0) {
        return false;
      }

      continue;
    }

    if (isOpeningDelimiter(current)) {
      stack.push(current);
      index += 1;
      continue;
    }

    if (
      current === "}" ||
      current === ")" ||
      current === "]"
    ) {
      const expected =
        expectedOpeningDelimiter(
          current,
        );

      if (
        stack[stack.length - 1] !==
        expected
      ) {
        return false;
      }

      stack.pop();
      index += 1;
      continue;
    }

    index += 1;
  }

  return stack.length === 0;
}

function extractTranslationKeys(
  content: string,
): string[] {
  const keys = new Set<string>();

  const patterns = [
    /\bt$begin:math:text$\\s\*\"\(\[\^\"\]\+\)\"\\s\*$end:math:text$/g,
    /\bt$begin:math:text$\\s\*\'\(\[\^\'\]\+\)\'\\s\*$end:math:text$/g,
    /\btranslate$begin:math:text$\\s\*\[\^\,\]\+\,\\s\*\"\(\[\^\"\]\+\)\"\\s\*$end:math:text$/g,
    /\btranslate$begin:math:text$\\s\*\[\^\,\]\+\,\\s\*\'\(\[\^\'\]\+\)\'\\s\*$end:math:text$/g,
  ];

  for (const pattern of patterns) {
    let match: RegExpExecArray | null = null;

    while (
      (match = pattern.exec(content)) !== null
    ) {
      const key = match[1]?.trim();

      if (key) {
        keys.add(key);
      }
    }
  }

  return Array.from(keys);
}

function extractDeclaredTranslationKeys(
  content: string,
): Set<string> {
  const keys = new Set<string>();

  const doubleQuotePattern =
    /"([^"]+)"\s*:/g;

  const singleQuotePattern =
    /'([^']+)'\s*:/g;

  const collect = (
    pattern: RegExp,
  ) => {
    let match: RegExpExecArray | null = null;

    while (
      (match = pattern.exec(content)) !== null
    ) {
      const key = match[1]?.trim();

      if (
        key &&
        key.includes(".")
      ) {
        keys.add(key);
      }
    }
  };

  collect(doubleQuotePattern);
  collect(singleQuotePattern);

  return keys;
}

function validateI18nContracts(
  patchedContents: Record<string, string>,
): {
  passed: boolean;
  errors: string[];
} {
  const i18nPath =
    "lib/i18n/index.ts";

  const i18nContent =
    patchedContents[i18nPath];

  if (
    typeof i18nContent !==
    "string"
  ) {
    return {
      passed: true,
      errors: [],
    };
  }

  const declared =
    extractDeclaredTranslationKeys(
      i18nContent,
    );

  const errors: string[] = [];

  for (
    const [path, content] of Object.entries(
      patchedContents,
    )
  ) {
    if (path === i18nPath) {
      continue;
    }

    const referenced =
      extractTranslationKeys(
        content,
      );

    for (const key of referenced) {
      if (!declared.has(key)) {
        errors.push(
          `AIOS_I18N_CONTRACT_MISSING: ${path} references "${key}" but lib/i18n/index.ts does not declare it.`,
        );
      }
    }
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}

function validatePaths(
  targetPaths: string[],
  originalContents: Record<string, string>,
  patchedContents: Record<string, string>,
): {
  passed: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (
    targetPaths.length === 0 ||
    targetPaths.length > MAX_FILES
  ) {
    errors.push(
      `AIOS_SAFETY_TARGET_COUNT_INVALID: ${targetPaths.length}`,
    );
  }

  const uniquePaths =
    new Set<string>();

  for (
    const rawPath of targetPaths
  ) {
    const path =
      normalizePath(rawPath);

    if (!isSafePath(path)) {
      errors.push(
        `AIOS_SAFETY_PATH_REJECTED: ${path}`,
      );
    }

    if (
      uniquePaths.has(path)
    ) {
      errors.push(
        `AIOS_SAFETY_DUPLICATE_PATH: ${path}`,
      );
    }

    uniquePaths.add(path);

    if (
      !(path in originalContents)
    ) {
      errors.push(
        `AIOS_SAFETY_ORIGINAL_MISSING: ${path}`,
      );
    }

    if (
      !(path in patchedContents)
    ) {
      errors.push(
        `AIOS_SAFETY_PATCHED_MISSING: ${path}`,
      );
    }
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}

function validateSources(
  targetPaths: string[],
  originalContents: Record<string, string>,
  patchedContents: Record<string, string>,
): {
  passed: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (
    const rawPath of targetPaths
  ) {
    const path =
      normalizePath(rawPath);

    const original =
      originalContents[path];

    const patched =
      patchedContents[path];

    if (
      typeof patched !== "string" ||
      !patched.trim()
    ) {
      errors.push(
        `AIOS_SAFETY_SOURCE_EMPTY: ${path}`,
      );
      continue;
    }

    if (
      patched.length >
      MAX_FILE_SIZE
    ) {
      errors.push(
        `AIOS_SAFETY_SOURCE_TOO_LARGE: ${path}`,
      );
    }

    if (
      hasDangerousMarkers(patched)
    ) {
      errors.push(
        `AIOS_SAFETY_DANGEROUS_MARKER: ${path}`,
      );
    }

    if (
      !hasBalancedSource(patched)
    ) {
      errors.push(
        `AIOS_SAFETY_SOURCE_UNBALANCED: ${path}`,
      );
    }

    if (
      typeof original !== "string"
    ) {
      errors.push(
        `AIOS_SAFETY_ORIGINAL_INVALID: ${path}`,
      );
      continue;
    }

    if (
      patched === original
    ) {
      errors.push(
        `AIOS_SAFETY_NO_CHANGE: ${path}`,
      );
    }
  }

  return {
    passed: errors.length === 0,
    errors,
  };
}

function validateObjective(
  objective: string,
): string | null {
  const normalized =
    objective.trim();

  if (!normalized) {
    return "AIOS_SAFETY_OBJECTIVE_EMPTY";
  }

  if (
    normalized.length >
    MAX_OBJECTIVE_LENGTH
  ) {
    return "AIOS_SAFETY_OBJECTIVE_TOO_LARGE";
  }

  return null;
}

function buildChecks(
  pathResult: {
    passed: boolean;
    errors: string[];
  },
  sourceResult: {
    passed: boolean;
    errors: string[];
  },
  i18nResult: {
    passed: boolean;
    errors: string[];
  },
): SafetyGateChecks {
  return {
    paths:
      pathResult.passed,
    sourceIntegrity:
      sourceResult.passed,
    patchChange:
      sourceResult.passed,
    i18nContracts:
      i18nResult.passed,
    dangerousMarkers:
      !sourceResult.errors.some(
        (error) =>
          error.includes(
            "AIOS_SAFETY_DANGEROUS_MARKER",
          ),
      ),
  };
}

export function runAutonomousDevelopmentSafetyGate(
  input: SafetyGateInput,
): AutonomousDevelopmentSafetyGateResult {
  const errors: string[] = [];

  const objectiveError =
    validateObjective(
      input.objective,
    );

  if (objectiveError) {
    errors.push(objectiveError);
  }

  const pathResult =
    validatePaths(
      input.targetPaths,
      input.originalContents,
      input.patchedContents,
    );

  errors.push(
    ...pathResult.errors,
  );

  const sourceResult =
    validateSources(
      input.targetPaths,
      input.originalContents,
      input.patchedContents,
    );

  errors.push(
    ...sourceResult.errors,
  );

  const i18nResult =
    validateI18nContracts(
      input.patchedContents,
    );

  errors.push(
    ...i18nResult.errors,
  );

  const checks =
    buildChecks(
      pathResult,
      sourceResult,
      i18nResult,
    );

  const passed =
    errors.length === 0;

  return {
    passed,
    code: passed
      ? "AUTONOMOUS_SAFETY_GATE_PASS"
      : "AUTONOMOUS_SAFETY_GATE_BLOCKED",
    reason: passed
      ? "Autonomous development safety gate passed."
      : errors[0] ||
        "Autonomous development safety gate blocked the change.",
    checks,
    errors,
  };
}
