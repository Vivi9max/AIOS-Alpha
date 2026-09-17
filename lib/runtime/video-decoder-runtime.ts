import { spawn } from "node:child_process";

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
  error?: string;
}

function runVersion(
  command: string,
): Promise<string | undefined> {
  return new Promise((resolve) => {
    let settled = false;
    let output = "";

    let child:
      | ReturnType<typeof spawn>
      | undefined;

    let timer:
      | ReturnType<typeof setTimeout>
      | undefined;

    const finish = (
      value: string | undefined,
    ) => {
      if (settled) {
        return;
      }

      settled = true;

      if (timer) {
        clearTimeout(timer);
        timer = undefined;
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

      if (!child.stdout || !child.stderr) {
        try {
          child.kill("SIGKILL");
        } catch {
          // Ignore cleanup errors.
        }

        finish(undefined);
        return;
      }

      child.stdout.on(
        "data",
        (chunk) => {
          output += chunk.toString();
        },
      );

      child.stderr.on(
        "data",
        (chunk) => {
          output += chunk.toString();
        },
      );

      child.on(
        "error",
        () => {
          finish(undefined);
        },
      );

      child.on(
        "close",
        () => {
          const match =
            output.match(
              /ffmpeg version\s+([^\s]+)/i,
            );

          finish(
            match?.[1],
          );
        },
      );

      timer = setTimeout(() => {
        try {
          if (child) {
            child.kill("SIGKILL");
          }
        } catch {
          // Ignore cleanup errors.
        }

        finish(undefined);
      }, 10_000);
    } catch {
      finish(undefined);
    }
  });
}

async function checkDecoder(
  path: string,
): Promise<string | undefined> {
  return runVersion(path);
}

export async function executeVideoDecoderHealth(): Promise<VideoDecoderRuntimeResult> {
  const checkedSources: VideoDecoderSource[] =
    [];

  const environmentPath =
    process.env.FFMPEG_PATH?.trim();

  if (environmentPath) {
    checkedSources.push(
      "environment",
    );

    const version =
      await checkDecoder(
        environmentPath,
      );

    if (version) {
      return {
        success: true,
        code:
          "C144_7_2_VIDEO_DECODER_ENVIRONMENT_PASS",
        available: true,
        decoder: {
          name: "FFmpeg",
          path: environmentPath,
          source: "environment",
          version,
        },
        checkedSources,
      };
    }
  }

  if (ffmpegStatic) {
    checkedSources.push(
      "bundled",
    );

    const version =
      await checkDecoder(
        ffmpegStatic,
      );

    if (version) {
      return {
        success: true,
        code:
          "C144_7_2_VIDEO_DECODER_BUNDLED_PASS",
        available: true,
        decoder: {
          name: "FFmpeg",
          path: ffmpegStatic,
          source: "bundled",
          version,
        },
        checkedSources,
      };
    }
  }

  checkedSources.push(
    "system",
  );

  const systemVersion =
    await checkDecoder(
      "ffmpeg",
    );

  if (systemVersion) {
    return {
      success: true,
      code:
        "C144_7_2_VIDEO_DECODER_SYSTEM_PASS",
      available: true,
      decoder: {
        name: "FFmpeg",
        path: "ffmpeg",
        source: "system",
        version: systemVersion,
      },
      checkedSources,
    };
  }

  return {
    success: false,
    code:
      "C144_7_2_VIDEO_DECODER_UNAVAILABLE",
    available: false,
    checkedSources,
    error:
      "No usable FFmpeg decoder is available in the current runtime.",
  };
}
