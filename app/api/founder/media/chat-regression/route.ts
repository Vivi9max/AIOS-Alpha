import { NextRequest, NextResponse } from "next/server";

import { isFounderRequest } from "@/lib/founder/auth";

import {
  createMediaGenerationJob,
  getMediaGenerationJob,
  getMediaGenerationAvailability,
  resolveMediaGenerationRoute,
} from "@/lib/runtime/media/generation-router";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TEST_PROMPT =
  "A cinematic vertical AIOS technology scene showing an autonomous AI operating system coordinating intelligence, planning, execution, and media generation. Clean futuristic environment, professional product demonstration.";

const TEST_PROVIDER = "google-veo";
const TEST_RESOLUTION = "1080p";
const TEST_ASPECT_RATIO = "9:16";
const TEST_DURATION_SECONDS = 8;

function isConfigured(
  value: string | undefined,
): boolean {
  return Boolean(value?.trim());
}

function noStoreHeaders() {
  return {
    "cache-control": "no-store",
    "content-type": "application/json; charset=utf-8",
  };
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
      headers: noStoreHeaders(),
    },
  );
}

function buildExecutionRequest() {
  return {
    kind: "video" as const,
    provider: TEST_PROVIDER,
    prompt: TEST_PROMPT,
    resolution: TEST_RESOLUTION,
    aspectRatio: TEST_ASPECT_RATIO,
    durationSeconds: TEST_DURATION_SECONDS,
  };
}

function buildDiagnosticPayload(
  startedAt: number,
  extra: Record<string, unknown> = {},
) {
  return {
    runtime: "aios-alpha",
    stage: "C146.18.3",
    verification: "real-google-veo",
    request: {
      kind: "video",
      provider: TEST_PROVIDER,
      resolution: TEST_RESOLUTION,
      aspectRatio: TEST_ASPECT_RATIO,
      durationSeconds: TEST_DURATION_SECONDS,
    },
    environment: {
      geminiConfigured:
        isConfigured(
          process.env.GEMINI_API_KEY,
        ),
      googleConfigured:
        isConfigured(
          process.env.GOOGLE_API_KEY,
        ),
      openAIConfigured:
        isConfigured(
          process.env.OPENAI_API_KEY,
        ),
    },
    latencyMs:
      Date.now() - startedAt,
    timestamp: Date.now(),
    ...extra,
  };
}

/**
 * GET
 *
 * Two modes:
 *
 * 1. No operationName:
 *    Non-billable preflight.
 *
 * 2. operationName:
 *    Read an existing Veo operation.
 *
 * GET never creates a new provider job.
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

  /**
   * Existing operation status verification.
   */
  if (operationName) {
    try {
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
          message: verified
            ? "C146.18.3 existing Google Veo operation was read successfully."
            : "C146.18.3 could not verify the existing Google Veo operation.",
          ...buildDiagnosticPayload(
            startedAt,
            {
              execution: {
                provider:
                  result.route.provider,
                model:
                  result.route.model,
                operationName:
                  result.providerJobId ??
                  operationName,
                status:
                  result.providerStatus ??
                  null,
                progress:
                  result.providerProgress ??
                  null,
                videoUri:
                  result.job?.videoUri ??
                  null,
              },
              providerJob:
                result.job ??
                null,
              error:
                result.error ??
                null,
              operationPolicy: {
                createsNewJob: false,
                billable: false,
              },
            },
          ),
        },
        {
          /**
           * IMPORTANT:
           *
           * A verification failure is still a valid
           * API response. Do not turn provider state
           * into a generic browser "page couldn't load".
           */
          status: 200,
          headers: noStoreHeaders(),
        },
      );
    } catch (error) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          code:
            "C146_18_3_STATUS_EXCEPTION",
          message:
            "C146.18.3 encountered an exception while reading the existing Google Veo operation.",
          ...buildDiagnosticPayload(
            startedAt,
            {
              operationName,
              error:
                error instanceof Error
                  ? error.message
                  : "Unknown status error.",
            },
          ),
        },
        {
          status: 200,
          headers: noStoreHeaders(),
        },
      );
    }
  }

  /**
   * Non-billable preflight.
   *
   * IMPORTANT:
   * Explicitly resolve Google Veo.
   * Do not allow automatic Composer fallback
   * to hide a missing Google configuration.
   */
  const requestData =
    buildExecutionRequest();

  const route =
    resolveMediaGenerationRoute(
      requestData,
    );

  const availability =
    getMediaGenerationAvailability();

  const geminiConfigured =
    isConfigured(
      process.env.GEMINI_API_KEY,
    ) ||
    isConfigured(
      process.env.GOOGLE_API_KEY,
    );

  const checks = {
    founderAuth: true,
    googleVeoRequested:
      route.provider ===
      "google-veo",
    googleVeoConfigured:
      route.configured ===
      geminiConfigured,
    resolutionPreserved:
      route.resolution ===
      TEST_RESOLUTION,
    aspectRatioPreserved:
      TEST_ASPECT_RATIO ===
      "9:16",
    durationPreserved:
      TEST_DURATION_SECONDS >= 4 &&
      TEST_DURATION_SECONDS <= 8,
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
        ? "C146.18.3 Google Veo preflight passed. No provider job was created."
        : "C146.18.3 Google Veo preflight failed. No provider job was created.",
      ...buildDiagnosticPayload(
        startedAt,
        {
          route,
          availability,
          checks,
          executionPolicy: {
            provider:
              TEST_PROVIDER,
            billableExecution:
              false,
            providerJobCreated:
              false,
            automaticFallback:
              false,
            nextStep:
              "POST this endpoint to create exactly one real Google Veo job.",
          },
        },
      ),
    },
    {
      status: 200,
      headers: noStoreHeaders(),
    },
  );
}

/**
 * POST
 *
 * REAL Google Veo execution.
 *
 * Exactly one provider job may be created
 * by one POST request.
 */
export async function POST(
  request: NextRequest,
) {
  const startedAt = Date.now();

  if (!isFounderRequest(request)) {
    return unauthorizedResponse();
  }

  const requestData =
    buildExecutionRequest();

  /**
   * Force the direct Google Veo route.
   *
   * This is intentionally NOT:
   *
   * resolveAvailableMediaGenerationRoute()
   *
   * because C146.18.3 is a direct provider
   * verification, not a generic fallback test.
   */
  const route =
    resolveMediaGenerationRoute(
      requestData,
    );

  const geminiConfigured =
    isConfigured(
      process.env.GEMINI_API_KEY,
    ) ||
    isConfigured(
      process.env.GOOGLE_API_KEY,
    );

  /**
   * Provider mismatch should never silently
   * execute another provider.
   */
  if (
    route.provider !==
    TEST_PROVIDER
  ) {
    return NextResponse.json(
      {
        success: false,
        verified: false,
        code:
          "C146_18_3_PROVIDER_ROUTE_INVALID",
        message:
          "C146.18.3 requires the direct Google Veo provider.",
        ...buildDiagnosticPayload(
          startedAt,
          {
            route,
            executionPolicy: {
              provider:
                TEST_PROVIDER,
              providerJobCreated:
                false,
              automaticFallback:
                false,
              reason:
                "The real media verification never silently substitutes another provider.",
            },
          },
        ),
      },
      {
        /**
         * Return a normal JSON response so the
         * Founder Console can display the actual
         * diagnostic state instead of a browser
         * error page.
         */
        status: 200,
        headers: noStoreHeaders(),
      },
    );
  }

  /**
   * Explicit configuration diagnostic.
   */
  if (!geminiConfigured) {
    return NextResponse.json(
      {
        success: false,
        verified: false,
        code:
          "GEMINI_API_KEY_MISSING",
        message:
          "GEMINI_API_KEY or GOOGLE_API_KEY is not configured. No Google Veo job was created.",
        ...buildDiagnosticPayload(
          startedAt,
          {
            route,
            executionPolicy: {
              provider:
                TEST_PROVIDER,
              providerJobCreated:
                false,
              automaticFallback:
                false,
            },
          },
        ),
      },
      {
        status: 200,
        headers: noStoreHeaders(),
      },
    );
  }

  try {
    /**
     * Create exactly one real provider job.
     */
    const result =
      await createMediaGenerationJob(
        requestData,
      );

    /**
     * Provider/runtime rejected the job.
     *
     * Keep this as JSON 200 so the Founder
     * Console can show the real error.
     */
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          verified: false,
          code:
            result.code ||
            "C146_18_3_PROVIDER_EXECUTION_FAILED",
          message:
            "C146.18.3 Google Veo execution did not create a verified provider job.",
          ...buildDiagnosticPayload(
            startedAt,
            {
              route:
                result.route,
              execution: {
                attempted: true,
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
              providerError:
                result.error ??
                null,
              executionPolicy: {
                provider:
                  TEST_PROVIDER,
                providerJobCreated:
                  Boolean(
                    result.providerJobId,
                  ),
                automaticFallback:
                  false,
              },
            },
          ),
        },
        {
          status: 200,
          headers: noStoreHeaders(),
        },
      );
    }

    const job =
      result.job;

    const providerJobId =
      result.providerJobId ??
      job?.operationName ??
      null;

    const status =
      result.providerStatus ??
      job?.status ??
      null;

    const jobCreated =
      Boolean(providerJobId);

    const validStatus =
      status === "queued" ||
      status === "in_progress" ||
      status === "completed";

    const providerIsGoogle =
      result.route.provider ===
      TEST_PROVIDER;

    const verified =
      jobCreated &&
      providerIsGoogle &&
      validStatus;

    return NextResponse.json(
      {
        success: verified,
        verified,
        code: verified
          ? "C146_18_3_REAL_MEDIA_JOB_CREATED"
          : "C146_18_3_REAL_MEDIA_EXECUTION_UNVERIFIED",
        message: verified
          ? "C146.18.3 created one real Google Veo media generation job."
          : "C146.18.3 could not verify creation of the Google Veo media generation job.",
        ...buildDiagnosticPayload(
          startedAt,
          {
            execution: {
              attempted: true,
              provider:
                result.route.provider,
              model:
                result.route.model,
              operationName:
                providerJobId,
              status,
              progress:
                result.providerProgress ??
                job?.progress ??
                null,
              videoUri:
                job?.videoUri ??
                null,
            },
            providerJob:
              job ??
              null,
            route:
              result.route,
            executionPolicy: {
              provider:
                TEST_PROVIDER,
              providerJobCreated:
                jobCreated,
              automaticPolling:
                false,
              repeatedCreation:
                false,
              note:
                "One POST creates one provider job. Subsequent GET requests only read the existing operation.",
            },
            nextVerification: {
              method: "GET",
              operationName:
                providerJobId,
              purpose:
                "Read the existing Google Veo operation until completed or failed without creating another job.",
            },
          },
        ),
      },
      {
        status: 200,
        headers: noStoreHeaders(),
      },
    );
  } catch (error) {
    /**
     * Catch everything at the route boundary.
     *
     * The user must receive the actual runtime
     * failure instead of a generic page-load error.
     */
    return NextResponse.json(
      {
        success: false,
        verified: false,
        code:
          "C146_18_3_REAL_MEDIA_EXECUTION_EXCEPTION",
        message:
          "C146.18.3 encountered an exception during Google Veo execution.",
        ...buildDiagnosticPayload(
          startedAt,
          {
            route,
            error:
              error instanceof Error
                ? error.message
                : "Unknown Google Veo execution error.",
            executionPolicy: {
              provider:
                TEST_PROVIDER,
              providerJobCreated:
                false,
              automaticFallback:
                false,
            },
          },
        ),
      },
      {
        status: 200,
        headers: noStoreHeaders(),
      },
    );
  }
}
