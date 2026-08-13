import { existsSync, readFileSync } from "node:fs";

const requiredFiles = [
  "aios-alpha.manifest.json",
  "docs/AIOS-HANDOFF.md",
  "docs/aios-spec.md",
  "package.json",
  "tsconfig.json"
];

const missing = requiredFiles.filter((file) => !existsSync(file));

if (missing.length) {
  console.error("AIOS Alpha verification failed.");
  missing.forEach((file) => console.error(`- Missing: ${file}`));
  process.exit(1);
}

const manifest = JSON.parse(
  readFileSync("aios-alpha.manifest.json", "utf8")
);

const pkg = JSON.parse(
  readFileSync("package.json", "utf8")
);

const failures = [];

if (manifest.project !== "AIOS Alpha") {
  failures.push("manifest.project must be AIOS Alpha");
}

if (!/^C\d+(?:\.\d+)?$/.test(String(manifest.release))) {
  failures.push(
    "manifest.release must use a C-number release format"
  );
}

for (const locale of ["en", "zh-CN", "ja"]) {
  if (!manifest.locales?.includes(locale)) {
    failures.push(
      `manifest.locales must include ${locale}`
    );
  }
}

for (const script of [
  "dev",
  "typecheck",
  "build",
  "start",
  "verify"
]) {
  if (!pkg.scripts?.[script]) {
    failures.push(
      `package.json missing script: ${script}`
    );
  }
}

if (failures.length) {
  console.error(
    "AIOS Alpha verification failed."
  );

  failures.forEach((failure) => {
    console.error(`- ${failure}`);
  });

  process.exit(1);
}

console.log(
  "AIOS Alpha project continuity verification passed."
);

console.log(
  `Release: ${manifest.release}`
);

console.log(
  `Locales: ${manifest.locales.join(", ")}`
);

console.log(
  "Development and production scripts: OK"
);
