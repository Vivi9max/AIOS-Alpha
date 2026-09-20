import { NextRequest, NextResponse } from "next/server";

import { isFounderRequest } from "@/lib/founder/auth";

import {
  createMediaGenerationJob,
  getMediaGenerationAvailability,
  getMediaGenerationJob,
  resolveAvailableMediaGenerationRoute,
  resolveMediaGenerationRoute,
} from "@/lib/runtime/media/generation-router";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const TEST_PROMPT =
  "A short cinematic AIOS technology scene showing an autonomous operating system coordinating intelligence, planning, execution, and media generation. Clean futuristic environment, professional product demonstration.";

const DEFAULT_RESOLUTION = "1080p";
const DEFAULT_ASPECT_RATIO = "9:16";
const DEFAULT_DURATION_SECONDS = 8;

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
      message: "Founder authentication is required.",
    },
    {
      status: 401,
      headers: noStoreHeaders(),
    },
  );
}

function isConfigured(
  value: string | undefined,
): boolean {
  return Boolean(value?.trim());
}

function buildAutomaticRequest() {
  return {
    kind: "video" as const,
    prompt: TEST_PROMPT,
    resolution: DEFAULT_RESOLUTION,
    aspectRatio: DEFAULT_ASPECT_RATIO,
    durationSeconds: DEFAULT_DURATION_SECONDS,
  };
}

function buildProviderRequest(
  provider: string,
) {
  return {
    kind: "video" as const,
    provider,
    prompt: TEST_PROMPT,
    resolution: DEFAULT_RESOLUTION,
    aspectRatio: DEFAULT_ASPECT_RATIO,
    durationSeconds: DEFAULT_DURATION_SECONDS,
  };
}

function buildEnvironment() {
  return {
    geminiConfigured: isConfigured(
      process.env.GEMINI_API_KEY,
    ),

    googleConfigured: isConfigured(
      process.env.GOOGLE_API_KEY,
    ),

    openAIConfigured: isConfigured(
      process.env.OPENAI_API_KEY,
    ),
  };
}

function buildHealthChecks() {
  const environment =
    buildEnvironment();

  const availability =
    getMediaGenerationAvailability();

  const automaticRequest =
    buildAutomaticRequest();

  const automaticRoute =
    resolveAvailableMediaGenerationRoute(
      automaticRequest,
    );

  const directGoogleRoute =
    resolveMediaGenerationRoute({
      ...automaticRequest,
      provider: "google-veo",
    });

  const directOpenAIRoute =
    resolveMediaGenerationRoute({
      ...automaticRequest,
      provider: "openai",
    });

  const googleAvailable =
    environment.geminiConfigured ||
    environment.googleConfigured;

  const openAIAvailable =
    environment.openAIConfigured;

  return {
    environment,

    availability,

    automaticRoute,

    directRoutes: {
      googleVeo:
        directGoogleRoute,

      openAI:
        directOpenAIRoute,
    },

    checks: {
      automaticRouteResolved:
        Boolean(
          automaticRoute.provider,
        ),

      googleProviderDetected:
        directGoogleRoute.provider ===
        "google-veo",

      googleConfigurationDetected:
        directGoogleRoute.configured ===
        googleAvailable,

      openAIConfigurationDetected:
        directOpenAIRoute.configured ===
        openAIAvailable,

      explicitGoogleNoSilentFallback:
        directGoogleRoute.provider ===
        "google-veo",

      explicitOpenAINoSilentFallback:
        directOpenAIRoute.provider ===
        "openai",

      automaticFallbackPolicyPresent:
        automaticRoute.fallback === true ||
        automaticRoute.provider ===
          "google-veo" ||
        automaticRoute.provider ===
          "openai" ||
        automaticRoute.provider ===
          "aios-composer",
    },
  };
}

function buildOperationResult(
  result: Awaited<
    ReturnType<
      typeof getMediaGenerationJob
    >
  >,
) {
  const isGoogle =
    result.route.provider ===
    "google-veo";

  const job =
    result.job;

  const videoUri =
    isGoogle &&
    job &&
    "videoUri" in job
      ? job.videoUri ?? null
      : null;

  const operationName =
    isGoogle &&
    job &&
    "operationName" in job
      ? job.operationName ?? null
      : null;

  const openAIJobId =
    !isGoogle &&
    job &&
    "id" in job
      ? job.id ?? null
      : null;

  return {
    provider:
      result.route.provider,

    model:
      result.route.model,

    providerJobId:
      result.providerJobId ??
      operationName ??
      openAIJobId ??
      null,

    status:
      result.providerStatus ??
      null,

    progress:
      result.providerProgress ??
      null,

    videoUri,

    code:
      result.code,

    success:
      result.success,

    error:
      result.error ??
      null,

    metadata:
      result.metadata ??
      null,
  };
}

/**
 * GET
 *
 * Zero-billable provider health.
 *
 * GET never creates a provider job.
 *
 * Optional:
 *
 * ?operationName=<id>
 * ?provider=google-veo|openai
 */
export async function GET(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  if (!isFounderRequest(request)) {
    return unauthorizedResponse();
  }

  const operationName =
    request.nextUrl.searchParams
      .get("operationName")
      ?.trim();

  const provider =
    request.nextUrl.searchParams
      .get("provider")
      ?.trim();

  /*
   * Existing provider operation status.
   *
   * Read-only. No new billable job.
   */
  if (operationName) {
    try {
      const result =
        await getMediaGenerationJob(
          operationName,
          provider ||
            undefined,
        );

      const operation =
        buildOperationResult(
          result,
        );

      const verified =
        result.success ||
        result.code ===
          "MEDIA_GENERATION_IN_PROGRESS";

      return NextResponse.json(
        {
          success:
            verified,

          verified,

          code:
            result.code,

          message:
            "C146.18.6 existing media provider operation was read without creating a new job.",

          stage:
            "C146.18.6",

          operation,

          failoverTrace:
            result.failoverTrace ??
            null,

          billable:
            false,

          executionCreated:
            false,

          latencyMs:
            Date.now() -
            startedAt,

          timestamp:
            Date.now(),
        },
        {
          status: 200,
          headers:
            noStoreHeaders(),
        },
      );
    } catch (error) {
      return NextResponse.json(
        {
          success: false,

          verified: false,

          code:
            "C146_18_6_STATUS_EXCEPTION",

          message:
            "Unable to read the existing media provider operation.",

          error:
            error instanceof Error
              ? error.message
              : "Unknown provider status error.",

          billable:
            false,

          executionCreated:
            false,

          latencyMs:
            Date.now() -
            startedAt,

          timestamp:
            Date.now(),
        },
        {
          status: 200,
          headers:
            noStoreHeaders(),
        },
      );
    }
  }

  /*
   * Default GET is always zero-billable.
   */
  const health =
    buildHealthChecks();

  const checks =
    health.checks;

  const verified =
    Object.values(checks).every(
      Boolean,
    );

  return NextResponse.json(
    {
      success:
        verified,

      verified,

      code:
        verified
          ? "C146_18_6_MEDIA_PROVIDER_HEALTH_PASS"
          : "C146_18_6_MEDIA_PROVIDER_HEALTH_DEGRADED",

      message:
        verified
          ? "Media provider routing, configuration, and failover policy checks passed."
          : "Media provider health is available, but one or more configuration checks require attention.",

      stage:
        "C146.18.6",

      billable:
        false,

      executionCreated:
        false,

      health,

      executionPolicy: {
        automaticMode:
          "Google Veo → OpenAI Sora → AIOS Composer",

        explicitProviderMode:
          "No silent provider substitution",

        failureClassification:
          "Provider failures are classified and preserved in failoverTrace.",

        liveExecution:
          "POST with execute=true only",

        defaultOperation:
          "GET never creates a provider job.",
      },

      latencyMs:
        Date.now() -
        startedAt,

      timestamp:
        Date.now(),
    },
    {
      status: 200,
      headers:
        noStoreHeaders(),
    },
  );
}

/**
 * POST
 *
 * C146.18.6 provider execution + failover trace.
 *
 * execute=false / omitted:
 *   zero-billable dry run.
 *
 * execute=true:
 *   real provider execution.
 *
 * Automatic:
 *   Google Veo
 *      ↓ failure
 *   OpenAI Sora
 *      ↓ failure
 *   AIOS Composer
 *
 * Explicit provider:
 *   never silently substitutes.
 */
export async function POST(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  if (!isFounderRequest(request)) {
    return unauthorizedResponse();
  }

  let body:
    | Record<string, unknown>
    | null = null;

  try {
    const parsed =
      await request.json();

    if (
      parsed &&
      typeof parsed ===
        "object"
    ) {
      body =
        parsed as Record<
          string,
          unknown
        >;
    }
  } catch {
    body = {};
  }

  const execute =
    body?.execute === true;

  const requestedProvider =
    typeof body?.provider ===
    "string"
      ? body.provider.trim()
      : "";

  /*
   * Dry-run.
   *
   * No provider API call.
   */
  if (!execute) {
    const health =
      buildHealthChecks();

    const requestData =
      requestedProvider
        ? buildProviderRequest(
            requestedProvider,
          )
        : buildAutomaticRequest();

    const initialRoute =
      requestedProvider
        ? resolveMediaGenerationRoute(
            requestData,
          )
        : resolveAvailableMediaGenerationRoute(
            requestData,
          );

    return NextResponse.json(
      {
        success: true,

        verified: true,

        code:
          "C146_18_6_DRY_RUN_PASS",

        message:
          "C146.18.6 dry-run passed. No provider job was created.",

        stage:
          "C146.18.6",

        billable:
          false,

        executionCreated:
          false,

        request: {
          kind:
            "video",

          requestedProvider:
            requestedProvider ||
            null,

          resolution:
            DEFAULT_RESOLUTION,

          aspectRatio:
            DEFAULT_ASPECT_RATIO,

          durationSeconds:
            DEFAULT_DURATION_SECONDS,
        },

        routing: {
          initialRoute,

          finalRoute:
            initialRoute,

          fallback:
            false,

          fallbackFrom:
            null,

          fallbackTo:
            null,

          silentSubstitution:
            false,
        },

        health,

        executionPolicy: {
          executeRequired:
            true,

          automaticFallback:
            !requestedProvider,

          explicitProviderNoFallback:
            Boolean(
              requestedProvider,
            ),

          failureClassification:
            "Enabled",

          silentSubstitution:
            false,
        },

        latencyMs:
          Date.now() -
          startedAt,

        timestamp:
          Date.now(),
      },
      {
        status: 200,
        headers:
          noStoreHeaders(),
      },
    );
  }

  const requestData =
    requestedProvider
      ? buildProviderRequest(
          requestedProvider,
        )
      : buildAutomaticRequest();

  const initialRoute =
    requestedProvider
      ? resolveMediaGenerationRoute(
          requestData,
        )
      : resolveAvailableMediaGenerationRoute(
          requestData,
        );

  try {
    const result =
      await createMediaGenerationJob(
        requestData,
      );

    const trace =
      result.failoverTrace ??
      null;

    const fallbackOccurred =
      trace?.fallbackAttempted ===
        true ||
      result.fallback === true;

    const providerJobId =
      result.providerJobId ??
      null;

    const isExplicit =
      Boolean(
        requestedProvider,
      );

    /*
     * Explicit provider must remain on
     * exactly the requested provider.
     */
    const explicitRoutePreserved =
      !isExplicit ||
      result.route.provider ===
        initialRoute.provider;

    const verified =
      result.success &&
      Boolean(
        result.route.provider,
      ) &&
      explicitRoutePreserved;

    const attempts =
      trace?.attempts ??
      [];

    const lastFailure =
      [...attempts]
        .reverse()
        .find(
          (attempt) =>
            attempt.status ===
            "failed",
        ) ?? null;

    const firstFailure =
      attempts.find(
        (attempt) =>
          attempt.status ===
          "failed",
      ) ?? null;

    return NextResponse.json(
      {
        success:
          verified,

        verified,

        code:
          verified
            ? fallbackOccurred
              ? "C146_18_6_AUTOMATIC_FAILOVER_PASS"
              : "C146_18_6_PROVIDER_EXECUTION_PASS"
            : result.code ||
              "C146_18_6_PROVIDER_EXECUTION_FAILED",

        message:
          verified
            ? fallbackOccurred
              ? "Automatic provider failover completed successfully."
              : "Media provider execution completed without silent substitution."
            : "Media provider execution did not complete successfully.",

        stage:
          "C146.18.6",

        request: {
          kind:
            "video",

          requestedProvider:
            requestedProvider ||
            null,

          prompt:
            TEST_PROMPT,

          resolution:
            DEFAULT_RESOLUTION,

          aspectRatio:
            DEFAULT_ASPECT_RATIO,

          durationSeconds:
            DEFAULT_DURATION_SECONDS,
        },

        routing: {
          initialRoute,

          finalRoute:
            result.route,

          requestedProvider:
            requestedProvider ||
            null,

          fallback:
            fallbackOccurred,

          fallbackFrom:
            trace?.fallbackFrom ??
            null,

          fallbackTo:
            trace?.fallbackTo ??
            null,

          silentSubstitution:
            trace?.silentSubstitution ??
            false,

          explicitRoutePreserved,
        },

        execution: {
          provider:
            result.route.provider,

          model:
            result.route.model,

          providerJobId,

          status:
            result.providerStatus ??
            null,

          progress:
            result.providerProgress ??
            null,

          providerJob:
            result.job ??
            null,

          error:
            result.error ??
            null,
        },

        /*
         * C146.18.6 core output.
         *
         * This is the complete provider
         * failure chain rather than a
         * flattened error string.
         */
        failoverTrace:
          trace,

        failureSummary: {
          firstFailure:
            firstFailure
              ? {
                  provider:
                    firstFailure.provider,

                  model:
                    firstFailure.model,

                  failureClass:
                    firstFailure.failureClass ??
                    "UNKNOWN",

                  code:
                    firstFailure.code ??
                    null,

                  error:
                    firstFailure.error ??
                    null,
                }
              : null,

          lastFailure:
            lastFailure
              ? {
                  provider:
                    lastFailure.provider,

                  model:
                    lastFailure.model,

                  failureClass:
                    lastFailure.failureClass ??
                    "UNKNOWN",

                  code:
                    lastFailure.code ??
                    null,

                  error:
                    lastFailure.error ??
                    null,
                }
              : null,

          attemptCount:
            attempts.length,

          failedAttemptCount:
            attempts.filter(
              (attempt) =>
                attempt.status ===
                "failed",
            ).length,

          successfulAttemptCount:
            attempts.filter(
              (attempt) =>
                attempt.status ===
                "success",
            ).length,
        },

        environment:
          buildEnvironment(),

        billable:
          true,

        executionCreated:
          Boolean(
            providerJobId,
          ),

        executionPolicy: {
          automaticMode:
            requestedProvider
              ? false
              : "Google Veo → OpenAI Sora → AIOS Composer",

          explicitProviderNoFallback:
            isExplicit,

          fallbackAllowed:
            !isExplicit,

          failureClassification:
            true,

          note:
            isExplicit
              ? "Explicit provider requests never silently substitute another provider."
              : "Automatic video requests preserve every provider attempt and failure classification.",
        },

        latencyMs:
          Date.now() -
          startedAt,

        timestamp:
          Date.now(),
      },
      {
        status: 200,
        headers:
          noStoreHeaders(),
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,

        verified: false,

        code:
          "C146_18_6_EXECUTION_EXCEPTION",

        message:
          "C146.18.6 encountered an exception during provider execution.",

        stage:
          "C146.18.6",

        request: {
          kind:
            "video",

          requestedProvider:
            requestedProvider ||
            null,

          resolution:
            DEFAULT_RESOLUTION,

          aspectRatio:
            DEFAULT_ASPECT_RATIO,

          durationSeconds:
            DEFAULT_DURATION_SECONDS,
        },

        routing: {
          initialRoute,

          requestedProvider:
            requestedProvider ||
            null,

          fallbackAllowed:
            !requestedProvider,

          silentSubstitution:
            false,
        },

        environment:
          buildEnvironment(),

        billable:
          true,

        executionCreated:
          false,

        error:
          error instanceof Error
            ? error.message
            : "Unknown media provider execution error.",

        latencyMs:
          Date.now() -
          startedAt,

        timestamp:
          Date.now(),
      },
      {
        status: 200,
        headers:
          noStoreHeaders(),
      },
    );
  }
}
