import {
  existsSync,
  readFileSync,
} from "node:fs";

const I18N_FILE = "lib/i18n/index.ts";

const LOCALES = [
  "en",
  "zh-CN",
  "ja",
];

const failures = [];

if (!existsSync(I18N_FILE)) {
  console.error(
    "Locale regression verification failed."
  );
  console.error(
    `- Missing: ${I18N_FILE}`
  );
  process.exit(1);
}

const source = readFileSync(
  I18N_FILE,
  "utf8"
);

function extractLocaleBlock(
  locale,
  nextLocalePattern
) {
  const startPattern =
    locale === "en"
      ? /(?:^|\n)\s*en:\s*\{/m
      : new RegExp(
          `(?:^|\\n)\\s*"${locale}":\\s*\\{`,
          "m"
        );

  const startMatch =
    startPattern.exec(source);

  if (!startMatch) {
    failures.push(
      `Missing locale block: ${locale}`
    );
    return "";
  }

  const start =
    startMatch.index +
    startMatch[0].length;

  const remainder =
    source.slice(start);

  const endMatch =
    remainder.match(
      nextLocalePattern
    );

  if (!endMatch) {
    failures.push(
      `Could not determine end of locale block: ${locale}`
    );
    return "";
  }

  return remainder.slice(
    0,
    endMatch.index
  );
}

const blocks = {
  en: extractLocaleBlock(
    "en",
    /\n\s*"zh-CN":\s*\{/
  ),
  "zh-CN": extractLocaleBlock(
    "zh-CN",
    /\n\s*ja:\s*\{/
  ),
  ja: extractLocaleBlock(
    "ja",
    /\n\s*\},\s*\n\s*};/
  ),
};

function extractKeys(block) {
  return [
    ...block.matchAll(
      /^\s*"([^"]+)":\s*/gm
    ),
  ].map(
    (match) => match[1]
  );
}

const keySets = {};

for (const locale of LOCALES) {
  const keys = extractKeys(
    blocks[locale]
  );

  keySets[locale] = new Set(keys);

  if (keys.length === 0) {
    failures.push(
      `Locale ${locale} contains no translation keys.`
    );
  }
}

const baseKeys =
  keySets.en;

for (const locale of [
  "zh-CN",
  "ja",
]) {
  for (const key of baseKeys) {
    if (!keySets[locale].has(key)) {
      failures.push(
        `${locale} is missing translation key: ${key}`
      );
    }
  }

  for (const key of keySets[locale]) {
    if (!baseKeys.has(key)) {
      failures.push(
        `${locale} contains unexpected translation key: ${key}`
      );
    }
  }
}

function extractEntries(block) {
  const entries = new Map();

  for (const match of block.matchAll(
    /^\s*"([^"]+)":\s*(?:"([^"]*)"|`([^`]*)`)/gm
  )) {
    entries.set(
      match[1],
      match[2] ??
        match[3] ??
        ""
    );
  }

  return entries;
}

const entries = {
  en: extractEntries(blocks.en),
  "zh-CN": extractEntries(
    blocks["zh-CN"]
  ),
  ja: extractEntries(blocks.ja),
};

const allowedSharedTerms = new Set([
  "AIOS",
  "Runtime",
  "Planner",
  "Execution",
  "Outcome",
  "Milestone",
  "Task",
  "Tasks",
  "Memory",
  "Chat",
  "Feedback",
  "GitHub",
  "Vercel",
]);

function normalizeForComparison(
  value
) {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isLikelyUntranslated(
  english,
  translated
) {
  const en =
    normalizeForComparison(
      english
    );

  const target =
    normalizeForComparison(
      translated
    );

  if (!en || !target) {
    return false;
  }

  if (en !== target) {
    return false;
  }

  if (
    allowedSharedTerms.has(
      english.trim()
    )
  ) {
    return false;
  }

  return true;
}

for (const locale of [
  "zh-CN",
  "ja",
]) {
  for (const [
    key,
    english,
  ] of entries.en.entries()) {
    const translated =
      entries[locale].get(key);

    if (
      translated === undefined
    ) {
      continue;
    }

    if (
      isLikelyUntranslated(
        english,
        translated
      )
    ) {
      failures.push(
        `${locale} likely reuses English text for "${key}": "${translated}"`
      );
    }
  }
}

const englishBlock =
  blocks.en;

const chineseInEnglish =
  englishBlock.match(
    /[\u3400-\u4dbf\u4e00-\u9fff]/
  );

if (chineseInEnglish) {
  failures.push(
    "English locale contains Chinese CJK characters."
  );
}

const japaneseBlock =
  blocks.ja;

const kanaInNonJapanese =
  blocks["zh-CN"].match(
    /[\u3040-\u30ff]/
  );

if (kanaInNonJapanese) {
  failures.push(
    "zh-CN locale contains Japanese kana."
  );
}

if (failures.length) {
  console.error(
    "AIOS Alpha locale regression verification FAILED."
  );

  for (const failure of failures) {
    console.error(
      `- ${failure}`
    );
  }

  process.exit(1);
}

console.log(
  "AIOS Alpha locale regression verification PASSED."
);

console.log(
  `Locales verified: ${LOCALES.join(", ")}`
);

console.log(
  `Translation keys: ${baseKeys.size}`
);

console.log(
  "Checks:"
);

console.log(
  "- locale key parity: OK"
);

console.log(
  "- missing translation detection: OK"
);

console.log(
  "- unexpected translation detection: OK"
);

console.log(
  "- untranslated English fallback detection: OK"
);

console.log(
  "- English CJK contamination detection: OK"
);

console.log(
  "- Chinese Japanese-kana contamination detection: OK"
);
