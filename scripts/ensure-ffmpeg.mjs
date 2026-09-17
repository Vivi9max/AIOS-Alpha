import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();

const packageDir = path.join(
  root,
  "node_modules",
  "ffmpeg-static",
);

const installScript = path.join(
  packageDir,
  "install.js",
);

const expectedBinary = path.join(
  packageDir,
  process.platform === "win32"
    ? "ffmpeg.exe"
    : "ffmpeg",
);

function existsExecutable(filePath) {
  try {
    const stat = fs.statSync(filePath);

    if (!stat.isFile()) {
      return false;
    }

    if (process.platform === "win32") {
      return true;
    }

    return Boolean(
      stat.mode & 0o111,
    );
  } catch {
    return false;
  }
}

function fail(message) {
  console.error(
    `[AIOS FFmpeg] ${message}`,
  );

  process.exit(1);
}

console.log(
  `[AIOS FFmpeg] platform=${process.platform}`,
);

console.log(
  `[AIOS FFmpeg] expected=${expectedBinary}`,
);

if (
  existsExecutable(expectedBinary)
) {
  console.log(
    "[AIOS FFmpeg] bundled binary already exists.",
  );

  process.exit(0);
}

if (
  !fs.existsSync(packageDir)
) {
  fail(
    "ffmpeg-static package directory does not exist.",
  );
}

if (
  !fs.existsSync(installScript)
) {
  fail(
    "ffmpeg-static install.js does not exist.",
  );
}

console.log(
  "[AIOS FFmpeg] bundled binary missing; running ffmpeg-static install.js...",
);

const result =
  spawnSync(
    process.execPath,
    [installScript],
    {
      cwd: packageDir,
      stdio: "inherit",
      env: {
        ...process.env,
      },
    },
  );

if (
  result.error
) {
  fail(
    `ffmpeg-static installer failed to start: ${result.error.message}`,
  );
}

if (
  typeof result.status ===
    "number" &&
  result.status !== 0
) {
  fail(
    `ffmpeg-static installer exited with code ${result.status}.`,
  );
}

if (
  !existsExecutable(expectedBinary)
) {
  fail(
    "ffmpeg-static installer completed but no executable FFmpeg binary was found.",
  );
}

try {
  if (
    process.platform !==
    "win32"
  ) {
    fs.chmodSync(
      expectedBinary,
      0o755,
    );
  }
} catch (error) {
  console.warn(
    `[AIOS FFmpeg] chmod warning: ${
      error instanceof Error
        ? error.message
        : String(error)
    }`,
  );
}

if (
  !existsExecutable(expectedBinary)
) {
  fail(
    "FFmpeg binary exists but is not executable.",
  );
}

console.log(
  "[AIOS FFmpeg] bundled binary is ready.",
);
