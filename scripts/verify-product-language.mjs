import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const TARGET_DIRS = [
  "app",
  "components",
  "lib",
];

const EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
]);

const failures = [];
const warnings = [];

function walk(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  const entries = fs.readdirSync(dir, {
    withFileTypes: true,
  });

  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }

    if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }

  return files;
}

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function relative(file) {
  return path.relative(ROOT, file);
}

function fail(file, message) {
  failures.push(
    `${relative(file)}: ${message}`,
  );
}

function warn(file, message) {
  warnings.push(
    `${relative(file)}: ${message}`,
  );
}

/**
 * C143.21.4
 *
 * AIOS Product Language Regression Guard
 *
 * Purpose:
 *
 * 1. Prevent known mechanical translations from returning.
 * 2. Detect mixed-language product UI phrases.
 * 3. Protect the canonical product-language layer.
 * 4. Keep technical identifiers intact.
 * 5. Never treat user-generated content as product-language violations.
 *
 * This is a regression guard, not a translation engine.
 */

const files = TARGET_DIRS.flatMap((dir) =>
  walk(path.join(ROOT, dir)),
);

/*
 * ---------------------------------------------------------------------------
 * Known forbidden mechanical product wording
 * ---------------------------------------------------------------------------
 */

const forbiddenProductPhrases = [
  {
    phrase: "运行在线",
    message:
      'Use native Chinese product wording such as "运行正常".',
  },
  {
    phrase: "运行离线",
    message:
      'Use native Chinese product wording such as "运行已离线".',
  },
  {
    phrase: "服务提供方",
    message:
      'Use the established AIOS product wording "模型服务".',
  },
  {
    phrase: "ランタイム状態",
    message:
      'Use the established Japanese product wording "ランタイムの状態".',
  },
  {
    phrase: "タスク标题",
    message:
      'Use the established Japanese product wording "タスク名".',
  },
];

for (const file of files) {
  const source = read(file);

  /*
   * The canonical correction map itself is allowed to contain
   * legacy phrases because it exists specifically to correct them.
   */
  const isCanonicalLanguageFile =
    file.endsWith(
      path.join(
        "lib",
        "i18n",
        "product-language.ts",
      ),
    );

  if (!isCanonicalLanguageFile) {
    for (const rule of forbiddenProductPhrases) {
      if (source.includes(rule.phrase)) {
        fail(
          file,
          `Forbidden legacy product wording detected: "${rule.phrase}". ${rule.message}`,
        );
      }
    }
  }

  /*
   * -------------------------------------------------------------------------
   * Mixed-language UI artifacts
   * -------------------------------------------------------------------------
   *
   * These patterns are intentionally narrow. They target known product
   * terminology rather than arbitrary multilingual text.
   */

  const mixedLanguagePatterns = [
    {
      pattern: /当前\s+Provider/u,
      message:
        'Mixed Chinese/English product phrase "当前 Provider" detected. Prefer "当前模型服务".',
    },
    {
      pattern: /現在の\s+Provider/u,
      message:
        'Mixed Japanese/English product phrase "現在の Provider" detected. Prefer "現在のプロバイダー".',
    },
    {
      pattern: /运行\s+Online/u,
      message:
        'Mixed Chinese/English runtime status detected.',
    },
    {
      pattern: /运行\s+Offline/u,
      message:
        'Mixed Chinese/English runtime status detected.',
    },
  ];

  for (const rule of mixedLanguagePatterns) {
    if (rule.pattern.test(source)) {
      fail(file, rule.message);
    }
  }

  /*
   * -------------------------------------------------------------------------
   * Japanese Chinese-character contamination
   * -------------------------------------------------------------------------
   *
   * Only inspect obvious locale declarations.
   */

  const japaneseBlocks = [
    ...source.matchAll(
      /\bja\s*:\s*\{([\s\S]*?)\n\s*\}/g,
    ),
  ];

  for (const match of japaneseBlocks) {
    const block = match[1];

    const forbiddenArtifacts = [
      "任务",
      "项目",
      "设置",
      "运行时",
      "加载中",
      "处理中",
      "刷新",
      "当前",
      "标题",
      "说明",
      "进行中",
    ];

    for (const artifact of forbiddenArtifacts) {
      if (block.includes(artifact)) {
        fail(
          file,
          `Japanese locale contains Chinese UI artifact: "${artifact}".`,
        );
      }
    }
  }

  /*
   * -------------------------------------------------------------------------
   * English CJK contamination
   * -------------------------------------------------------------------------
   */

  const englishBlocks = [
    ...source.matchAll(
      /\ben\s*:\s*\{([\s\S]*?)\n\s*\}/g,
    ),
  ];

  for (const match of englishBlocks) {
    const block = match[1];

    if (
      /[\u4e00-\u9fff\u3040-\u30ff]/u.test(
        block,
      )
    ) {
      fail(
        file,
        "English locale block contains CJK UI text.",
      );
    }
  }
}

/*
 * ---------------------------------------------------------------------------
 * Canonical terminology integrity
 * ---------------------------------------------------------------------------
 */

const canonicalFile = path.join(
  ROOT,
  "lib",
  "i18n",
  "product-language.ts",
);

if (!fs.existsSync(canonicalFile)) {
  fail(
    canonicalFile,
    "Canonical product-language.ts is missing.",
  );
} else {
  const source = read(canonicalFile);

  const requiredCanonicalPairs = [
    [
      "runtimeOnline",
      "运行正常",
    ],
    [
      "runtimeOffline",
      "运行已离线",
    ],
    [
      "runtimeStatus",
      "运行状态",
    ],
    [
      "provider",
      "模型服务",
    ],
    [
      "activeProvider",
      "当前模型服务",
    ],
    [
      "taskTitle",
      "任务标题",
    ],
    [
      "taskDescription",
      "任务说明",
    ],
  ];

  for (const [key, value] of requiredCanonicalPairs) {
    const keyPattern =
      new RegExp(
        `${key}\\s*:\\s*\\{[\\s\\S]*?["']zh-CN["']\\s*:\\s*["']${value}["']`,
      );

    if (!keyPattern.test(source)) {
      fail(
        canonicalFile,
        `Canonical Chinese terminology missing or changed: ${key} → ${value}`,
      );
    }
  }

  const requiredJapanesePairs = [
    [
      "runtimeOnline",
      "ランタイム稼働中",
    ],
    [
      "runtimeOffline",
      "ランタイム停止中",
    ],
    [
      "runtimeStatus",
      "ランタイムの状態",
    ],
    [
      "provider",
      "プロバイダー",
    ],
    [
      "taskTitle",
      "タスク名",
    ],
  ];

  for (const [key, value] of requiredJapanesePairs) {
    const keyPattern =
      new RegExp(
        `${key}\\s*:\\s*\\{[\\s\\S]*?ja\\s*:\\s*["']${value}["']`,
      );

    if (!keyPattern.test(source)) {
      fail(
        canonicalFile,
        `Canonical Japanese terminology missing or changed: ${key} → ${value}`,
      );
    }
  }
}

/*
 * ---------------------------------------------------------------------------
 * Legacy localizer awareness
 * ---------------------------------------------------------------------------
 *
 * LegacyPageLocalizer may intentionally contain old phrases because it
 * maintains compatibility mappings. This is not automatically a failure.
 *
 * Instead, report it as an informational warning so future cleanup can
 * progressively reduce legacy dependence without breaking the runtime.
 */

const legacyFile = path.join(
  ROOT,
  "components",
  "i18n",
  "LegacyPageLocalizer.tsx",
);

if (fs.existsSync(legacyFile)) {
  const source = read(legacyFile);

  const legacyPhraseCount =
    forbiddenProductPhrases.filter(
      ({ phrase }) =>
        source.includes(phrase),
    ).length;

  if (legacyPhraseCount > 0) {
    warn(
      legacyFile,
      `${legacyPhraseCount} legacy product-language phrase(s) remain in the compatibility localizer. Runtime normalization is currently responsible for canonical correction.`,
    );
  }
}

/*
 * ---------------------------------------------------------------------------
 * Result
 * ---------------------------------------------------------------------------
 */

console.log("");

if (warnings.length > 0) {
  console.log(
    "AIOS Product Language Regression Guard: WARN",
  );

  for (const warning of warnings) {
    console.log(`⚠ ${warning}`);
  }

  console.log("");
}

if (failures.length > 0) {
  console.error(
    "AIOS Product Language Regression Guard: FAILED",
  );

  console.error("");

  for (const failure of failures) {
    console.error(`✗ ${failure}`);
  }

  console.error("");

  process.exit(1);
}

console.log(
  "AIOS Product Language Regression Guard: PASS",
);

console.log(
  "✓ Canonical English / Simplified Chinese / Japanese product terminology is protected.",
);

console.log(
  "✓ Known mechanical-translation regressions are blocked.",
);

console.log(
  "✓ Mixed-language product artifacts are blocked.",
);

console.log(
  "✓ User-generated content is outside this static guard.",
);

console.log("");
