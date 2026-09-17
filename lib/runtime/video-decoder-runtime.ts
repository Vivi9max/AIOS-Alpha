import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

import ffmpegStatic from "ffmpeg-static";

export type VideoDecoderSource =
  | "bundled"
  | "environment"
  | "system";

export interface VideoDecoderRuntimeResult {
  success: boolean;
  code: string;
  available: boolean;

  decoder?: {
    name: string;
    path: string;
    source: VideoDecoderSource;
    version?: string;
  };

  checkedSources: VideoDecoderSource[];

  diagnostics?: {
    candidates: Array<{
      path: string;
      exists: boolean;
      executable: boolean;
      version?: string;
      error?: string;
    }>;
  };

  error?: string;
}

const require = createRequire(import.meta.url);

function isExecutableFile(
  filePath: string,
): boolean {
  try {
    const stat =
      statSync(filePath);

    if (!stat.isFile()) {
      return false;
    }

    if (
      process.platform ===
      "win32"
    ) {
      return true;
    }

    return Boolean(
      stat.mode & 0o111,
    );
  } catch {
    return false;
  }
}

function uniquePaths(
  paths: Array<string | undefined>,
): string[] {
  const result: string[] = [];
  const seen = new Set<string>();

  for (const value of paths) {
    if (!value) {
      continue;
    }

    const normalized =
      value.trim();

    if (!normalized) {
      continue;
    }

    if (seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function resolvePackageBinary(): string[] {
  const candidates: Array<
    string | undefined
  > = [];

  if (
    typeof ffmpegStatic ===
      "string" &&
    ffmpegStatic.trim()
  ) {
    candidates.push(
      ffmpegStatic,
    );
  }

  try {
    const resolved =
      require.resolve(
        "ffmpeg-static",
      );

    candidates.push(
      join(
        dirname(resolved),
        process.platform ===
          "win32"
          ? "ffmpeg.exe"
          : "ffmpeg",
      ),
    );
  } catch {
    // Package resolution may be unavailable
    // after server bundling.
  }

  const binaryName =
    process.platform ===
    "win32"
      ? "ffmpeg.exe"
      : "ffmpeg";

  candidates.push(
    join(
      process.cwd(),
      "node_modules",
      "ffmpeg-static",
      binaryName,
    ),
  );

  candidates.push(
    join(
      process.cwd(),
      ".next",
      "standalone",
      "node_modules",
      "ffmpeg-static",
      binaryName,
    ),
  );

  candidates.push(
    join(
      "/var/task",
      "node_modules",
      "ffmpeg-static",
      binaryName,
    ),
  );

  return uniquePaths(
    candidates,
  );
}

function runVersion(
  command: string,
): Promise<
  | {
      version?: string;
      error?: string;
    }
> {
  return new Promise(
    (resolve) => {
      let settled = false;
      let output = "";

      let child:
        | ReturnType<typeof spawn>
        | undefined;

      let timer:
        | ReturnType<typeof setTimeout>
        | undefined;

      const finish = (
        value: {
          version?: string;
          error?: string;
        },
      ) => {
        if (settled) {
          return;
        }

        settled = true;

        if (timer) {
          clearTimeout(timer);
          timer =
            undefined;
        }

        resolve(value);
      };

      try {
        child = spawn(
          command,
          ["-version"],
          {
            stdio: [
              "ignore",
              "pipe",
              "pipe",
            ],
          },
        );

        if (
          !child.stdout ||
          !child.stderr
        ) {
          try {
            child.kill(
              "SIGKILL",
            );
          } catch {
            // Ignore cleanup errors.
          }

          finish({
            error:
              "FFmpeg process streams are unavailable.",
          });

          return;
        }

        child.stdout.on(
          "data",
          (chunk) => {
            output +=
              chunk.toString();
          },
        );

        child.stderr.on(
          "data",
          (chunk) => {
            output +=
              chunk.toString();
          },
        );

        child.on(
          "error",
          (error) => {
            finish({
              error:
                error instanceof Error
                  ? error.message
                  : String(error),
            });
          },
        );

        child.on(
          "close",
          (code) => {
            const match =
              output.match(
                /ffmpeg version\s+([^\s]+)/i,
              );

            if (match?.[1]) {
              finish({
                version:
                  match[1],
              });

              return;
            }

            finish({
              error:
                output
                  .trim()
                  .slice(
                    0,
                    1000,
                  ) ||
                `FFmpeg exited with code ${
                  code ?? "unknown"
                }.`,
            });
          },
        );

        timer =
          setTimeout(
            () => {
              try {
                if (child) {
                  child.kill(
                    "SIGKILL",
                  );
                }
              } catch {
                // Ignore cleanup errors.
              }

              finish({
                error:
                  "FFmpeg version check timed out.",
              });
            },
            10_000,
          );
      } catch (error) {
        finish({
          error:
            error instanceof Error
              ? error.message
              : String(error),
        });
      }
    },
  );
}

async function checkCandidate(
  filePath: string,
): Promise<{
  path: string;
  exists: boolean;
  executable: boolean;
  version?: string;
  error?: string;
}> {
  const exists =
    existsSync(filePath);

  if (!exists) {
    return {
      path: filePath,
      exists: false,
      executable: false,
      error:
        "FFmpeg binary does not exist at this path.",
    };
  }

  const executable =
    isExecutableFile(
      filePath,
    );

  if (!executable) {
    return {
      path: filePath,
      exists: true,
      executable: false,
      error:
        "FFmpeg binary exists but is not executable.",
    };
  }

  const result =
    await runVersion(
      filePath,
    );

  if (!result.version) {
    return {
      path: filePath,
      exists: true,
      executable: true,
      error:
        result.error ??
        "FFmpeg did not return a usable version.",
    };
  }

  return {
    path: filePath,
    exists: true,
    executable: true,
    version:
      result.version,
  };
}

export async function executeVideoDecoderHealth(): Promise<VideoDecoderRuntimeResult> {
  const checkedSources: VideoDecoderSource[] =
    [];

  const diagnostics: Array<{
    path: string;
    exists: boolean;
    executable: boolean;
    version?: string;
    error?: string;
  }> = [];

  const environmentPath =
    process.env.FFMPEG_PATH?.trim();

  if (environmentPath) {
    checkedSources.push(
      "environment",
    );

    const result =
      await checkCandidate(
        environmentPath,
      );

    diagnostics.push(
      result,
    );

    if (result.version) {
      return {
        success: true,
        code:
          "C144_7_2_VIDEO_DECODER_ENVIRONMENT_PASS",
        available: true,
        decoder: {
          name: "FFmpeg",
          path:
            result.path,
          source:
            "environment",
          version:
            result.version,
        },
        checkedSources,
        diagnostics: {
          candidates:
            diagnostics,
        },
      };
    }
  }

  checkedSources.push(
    "bundled",
  );

  const bundledCandidates =
    resolvePackageBinary();

  for (
    const candidate of
    bundledCandidates
  ) {
    const result =
      await checkCandidate(
        candidate,
      );

    diagnostics.push(
      result,
    );

    if (result.version) {
      return {
        success: true,
        code:
          "C144_7_2_VIDEO_DECODER_BUNDLED_PASS",
        available: true,
        decoder: {
          name: "FFmpeg",
          path:
            result.path,
          source:
            "bundled",
          version:
            result.version,
        },
        checkedSources,
        diagnostics: {
          candidates:
            diagnostics,
        },
      };
    }
  }

  checkedSources.push(
    "system",
  );

  const systemResult =
    await checkCandidate(
      "ffmpeg",
    );

  diagnostics.push(
    systemResult,
  );

  if (
    systemResult.version
  ) {
    return {
      success: true,
      code:
        "C144_7_2_VIDEO_DECODER_SYSTEM_PASS",
      available: true,
      decoder: {
        name: "FFmpeg",
        path: "ffmpeg",
        source: "system",
        version:
          systemResult.version,
      },
      checkedSources,
      diagnostics: {
        candidates:
          diagnostics,
      },
    };
  }

  return {
    success: false,
    code:
      "C144_7_2_VIDEO_DECODER_UNAVAILABLE",
    available: false,
    checkedSources,
    diagnostics: {
      candidates:
        diagnostics,
    },
    error:
      "No usable FFmpeg decoder is available in the current runtime.",
  };
}
