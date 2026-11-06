import {
  buildRepositoryIndex,
} from "./aios-engineering-context.mjs";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function readJsonIfExists(absolutePath) {
  if (!fs.existsSync(absolutePath)) {
    return { exists: false, value: null, error: null };
  }

  try {
    const raw = fs.readFileSync(absolutePath, "utf8");
    return { exists: true, value: JSON.parse(raw), error: null };
  } catch (error) {
    return {
      exists: true,
      value: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function collectDependencyNames(packageJson) {
  const names = new Set();
  for (const field of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    const block = packageJson && packageJson[field];
    if (block && typeof block === "object") {
      for (const name of Object.keys(block)) {
        names.add(name);
      }
    }
  }
  return Array.from(names).sort();
}

function runNpmAudit(cwd) {
  const result = spawnSync(
    process.platform === "win32" ? "npm.cmd" : "npm",
    ["audit", "--json"],
    {
      cwd,
      encoding: "utf8",
      env: process.env,
      maxBuffer: 32 * 1024 * 1024,
    },
  );

  const stdout = typeof result.stdout === "string" ? result.stdout : "";
  const stderr = typeof result.stderr === "string" ? result.stderr : "";

  let parsed = null;
  let parseError = null;
  if (stdout.trim().length > 0) {
    try {
      parsed = JSON.parse(stdout);
    } catch (error) {
      parseError = error instanceof Error ? error.message : String(error);
    }
  }

  return {
    exitCode: typeof result.status === "number" ? result.status : null,
    signal: result.signal ?? null,
    spawnError: result.error ? String(result.error.message ?? result.error) : null,
    parseError,
    report: parsed,
    stderrTail: stderr.length > 2000 ? stderr.slice(-2000) : stderr,
  };
}

function summarizeAudit(report) {
  if (!report || typeof report !== "object") {
    return {
      available: false,
      vulnerabilities: null,
      metadata: null,
      advisoryCount: 0,
      advisories: [],
    };
  }

  const vulnerabilities =
    report.vulnerabilities && typeof report.vulnerabilities === "object"
      ? report.vulnerabilities
      : {};

  const metadata =
    report.metadata && typeof report.metadata === "object"
      ? report.metadata
      : null;

  const advisories = [];
  for (const [name, entry] of Object.entries(vulnerabilities)) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const via = Array.isArray(entry.via) ? entry.via : [];
    const advisoryIds = [];
    for (const item of via) {
      if (item && typeof item === "object") {
        if (typeof item.url === "string") {
          advisoryIds.push(item.url);
        } else if (typeof item.source === "number") {
          advisoryIds.push(`npm:${item.source}`);
        }
      } else if (typeof item === "string") {
        advisoryIds.push(item);
      }
    }

    advisories.push({
      name,
      severity: typeof entry.severity === "string" ? entry.severity : "unknown",
      isDirect: Boolean(entry.isDirect),
      range: typeof entry.range === "string" ? entry.range : null,
      fixAvailable:
        entry.fixAvailable && typeof entry.fixAvailable === "object"
          ? {
              name: entry.fixAvailable.name ?? null,
              version: entry.fixAvailable.version ?? null,
              isSemVerMajor: Boolean(entry.fixAvailable.isSemVerMajor),
            }
          : entry.fixAvailable === true
            ? { name: null, version: null, isSemVerMajor: null }
            : null,
      via: advisoryIds,
      effects: Array.isArray(entry.effects) ? entry.effects.slice() : [],
    });
  }

  advisories.sort((a, b) => {
    if (a.severity !== b.severity) {
      return String(a.severity).localeCompare(String(b.severity));
    }
    return a.name.localeCompare(b.name);
  });

  return {
    available: true,
    vulnerabilities: Object.keys(vulnerabilities).length,
    metadata,
    advisoryCount: advisories.length,
    advisories,
  };
}

function main() {
  try {
    const cwd = process.cwd();
    const index = buildRepositoryIndex(cwd);

    const dependencyEdgeCount = Object.values(
      index.graph.dependencies,
    ).reduce(
      (total, dependencies) => total + dependencies.length,
      0,
    );

    const packageJsonPath = path.join(cwd, "package.json");
    const packageLockPath = path.join(cwd, "package-lock.json");

    const packageJson = readJsonIfExists(packageJsonPath);
    const packageLock = readJsonIfExists(packageLockPath);

    const declaredDependencies =
      packageJson.value && typeof packageJson.value === "object"
        ? collectDependencyNames(packageJson.value)
        : [];

    const lockfileVersion =
      packageLock.value &&
      typeof packageLock.value === "object" &&
      typeof packageLock.value.lockfileVersion === "number"
        ? packageLock.value.lockfileVersion
        : null;

    const audit = runNpmAudit(cwd);
    const auditSummary = summarizeAudit(audit.report);

    writeJson({
      schemaVersion: 1,
      task: "C170.5.4.2",
      status: "DEPENDENCY_GRAPH_READY",
      repository: {
        head: index.head,
        branch: index.branch,
        trackedFileCount: index.trackedFileCount,
        typescriptSourceCount: index.typescriptSourceCount,
      },
      dependencyGraph: {
        sourceFileCount: Object.keys(
          index.graph.dependencies,
        ).length,
        dependencyEdgeCount,
      },
      packageManifests: {
        packageJson: {
          path: "package.json",
          exists: packageJson.exists,
          error: packageJson.error,
          declaredDependencyCount: declaredDependencies.length,
          declaredDependencies,
        },
        packageLock: {
          path: "package-lock.json",
          exists: packageLock.exists,
          error: packageLock.error,
          lockfileVersion,
        },
      },
      npmAudit: {
        exitCode: audit.exitCode,
        signal: audit.signal,
        spawnError: audit.spawnError,
        parseError: audit.parseError,
        stderrTail: audit.stderrTail,
        summary: auditSummary,
      },
    });

    if (audit.spawnError || audit.parseError) {
      process.exitCode = 1;
    }
  } catch (error) {
    const code =
      error &&
      typeof error === "object" &&
      typeof error.code === "string"
        ? error.code
        : "AIOS_C1705_DEPENDENCY_DIAGNOSTIC_FAILED";

    const message =
      error instanceof Error
        ? error.message
        : String(error);

    process.stderr.write(
      [
        "C170.5.4.2 ROOT CAUSE DIAGNOSTIC FAILED",
        `Error Code: ${code}`,
        "Original C170.1 diagnostic details:",
        message,
        "",
      ].join("\n"),
    );

    process.exitCode = 1;
  }
}

main();
