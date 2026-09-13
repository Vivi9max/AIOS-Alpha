import {
  existsSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import {
  join,
  relative,
} from "node:path";

const ROOTS = [
  "app",
  "components",
];

const EXTENSIONS = new Set([
  ".ts",
  ".tsx",
]);

const failures = [];
const localeAwareFiles = [];

function walk(directory) {
  if (!existsSync(directory)) {
    return [];
  }

  const results = [];

  for (const entry of readdirSync(
    directory,
    { withFileTypes: true }
  )) {
    const path = join(
      directory,
      entry.name
    );

    if (entry.isDirectory()) {
      results.push(
        ...walk(path)
      );
      continue;
    }

    const extension =
      entry.name.slice(
        entry.name.lastIndexOf(".")
      );

    if (
      EXTENSIONS.has(extension)
    ) {
      results.push(path);
    }
  }

  return results;
}

function containsLocaleRuntime(source) {
  return (
    source.includes("useLanguage()") ||
    source.includes("useLanguage (") ||
    source.includes("LanguageProvider") ||
    source.includes("Locale")
  );
}

function containsLocaleSelection(source) {
  return (
    /\[[\s\S]*locale[\s\S]*\]/.test(
      source
    ) ||
    /\bcopy\s*=\s*[A-Za-z_$][\w$]*\[locale\]/.test(
      source
    ) ||
    /\bcopy\s*=\s*[A-Za-z_$][\w$]*\s*\(\s*locale/.test(
      source
    ) ||
    /\btranslate\s*\(\s*locale/.test(
      source
    ) ||
    /\bt\s*\(\s*["'`]/.test(
      source
    )
  );
}

function containsLocaleTables(source) {
  return (
    /\ben\s*:\s*\{/.test(source) &&
    (
      /"zh-CN"\s*:\s*\{/.test(
        source
      ) ||
      /\bzhCN\s*:\s*\{/.test(
        source
      )
    ) &&
    /\bja\s*:\s*\{/.test(source)
  );
}

function containsRawChinese(source) {
  return /[\u3400-\u4dbf\u4e00-\u9fff]/.test(
    source
  );
}

function containsRawJapaneseKana(source) {
  return /[\u3040-\u30ff]/.test(
    source
  );
}

const files = ROOTS.flatMap(
  (root) => walk(root)
);

for (const file of files) {
  const source = readFileSync(
    file,
    "utf8"
  );

  if (
    !containsLocaleRuntime(source)
  ) {
    continue;
  }

  const relativePath = relative(
    process.cwd(),
    file
  );

  localeAwareFiles.push(
    relativePath
  );

  const hasSelection =
    containsLocaleSelection(
      source
    );

  const hasTables =
    containsLocaleTables(
      source
    );

  if (
    !hasSelection &&
    !hasTables
  ) {
    failures.push(
      `${relativePath}: locale-aware file has no detectable locale selection/table.`
    );
  }

  const isLocaleDefinitionFile =
    file.endsWith(
      "lib/i18n/index.ts"
    );

  if (
    !isLocaleDefinitionFile &&
    !hasTables
  ) {
    if (
      containsRawChinese(source) &&
      !source.includes(
        "zh-CN"
      )
    ) {
      failures.push(
        `${relativePath}: contains Chinese CJK text without an explicit zh-CN locale surface.`
      );
    }

    if (
      containsRawJapaneseKana(source) &&
      !source.includes(
        "ja"
      )
    ) {
      failures.push(
        `${relativePath}: contains Japanese kana without an explicit ja locale surface.`
      );
    }
  }
}

if (
  localeAwareFiles.length === 0
) {
  failures.push(
    "No locale-aware application/component files were detected."
  );
}

if (failures.length > 0) {
  console.error(
    "AIOS Alpha locale surface verification FAILED."
  );

  for (const failure of failures) {
    console.error(
      `- ${failure}`
    );
  }

  process.exit(1);
}

console.log(
  "AIOS Alpha locale surface verification PASSED."
);

console.log(
  `Locale-aware files: ${localeAwareFiles.length}`
);

for (const file of localeAwareFiles) {
  console.log(
    `- ${file}`
  );
}

console.log(
  "Checks:"
);

console.log(
  "- locale-aware surface detection: OK"
);

console.log(
  "- locale selection/table detection: OK"
);

console.log(
  "- raw Chinese contamination guard: OK"
);

console.log(
  "- raw Japanese kana contamination guard: OK"
);
