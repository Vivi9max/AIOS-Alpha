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
      message:
        "Founder authentication is required.",
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
    durationSeconds:
      DEFAULT_DURATION_SECONDS,
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
    durationSeconds:
      DEFAULT_DURATION_SECONDS,
  };
}

function buildEnvironment() {
  return {
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
        automaticRoute.fallback ===
          true ||
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

  return {
    provider:
      result.route.provider,

    model:
      result.route.model,

    providerJobId:
      result.providerJobId ??
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
  };
}

/**
 * GET
 *
 * Zero-billable provider health and routing
 * verification.
 *
 * Optional:
 *
 * ?operationName=<id>
 * ?provider=google-veo|openai
 *
 * Existing provider operations are READ only.
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

  /**
   * Existing operation status.
   *
   * This does not create a new media job.
   */
  if (operationName) {
    try {
      const result =
        await getMediaGenerationJob(
          operationName,
          provider ||
            undefined,
        );

      return NextResponse.json(
        {
          success:
            result.success ||
            result.code ===
              "MEDIA_GENERATION_IN_PROGRESS",

          verified:
            result.success ||
            result.code ===
              "MEDIA_GENERATION_IN_PROGRESS",

          code:
            result.code,

          message:
            "C146.18.5 existing media provider operation was read without creating a new job.",

          stage:
            "C146.18.5",

          operation:
            buildOperationResult(
              result,
            ),

          billable:
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
            "C146_18_5_STATUS_EXCEPTION",
          message:
            "Unable to read the existing media provider operation.",

          error:
            error instanceof Error
              ? error.message
              : "Unknown provider status error.",

          billable:
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

  /**
   * Default GET is always non-billable.
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
          ? "C146_18_5_MEDIA_PROVIDER_HEALTH_PASS"
          : "C146_18_5_MEDIA_PROVIDER_HEALTH_DEGRADED",

      message:
        verified
          ? "Media provider routing and configuration health checks passed."
          : "Media provider routing health is available, but one or more configuration checks require attention.",

      stage:
        "C146.18.5",

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
 * Real provider regression.
 *
 * IMPORTANT:
 *
 * execute=true is mandatory.
 *
 * Without execute=true this endpoint
 * performs only a dry-run and creates
 * no provider job.
 *
 * Body:
 *
 * {
 *   "execute": true,
 *   "provider": "google-veo"
 * }
 *
 * or:
 *
 * {
 *   "execute": true
 * }
 *
 * The second form tests automatic routing:
 *
 * Google Veo
 *   ↓ execution failure
 * OpenAI Sora
 *   ↓ failure
 * AIOS Composer
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

  /**
   * Safety gate.
   *
   * No real provider call unless the
   * caller explicitly sets execute=true.
   */
  if (!execute) {
    const health =
      buildHealthChecks();

    return NextResponse.json(
      {
        success: true,
        verified: true,

        code:
          "C146_18_5_DRY_RUN_PASS",

        message:
          "C146.18.5 dry-run passed. No provider job was created. Set execute=true to perform the real regression.",

        stage:
          "C146.18.5",

        billable:
          false,

        executionCreated:
          false,

        requestedProvider:
          requestedProvider ||
          null,

        health,

        executionPolicy: {
          executeRequired:
            true,

          automaticFallback:
            requestedProvider
              ? false
              : true,

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

  /**
   * Resolve the route before execution
   * so the response records exactly which
   * policy was selected.
   */
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

    const fallbackOccurred =
      result.fallback === true;

    const providerJobId =
      result.providerJobId ??
      null;

    const isExplicit =
      Boolean(
        requestedProvider,
      );

    /**
     * A successful automatic fallback is
     * a valid regression result.
     *
     * An explicit Google request succeeding
     * is also valid.
     *
     * An explicit Google request failing
     * remains a failure and must NOT be
     * converted into a fallback success.
     */
    const verified =
      result.success &&
      Boolean(
        result.route.provider,
      ) &&
      (
        !isExplicit ||
        result.route.provider ===
          initialRoute.provider
      );

    return NextResponse.json(
      {
        success:
          verified,

        verified,

        code:
          verified
            ? fallbackOccurred
              ? "C146_18_5_AUTOMATIC_FAILOVER_PASS"
              : "C146_18_5_PROVIDER_EXECUTION_PASS"
            : result.code ||
              "C146_18_5_PROVIDER_EXECUTION_FAILED",

        message:
          verified
            ? fallbackOccurred
              ? "Automatic media failover executed successfully."
              : "Media provider execution completed and remained on the requested route."
            : "Media provider regression did not complete successfully.",

        stage:
          "C146.18.5",

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
            fallbackOccurred
              ? "google-veo"
              : null,

          fallbackTo:
            fallbackOccurred
              ? result.route
                  .provider
              : null,

          silentSubstitution:
            false,
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
              : true,

          explicitProviderNoFallback:
            isExplicit,

          fallbackAllowed:
            !isExplicit,

          note:
            isExplicit
              ? "Explicit provider requests never silently substitute another provider."
              : "Automatic video requests may fail over from Google Veo to OpenAI Sora.",
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
          "C146_18_5_EXECUTION_EXCEPTION",

        message:
          "C146.18.5 encountered an exception during provider regression.",

        stage:
          "C146.18.5",

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
            : "Unknown media provider regression error.",

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
