import {
  buildRepositoryIndex,
} from "./aios-engineering-context.mjs";

function writeJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

function main() {
  try {
    const index = buildRepositoryIndex(process.cwd());

    const dependencyEdgeCount = Object.values(
      index.graph.dependencies,
    ).reduce(
      (total, dependencies) => total + dependencies.length,
      0,
    );

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
    });
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
