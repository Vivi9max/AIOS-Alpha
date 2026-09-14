import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();

const REQUIRED_ROUTES = [
  {
    route: "/",
    file: "app/page.tsx",
    name: "Home",
  },
  {
    route: "/alpha",
    file: "app/alpha/page.tsx",
    name: "Alpha",
  },
  {
    route: "/brain",
    file: "app/brain/page.tsx",
    name: "Brain",
  },
  {
    route: "/dashboard",
    file: "app/dashboard/page.tsx",
    name: "Dashboard",
  },
  {
    route: "/execution",
    file: "app/execution/page.tsx",
    name: "Execution",
  },
  {
    route: "/memory",
    file: "app/memory/page.tsx",
    name: "Memory",
  },
  {
    route: "/outcomes",
    file: "app/outcomes/page.tsx",
    name: "Outcomes",
  },
  {
    route: "/planner",
    file: "app/planner/page.tsx",
    name: "Planner",
  },
  {
    route: "/projects",
    file: "app/projects/page.tsx",
    name: "Projects",
  },
];

const REQUIRED_LOCALE_SIGNALS = [
  "useLanguage",
  "Locale",
  "i18n",
  "Copy",
  "locale",
];

const failures = [];
const warnings = [];

function exists(relativePath) {
  return fs.existsSync(
    path.join(ROOT, relativePath),
  );
}

function read(relativePath) {
  return fs.readFileSync(
    path.join(ROOT, relativePath),
    "utf8",
  );
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

/**
 * C143.22.1
 *
 * AIOS Locale Route Coverage Guard
 *
 * Purpose:
 *
 * 1. Protect the core user-facing route surface.
 * 2. Ensure required product routes still exist.
 * 3. Ensure route pages remain connected to the localization system.
 * 4. Detect routes that silently regress to hard-coded UI.
 *
 * This guard does NOT attempt to translate source code.
 * It protects route-level localization coverage.
 */

console.log("");
console.log(
  "AIOS Locale Route Coverage Guard",
);
console.log("");

/*
 * ---------------------------------------------------------------------------
 * Route existence
 * ---------------------------------------------------------------------------
 */

for (const route of REQUIRED_ROUTES) {
  if (!exists(route.file)) {
    fail(
      `${route.route} (${route.name}): missing route file ${route.file}`,
    );

    continue;
  }

  console.log(
    `✓ ${route.route} → ${route.file}`,
  );
}

/*
 * ---------------------------------------------------------------------------
 * Route localization coverage
 * ---------------------------------------------------------------------------
 *
 * A route does not need to contain every localization implementation
 * directly. It may consume localized child components.
 *
 * Therefore we only flag pages that are clearly self-contained and contain
 * visible UI strings without any localization signal.
 */

for (const route of REQUIRED_ROUTES) {
  if (!exists(route.file)) {
    continue;
  }

  const source = read(route.file);

  const hasLocalizationSignal =
    REQUIRED_LOCALE_SIGNALS.some(
      (signal) =>
        source.includes(signal),
    );

  const hasVisibleUiText =
    />([^<{]{2,})</u.test(source) ||
    /["'`](?:[A-Za-z\u4e00-\u9fff\u3040-\u30ff][^"'`]{2,})["'`]/u.test(
      source,
    );

  if (
    hasVisibleUiText &&
    !hasLocalizationSignal
  ) {
    warn(
      `${route.file}: visible UI text detected without a direct localization signal. Verify that localization is provided by a child component or shared layer.`,
    );
  }
}

/*
 * ---------------------------------------------------------------------------
 * Core product-language layer
 * ---------------------------------------------------------------------------
 */

const canonicalFile =
  "lib/i18n/product-language.ts";

if (!exists(canonicalFile)) {
  fail(
    `${canonicalFile}: canonical product-language layer is missing.`,
  );
} else {
  const source = read(canonicalFile);

  const requiredTerms = [
    "runtimeOnline",
    "runtimeOffline",
    "runtimeStatus",
    "provider",
    "activeProvider",
    "taskTitle",
    "taskDescription",
  ];

  for (const term of requiredTerms) {
    if (!source.includes(term)) {
      fail(
        `${canonicalFile}: required canonical term missing: ${term}`,
      );
    }
  }

  console.log(
    "✓ Canonical product-language layer present",
  );
}

/*
 * ---------------------------------------------------------------------------
 * Runtime normalizer
 * ---------------------------------------------------------------------------
 */

const normalizerFile =
  "components/i18n/ProductLanguageNormalizer.tsx";

if (!exists(normalizerFile)) {
  fail(
    `${normalizerFile}: runtime product-language normalizer is missing.`,
  );
} else {
  const source = read(normalizerFile);

  const requiredSignals = [
    "legacyProductCorrections",
    "MutationObserver",
    "contenteditable",
    "data-user-content",
    "data-generated-content",
    "data-ai-content",
  ];

  for (const signal of requiredSignals) {
    if (!source.includes(signal)) {
      fail(
        `${normalizerFile}: required safety/localization signal missing: ${signal}`,
      );
    }
  }

  console.log(
    "✓ Runtime product-language normalizer present",
  );
}

/*
 * ---------------------------------------------------------------------------
 * Language provider
 * ---------------------------------------------------------------------------
 */

const languageProviderFile =
  "components/i18n/LanguageProvider.tsx";

if (!exists(languageProviderFile)) {
  fail(
    `${languageProviderFile}: LanguageProvider is missing.`,
  );
} else {
  const source = read(
    languageProviderFile,
  );

  const requiredLocales = [
    "en",
    "zh-CN",
    "ja",
  ];

  for (const locale of requiredLocales) {
    if (!source.includes(locale)) {
      fail(
        `${languageProviderFile}: required locale missing: ${locale}`,
      );
    }
  }

  console.log(
    "✓ EN / zh-CN / JA locale support present",
  );
}

/*
 * ---------------------------------------------------------------------------
 * Result
 * ---------------------------------------------------------------------------
 */

console.log("");

if (warnings.length > 0) {
  console.log(
    "AIOS Locale Route Coverage Guard: WARN",
  );

  for (const warning of warnings) {
    console.log(`⚠ ${warning}`);
  }

  console.log("");
}

if (failures.length > 0) {
  console.error(
    "AIOS Locale Route Coverage Guard: FAILED",
  );

  console.error("");

  for (const failure of failures) {
    console.error(`✗ ${failure}`);
  }

  console.error("");

  process.exit(1);
}

console.log(
  "AIOS Locale Route Coverage Guard: PASS",
);

console.log(
  "✓ Core user-facing routes are present.",
);

console.log(
  "✓ Canonical product-language layer is protected.",
);

console.log(
  "✓ Runtime normalization safety boundary is protected.",
);

console.log(
  "✓ EN / zh-CN / JA locale coverage is protected.",
);

console.log("");
