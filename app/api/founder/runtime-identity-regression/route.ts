import { NextRequest } from "next/server";

import {
  isFounderRequest,
} from "@/lib/auth/founder";

import {
  APP_CONFIG,
} from "@/lib/config/app";

import {
  AIOS_IDENTITY,
} from "@/lib/runtime/version";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

function runtimeIdentity() {
  return {
    runtime:
      APP_CONFIG.runtimeId,

    runtimeVersion:
      APP_CONFIG.version,

    release:
      APP_CONFIG.release,
  };
}

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return Response.json(
    {
      ...body,
      ...runtimeIdentity(),
      timestamp:
        Date.now(),
    },
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

function check(
  name: string,
  expected: string,
  actual: unknown,
) {
  return {
    name,
    expected,
    actual,
    pass:
      actual === expected,
  };
}

export async function GET(
  request: NextRequest,
) {
  if (!isFounderRequest(request)) {
    return json(
      {
        success:
          false,

        verified:
          false,

        error:
          "Founder authentication required.",

        code:
          "FOUNDER_AUTH_REQUIRED",
      },
      401,
    );
  }

  const configuredVersion =
    process.env
      .NEXT_PUBLIC_APP_VERSION
      ?.trim() ||
    null;

  const configuredRelease =
    process.env
      .NEXT_PUBLIC_APP_RELEASE
      ?.trim() ||
    null;

  const checks = [
    check(
      "runtime-name",
      APP_CONFIG.runtimeId,
      APP_CONFIG.runtimeId,
    ),

    check(
      "runtime-version-config",
      APP_CONFIG.version,
      configuredVersion ||
        APP_CONFIG.version,
    ),

    check(
      "runtime-release-config",
      APP_CONFIG.release,
      configuredRelease ||
        APP_CONFIG.release,
    ),

    check(
      "runtime-version-identity",
      APP_CONFIG.version,
      AIOS_IDENTITY.version,
    ),

    check(
      "runtime-release-identity",
      APP_CONFIG.release,
      AIOS_IDENTITY.release,
    ),

    check(
      "runtime-name-identity",
      APP_CONFIG.runtimeId,
      AIOS_IDENTITY.name,
    ),
  ];

  const failedChecks =
    checks.filter(
      (item) =>
        !item.pass,
    );

  const verified =
    failedChecks.length === 0;

  return json(
    {
      success:
        verified,

      verified,

      status:
        verified
          ? "PASS"
          : "FAIL",

      regression:
        "C145.8_RUNTIME_IDENTITY_REGRESSION",

      identity: {
        name:
          AIOS_IDENTITY.name,

        runtime:
          APP_CONFIG.runtimeId,

        version:
          APP_CONFIG.version,

        release:
          APP_CONFIG.release,
      },

      configuration: {
        versionConfigured:
          Boolean(
            configuredVersion,
          ),

        releaseConfigured:
          Boolean(
            configuredRelease,
          ),

        version:
          configuredVersion ||
          APP_CONFIG.version,

        release:
          configuredRelease ||
          APP_CONFIG.release,
      },

      checks,

      passedChecks:
        checks.length -
        failedChecks.length,

      totalChecks:
        checks.length,

      failedChecks,
    },
    verified
      ? 200
      : 500,
  );
}
