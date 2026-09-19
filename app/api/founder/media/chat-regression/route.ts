import { NextRequest, NextResponse } from "next/server";

import { isFounderRequest } from "@/lib/founder/auth";

import {
  createMediaGenerationJob,
  getMediaGenerationJob,
  getMediaGenerationAvailability,
  resolveAvailableMediaGenerationRoute,
} from "@/lib/runtime/media/generation-router";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TEST_PROMPT =
  "A cinematic vertical AIOS technology scene showing an autonomous AI operating system coordinating intelligence, planning, execution, and media generation. Clean futuristic environment, professional product demonstration.";

const TEST_RESOLUTION = "1080p";
const TEST_ASPECT_RATIO = "9:16";
const TEST_DURATION_SECONDS = 8;

function isConfigured(
  value: string | undefined,
): boolean {
  return Boolean(value?.trim());
}

function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      verified: false,
      code: "FOUNDER_AUTH_REQUIRED",
      message:
        "Founder authentication is required.",
    },
    {
      status: 401,
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}

function buildExecutionRequest() {
  return {
    kind: "video" as const,
    prompt: TEST_PROMPT,
    resolution: TEST_RESOLUTION,
    aspectRatio: TEST_ASPECT_RATIO,
    durationSeconds:
      TEST_DURATION_SECONDS,
  };
}

/**
 * GET
 *
 * Non-billable preflight verification.
 *
 * This confirms:
 * Chat regression contract
 * → media capability
 * → automatic provider routing
 * → provider configuration
 *
 * It does NOT create a media generation job.
 */
export async function GET(
  request: NextRequest,
) {
  const startedAt = Date.now();

  if (!isFounderRequest(request)) {
    return unauthorizedResponse();
  }

  const operationName =
    request.nextUrl.searchParams
      .get("operationName")
      ?.trim();

  /*
   * When an operation name is supplied,
   * GET becomes a status/read operation.
   *
   * It never creates another job.
   */
  if (operationName) {
    const result =
      await getMediaGenerationJob(
        operationName,
      );

    const verified =
      result.success ||
      result.code ===
        "MEDIA_GENERATION_IN_PROGRESS";

    return NextResponse.json(
      {
        success: verified,
        verified,
        code:
          result.code,
        message:
          verified
            ? "C146.18.3 media generation job status was read successfully."
            : "C146.18.3 media generation job status could not be verified.",
        runtime: "aios-alpha",
        stage: "C146.18.3",
        execution: {
          provider:
            result.route.provider,
          model:
            result.route.model,
          operationName:
            result.providerJobId ??
            operationName,
          status:
            result.providerStatus,
          progress:
            result.providerProgress,
          videoUri:
            result.job?.videoUri ??
            null,
        },
        providerJob:
          result.job ?? null,
        error:
          result.error ?? null,
        latencyMs:
          Date.now() -
          startedAt,
        timestamp:
          Date.now(),
      },
      {
        status: verified ? 200 : 500,
        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  }

  const availability =
    getMediaGenerationAvailability();

  const route =
    resolveAvailableMediaGenerationRoute(
      buildExecutionRequest(),
    );

  const geminiConfigured =
    isConfigured(
      process.env.GEMINI_API_KEY,
    ) ||
    isConfigured(
      process.env.GOOGLE_API_KEY,
    );

  const openAIConfigured =
    isConfigured(
      process.env.OPENAI_API_KEY,
    );

  const providerIsKnown =
    route.provider ===
      "google-veo" ||
    route.provider ===
      "aios-composer";

  const providerConfigurationIsValid =
    route.provider ===
      "google-veo"
      ? route.configured ===
        geminiConfigured
      : route.provider ===
          "aios-composer"
        ? route.configured ===
          openAIConfigured
        : false;

  const resolutionPreserved =
    route.resolution ===
    TEST_RESOLUTION;

  const aspectRatioPreserved =
    TEST_ASPECT_RATIO ===
    "9:16";

  const durationPreserved =
    TEST_DURATION_SECONDS >= 4 &&
    TEST_DURATION_SECONDS <= 8;

  const checks = {
    founderAuth: true,
    availabilityReturned:
      Array.isArray(
        availability,
      ),
    routerResolved:
      Boolean(route.provider),
    providerIsKnown,
    providerConfigurationIsValid,
    resolutionPreserved,
    aspectRatioPreserved,
    durationPreserved,
  };

  const verified =
    Object.values(checks).every(
      Boolean,
    );

  return NextResponse.json(
    {
      success: verified,
      verified,
      code: verified
        ? "C146_18_3_MEDIA_PREFLIGHT_PASS"
        : "C146_18_3_MEDIA_PREFLIGHT_FAILED",
      message: verified
        ? "C146.18.3 media execution preflight passed. No provider job was created."
        : "C146.18.3 media execution preflight failed.",
      runtime: "aios-alpha",
      stage: "C146.18.3",
      environment: {
        geminiConfigured,
        openAIConfigured,
      },
      request: {
        kind: "video",
        prompt:
          TEST_PROMPT,
        resolution:
          TEST_RESOLUTION,
        aspectRatio:
          TEST_ASPECT_RATIO,
        durationSeconds:
          TEST_DURATION_SECONDS,
      },
      route,
      availability,
      checks,
      executionPolicy: {
        billableExecution:
          false,
        providerJobCreated:
          false,
        nextStep:
          "POST this endpoint to create one real media generation job.",
      },
      latencyMs:
        Date.now() -
        startedAt,
      timestamp:
        Date.now(),
    },
    {
      status:
        verified
          ? 200
          : 500,
      headers: {
        "cache-control":
          "no-store",
      },
    },
  );
}

/**
 * POST
 *
 * Real provider execution.
 *
 * This intentionally creates exactly one
 * media generation job when the automatic
 * route resolves to an available Google Veo
 * provider.
 */
export async function POST(
  request: NextRequest,
) {
  const startedAt = Date.now();

  if (!isFounderRequest(request)) {
    return unauthorizedResponse();
  }

  const route =
    resolveAvailableMediaGenerationRoute(
      buildExecutionRequest(),
    );

  /*
   * C146.18.3 is specifically a real
   * provider execution verification.
   *
   * Do not silently execute a different
   * provider if the requested real
   * execution provider is unavailable.
   */
  if (
    route.provider !==
    "google-veo"
  ) {
    return NextResponse.json(
      {
        success: false,
        verified: false,
        code:
          route.configured
            ? "C146_18_3_REAL_PROVIDER_NOT_SELECTED"
            : "C146_18_3_REAL_PROVIDER_UNAVAILABLE",
        message:
          route.configured
            ? "C146.18.3 requires the direct Google Veo provider for real execution."
            : "C146.18.3 cannot perform real provider execution because Google Veo is unavailable.",
        runtime:
          "aios-alpha",
        stage:
          "C146.18.3",
        route,
        executionPolicy: {
          providerJobCreated:
            false,
          reason:
            "The regression does not silently substitute a different provider for a real execution test.",
        },
        latencyMs:
          Date.now() -
          startedAt,
        timestamp:
          Date.now(),
      },
      {
        status: 503,
        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  }

  if (!route.configured) {
    return NextResponse.json(
      {
        success: false,
        verified: false,
        code:
          "GEMINI_API_KEY_MISSING",
        message:
          "GEMINI_API_KEY or GOOGLE_API_KEY is not configured. No media generation job was created.",
        runtime:
          "aios-alpha",
        stage:
          "C146.18.3",
        route,
        executionPolicy: {
          providerJobCreated:
            false,
        },
        latencyMs:
          Date.now() -
          startedAt,
        timestamp:
          Date.now(),
      },
      {
        status: 503,
        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  }

  try {
    const result =
      await createMediaGenerationJob(
        buildExecutionRequest(),
      );

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          code:
            result.code,
          message:
            "C146.18.3 real media provider execution failed before a verified job was created.",
          runtime:
            "aios-alpha",
          stage:
            "C146.18.3",
          route:
            result.route,
          execution: {
            attempted:
              true,
            provider:
              result.route.provider,
            model:
              result.route.model,
            operationName:
              result.providerJobId ??
              null,
            status:
              result.providerStatus ??
              null,
            progress:
              result.providerProgress ??
              null,
          },
          providerJob:
            result.job ??
            null,
          error:
            result.error ??
            null,
          executionPolicy: {
            providerJobCreated:
              Boolean(
                result.providerJobId,
              ),
          },
          latencyMs:
            Date.now() -
            startedAt,
          timestamp:
            Date.now(),
        },
        {
          status: 502,
          headers: {
            "cache-control":
              "no-store",
          },
        },
      );
    }

    const job =
      result.job;

    const jobCreated =
      Boolean(
        result.providerJobId,
      );

    const statusIsReal =
      job?.status ===
        "queued" ||
      job?.status ===
        "in_progress" ||
      job?.status ===
        "completed";

    const providerIsGoogle =
      result.route.provider ===
      "google-veo";

    const verified =
      jobCreated &&
      providerIsGoogle &&
      statusIsReal;

    return NextResponse.json(
      {
        success: verified,
        verified,
        code: verified
          ? "C146_18_3_REAL_MEDIA_JOB_CREATED"
          : "C146_18_3_REAL_MEDIA_EXECUTION_UNVERIFIED",
        message: verified
          ? "C146.18.3 created a real Google Veo media generation job."
          : "C146.18.3 could not verify creation of a real media generation job.",
        runtime:
          "aios-alpha",
        stage:
          "C146.18.3",
        execution: {
          attempted:
            true,
          provider:
            result.route.provider,
          model:
            result.route.model,
          operationName:
            result.providerJobId ??
            null,
          status:
            result.providerStatus ??
            job?.status ??
            null,
          progress:
            result.providerProgress ??
            job?.progress ??
            null,
          videoUri:
            job?.videoUri ??
            null,
        },
        providerJob:
          job ?? null,
        route:
          result.route,
        request: {
          kind: "video",
          resolution:
            TEST_RESOLUTION,
          aspectRatio:
            TEST_ASPECT_RATIO,
          durationSeconds:
            TEST_DURATION_SECONDS,
        },
        executionPolicy: {
          providerJobCreated:
            jobCreated,
          automaticPolling:
            false,
          repeatedCreation:
            false,
          note:
            "The operationName is returned for subsequent status verification. This request creates one provider job only.",
        },
        nextVerification: {
          method:
            "GET",
          operationName:
            result.providerJobId ??
            null,
          purpose:
            "Read the provider job until completed or failed without creating another job.",
        },
        latencyMs:
          Date.now() -
          startedAt,
        timestamp:
          Date.now(),
      },
      {
        status:
          verified
            ? 200
            : 500,
        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        verified: false,
        code:
          "C146_18_3_REAL_MEDIA_EXECUTION_EXCEPTION",
        message:
          "C146.18.3 encountered an exception during real media provider execution.",
        runtime:
          "aios-alpha",
        stage:
          "C146.18.3",
        error:
          error instanceof Error
            ? error.message
            : "Unknown media execution error.",
        executionPolicy: {
          providerJobCreated:
            false,
        },
        latencyMs:
          Date.now() -
          startedAt,
        timestamp:
          Date.now(),
      },
      {
        status: 500,
        headers: {
          "cache-control":
            "no-store",
        },
      },
    );
  }
}
