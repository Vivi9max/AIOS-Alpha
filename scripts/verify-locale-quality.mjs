import fs from "node:fs";
import path from "node:path";
const ROOT = process.cwd();
const TARGET_DIRS = [
  "app",
  "components",
  "lib/i18n",
];
const EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
]);
const failures = [];
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
function addFailure(file, message) {
  failures.push(
    `${path.relative(ROOT, file)}: ${message}`,
  );
}
/*
 * C143.21.1
 *
 * AIOS Locale Quality Guard
 *
 * This is intentionally a semantic-quality guard rather than
 * a generic translation checker.
 *
 * Principle:
 * - English should read like native product UI.
 * - Simplified Chinese should read like native Chinese product UI.
 * - Japanese should read like native Japanese software/SaaS UI.
 *
 * This guard does not attempt to judge every sentence.
 * It catches known classes of locale contamination and
 * known mechanical-translation regressions.
 */
const files = TARGET_DIRS.flatMap((dir) =>
  walk(path.join(ROOT, dir)),
);
for (const file of files) {
  const source = read(file);
  /*
   * English locale blocks should not contain CJK text.
   *
   * Technical identifiers and locale labels are intentionally
   * excluded from this check by limiting the scan to common
   * locale-table patterns.
   */
  const englishBlocks = [
    ...source.matchAll(
      /\ben\s*:\s*\{([\s\S]*?)\n\s*\}/g,
    ),
  ];
  for (const match of englishBlocks) {
    const block = match[1];
    if (/[\u4e00-\u9fff\u3040-\u30ff]/u.test(block)) {
      addFailure(
        file,
        "English locale block contains CJK characters.",
      );
    }
  }
  /*
   * Japanese locale blocks should not contain Simplified Chinese
   * product wording that is clearly a Chinese UI artifact.
   */
  const japaneseBlocks = [
    ...source.matchAll(
      /\bja\s*:\s*\{([\s\S]*?)\n\s*\}/g,
    ),
  ];
  for (const match of japaneseBlocks) {
    const block = match[1];
    const forbiddenJapaneseArtifacts = [
      "任务",
      "项目",
      "设置",
      "运行时",
      "加载中",
      "处理中",
      "刷新",
      "当前",
      "成功",
      "失败",
      "错误",
      "未知",
      "暂无",
      "已完成",
      "进行中",
      "标题",
      "说明",
    ];
    for (const artifact of forbiddenJapaneseArtifacts) {
      if (block.includes(artifact)) {
        addFailure(
          file,
          `Japanese locale contains Chinese UI artifact: ${artifact}`,
        );
      }
    }
  }
  /*
   * Known mechanical translations that should never become
   * the canonical Chinese/Japanese product wording.
   */
  const mechanicalPatterns = [
    {
      pattern: /"zh-CN"\s*:\s*"运行在线"/g,
      message:
        'Mechanical Chinese runtime wording detected: "运行在线". Prefer context-native wording such as "运行正常".',
    },
    {
      pattern: /"zh-CN"\s*:\s*"运行离线"/g,
      message:
        'Mechanical Chinese runtime wording detected: "运行离线".',
    },
    {
      pattern: /ja\s*:\s*"ランタイム状態"/g,
      message:
        'Mechanical Japanese wording detected: "ランタイム状態". Review against the actual Japanese product context.',
    },
  ];
  for (const rule of mechanicalPatterns) {
    if (rule.pattern.test(source)) {
      addFailure(file, rule.message);
    }
  }
}
/*
 * Explicitly verify the three supported product locales remain present.
 */
const i18nIndex = path.join(
  ROOT,
  "lib/i18n/index.ts",
);
if (fs.existsSync(i18nIndex)) {
  const source = read(i18nIndex);
  for (const locale of [
    "en",
    "zh-CN",
    "ja",
  ]) {
    if (!source.includes(`"${locale}"`) &&
        !source.includes(`${locale}:`)) {
      addFailure(
        i18nIndex,
        `Supported locale is missing: ${locale}`,
      );
    }
  }
}
if (failures.length > 0) {
  console.error("");
  console.error(
    "AIOS Locale Quality Guard: FAILED",
  );
  console.error("");
  for (const failure of failures) {
    console.error(`✗ ${failure}`);
  }
  console.error("");
  process.exit(1);
}
console.log("");
console.log(
  "AIOS Locale Quality Guard: PASS",
);
console.log(
  "✓ English / Simplified Chinese / Japanese locale quality checks passed.",
);
console.log(
  "✓ No known mechanical-translation regressions detected.",
);
console.log("");
