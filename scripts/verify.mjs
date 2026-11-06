import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";

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

if (existsSync("package-lock.json")) {
  try {
    execFileSync("npm", ["ci", "--dry-run", "--ignore-scripts"], {
      stdio: "pipe",
      env: { ...process.env, npm_config_audit: "false", npm_config_fund: "false" }
    });
  } catch (error) {
    const detail =
      error && error.stderr
        ? error.stderr.toString().trim()
        : String(error);
    failures.push(
      `package-lock.json is not reproducible with npm ci: ${detail}`
    );
  }

  try {
    const lockRaw = readFileSync("package-lock.json", "utf8");
    const lock = JSON.parse(lockRaw);
    const lockRoot = lock.packages && lock.packages[""];
    if (!lockRoot) {
      failures.push("package-lock.json missing root package entry");
    } else {
      const pkgDeps = pkg.dependencies || {};
      const lockDeps = lockRoot.dependencies || {};
      for (const name of Object.keys(pkgDeps)) {
        if (!(name in lockDeps)) {
          failures.push(
            `package-lock.json out of sync: missing dependency ${name}`
          );
        }
      }
      const pkgDevDeps = pkg.devDependencies || {};
      const lockDevDeps = lockRoot.devDependencies || {};
      for (const name of Object.keys(pkgDevDeps)) {
        if (!(name in lockDevDeps)) {
          failures.push(
            `package-lock.json out of sync: missing devDependency ${name}`
          );
        }
      }
    }
  } catch (error) {
    failures.push(
      `package-lock.json could not be validated: ${String(error)}`
    );
  }
} else {
  failures.push("package-lock.json is required for reproducible installs");
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

console.log(
  "Lockfile consistency and reproducibility: OK"
);
