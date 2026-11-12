/**
 * C170.3 Security Boundary
 *
 * Scans all engineering prompt content before external provider dispatch.
 * Never returns or logs matched secret values.
 *
 * C170.5.5:
 * Adds safe source-location diagnostics without weakening detection.
 */

const SECRET_PATTERNS = Object.freeze([
  {
    id: "PEM_PRIVATE_KEY",
    expression:
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/i,
  },
  {
    id: "GITHUB_TOKEN",
    expression:
      /\b(?:gh[pousr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})\b/,
  },
  {
    id: "AWS_ACCESS_KEY",
    expression: /\bAKIA[0-9A-Z]{16}\b/,
  },
  {
    id: "OPENAI_STYLE_KEY",
    expression: /\b(?:sk|rk)-[A-Za-z0-9_-]{20,}\b/,
  },
  {
    id: "GOOGLE_API_KEY",
    expression: /\bAIza[0-9A-Za-z_-]{30,}\b/,
  },
  {
    id: "SLACK_TOKEN",
    expression: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/,
  },
  {
    id: "BEARER_TOKEN",
    expression:
      /\bBearer\s+[A-Za-z0-9._~+/=-]{16,}/i,
  },
  {
    id: "JWT",
    expression:
      /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/,
  },
]);

const ASSIGNMENT_PATTERN =
  /(?:["']?)(?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|passwd|private[_-]?key|secret)(?:["']?)\s*[:=]\s*(?:\\?"([^"\\\r\n]{8,})\\?"|'([^'\r\n]{8,})')/gi;

const PLACEHOLDER_VALUES = new Set([
  "your_api_key",
  "your-api-key",
  "your_token",
  "your-secret",
  "your_password",
  "replace_me",
  "replace-me",
  "change_me",
  "change-me",
  "changeme",
  "placeholder",
  "example",
  "example_key",
  "example-token",
  "test_key",
  "test-token",
  "test-secret",
  "test-oidc-token",
  "redacted",
  "[redacted]",
  "undefined",
  "null",
  "none",
]);

const MAX_SCAN_DEPTH = 64;
const MAX_SCAN_NODES = 50000;
const MAX_DIAGNOSTIC_LOCATIONS = 10;

function toScanText(value) {
  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value) ?? String(value);
  } catch {
    return String(value);
  }
}

function safePathSegment(value) {
  const key = String(value);

  if (
    key.length > 80 ||
    !/^[A-Za-z0-9_.@/-]+$/.test(key)
  ) {
    return "<key>";
  }

  return key;
}

/**
 * Collects raw strings with safe structural locations.
 *
 * Object keys are sanitized before they enter diagnostics.
 * String values are never included in diagnostic paths.
 */
function collectRawStringValues(value) {
  const strings = [];
  const visited = new WeakSet();

  let visitedNodes = 0;

  function visit(current, depth, location) {
    if (visitedNodes >= MAX_SCAN_NODES) {
      return;
    }

    visitedNodes += 1;

    if (typeof current === "string") {
      strings.push({
        value: current,
        location,
      });

      return;
    }

    if (
      current === null ||
      typeof current !== "object" ||
      depth >= MAX_SCAN_DEPTH
    ) {
      return;
    }

    if (visited.has(current)) {
      return;
    }

    visited.add(current);

    let keys;

    try {
      keys = Object.keys(current);
    } catch {
      return;
    }

    for (const key of keys) {
      if (visitedNodes >= MAX_SCAN_NODES) {
        break;
      }

      let child;

      try {
        child = current[key];
      } catch {
        continue;
      }

      const segment = Array.isArray(current)
        ? `[${key}]`
        : `[${safePathSegment(key)}]`;

      visit(
        child,
        depth + 1,
        `${location}${segment}`,
      );
    }
  }

  visit(value, 0, "$");

  return strings;
}

function isPlaceholder(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!normalized) {
    return true;
  }

  if (PLACEHOLDER_VALUES.has(normalized)) {
    return true;
  }

  return (
    normalized.startsWith("your-") ||
    normalized.startsWith("your_") ||
    normalized.startsWith("<") ||
    normalized.startsWith("${") ||
    normalized.startsWith("process.env.") ||
    normalized.startsWith("env.")
  );
}

function addFinding(
  findings,
  type,
  location,
) {
  const key = `${type}:${location}`;

  if (
    findings.some(
      (finding) =>
        `${finding.type}:${finding.location}` === key,
    )
  ) {
    return;
  }

  findings.push({
    type,
    location,
  });
}

/**
 * Returns metadata only.
 *
 * Findings contain:
 * - detection type
 * - safe structural source location
 *
 * Secret values are never returned.
 */
export function scanForEngineeringSecrets(value) {
  const serializedSource = toScanText(value);
  const rawStringSources = collectRawStringValues(value);

  // Scan raw strings first to prefer precise source locations.
  // The serialized representation remains included to preserve
  // the original whole-payload detection boundary.
  const sources = [
    ...rawStringSources.map((item) => ({
      text: item.value,
      location: item.location,
    })),
    {
      text: serializedSource,
      location: "$serialized",
    },
  ];

  const findings = [];

  for (const pattern of SECRET_PATTERNS) {
    const matchedLocations = new Set();

    for (const source of sources) {
      pattern.expression.lastIndex = 0;

      if (pattern.expression.test(source.text)) {
        matchedLocations.add(source.location);
      }

      pattern.expression.lastIndex = 0;

      if (
        matchedLocations.size >=
        MAX_DIAGNOSTIC_LOCATIONS
      ) {
        break;
      }
    }

    for (const location of matchedLocations) {
      addFinding(
        findings,
        pattern.id,
        location,
      );
    }
  }

  const assignmentLocations = new Set();

  for (const source of sources) {
    ASSIGNMENT_PATTERN.lastIndex = 0;

    let assignmentMatch;

    while (
      (assignmentMatch = ASSIGNMENT_PATTERN.exec(
        source.text,
      )) !== null
    ) {
      const candidate =
        assignmentMatch[1] ??
        assignmentMatch[2] ??
        "";

      if (!isPlaceholder(candidate)) {
        assignmentLocations.add(source.location);
        break;
      }
    }

    if (
      assignmentLocations.size >=
      MAX_DIAGNOSTIC_LOCATIONS
    ) {
      break;
    }
  }

  ASSIGNMENT_PATTERN.lastIndex = 0;

  for (const location of assignmentLocations) {
    addFinding(
      findings,
      "SENSITIVE_ASSIGNMENT",
      location,
    );
  }

  return {
    safe: findings.length === 0,
    findings,
  };
}

/**
 * Must run on the exact user prompt immediately before provider dispatch.
 *
 * Fail closed:
 * - no configurable bypass
 * - no secret-value logging
 * - diagnostic locations only
 */
export function assertNoSecretsBeforeProviderDispatch(value) {
  const result = scanForEngineeringSecrets(value);

  if (!result.safe) {
    const diagnosticSummary = result.findings
      .map(
        (finding) =>
          `${finding.type} at ${finding.location}`,
      )
      .join("; ");

    const error = new Error(
      [
        "Engineering provider dispatch blocked by the secret security guard.",
        `Safe diagnostics: ${diagnosticSummary}`,
      ].join(" "),
    );

    error.code =
      "AIOS_ENGINEERING_SECRET_SCAN_BLOCKED";

    error.findings = result.findings.map(
      (finding) => ({
        type: finding.type,
        location: finding.location,
      }),
    );

    throw error;
  }

  return {
    safe: true,
    scanned: true,
  };
}
