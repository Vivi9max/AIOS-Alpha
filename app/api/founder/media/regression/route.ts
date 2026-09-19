import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  isFounderRequest,
} from "@/lib/founder/auth";

import {
  APP_CONFIG,
} from "@/lib/config/app";

import {
  getMediaGenerationAvailability,
  getMediaGenerationRoutes,
  resolveMediaGenerationRoute,
  resolveAvailableMediaGenerationRoute,
} from "@/lib/runtime/media/generation-router";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PASS_CODE =
  "C146_17_MEDIA_ROUTER_REGRESSION_PASS";

const FAIL_CODE =
  "C146_17_MEDIA_ROUTER_REGRESSION_FAILED";

function json(
  body: Record<string, unknown>,
  status = 200,
) {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function runtimeMeta() {
  return {
    runtime: APP_CONFIG.runtimeId,
    runtimeVersion: APP_CONFIG.version,
    release: APP_CONFIG.release,
  };
}

function same(
  left: unknown,
  right: unknown,
): boolean {
  return left === right;
}

export async function GET(
  request: NextRequest,
) {
  const startedAt = Date.now();

  if (!isFounderRequest(request)) {
    return json(
      {
        success: false,
        verified: false,
        code: "FOUNDER_AUTH_REQUIRED",
        message:
          "Founder authentication is required.",
        ...runtimeMeta(),
        timestamp: Date.now(),
        latencyMs: Date.now() - startedAt,
      },
      401,
    );
  }

  try {
    const availability =
      getMediaGenerationAvailability();

    const routes =
      getMediaGenerationRoutes();

    const autoRoute =
      resolveAvailableMediaGenerationRoute({
        kind: "video",
        prompt:
          "C146.17 media router regression",
        resolution: "1080p",
        aspectRatio: "9:16",
        durationSeconds: 8,
      });

    const explicitGoogle =
      resolveMediaGenerationRoute({
        kind: "video",
        prompt:
          "C146.17 explicit Google regression",
        provider: "google-veo",
        resolution: "1080p",
        aspectRatio: "16:9",
        durationSeconds: 8,
      });

    const explicitComposer =
      resolveMediaGenerationRoute({
        kind: "video",
        prompt:
          "C146.17 explicit Composer regression",
        provider: "aios-composer",
        resolution: "720p",
        aspectRatio: "9:16",
        durationSeconds: 8,
      });

    const explicitOpenAI =
      resolveMediaGenerationRoute({
        kind: "video",
        prompt:
          "C146.17 explicit OpenAI regression",
        provider: "openai",
        resolution: "1080p",
        aspectRatio: "16:9",
        durationSeconds: 8,
      });

    const googleAvailability =
      availability.find(
        (item) =>
          item.provider ===
          "google-veo",
      );

    const composerAvailability =
      availability.find(
        (item) =>
          item.provider ===
          "aios-composer",
      );

    /*
     * Automatic routing:
     *
     * GEMINI_API_KEY configured
     *   -> google-veo
     *
     * GEMINI_API_KEY missing
     *   -> aios-composer
     */
    const expectedAutomaticProvider =
      googleAvailability?.configured
        ? "google-veo"
        : "aios-composer";

    const checks = {
      auth: true,

      routerLoaded:
        routes.length > 0,

      availabilityReturned:
        availability.length >= 2,

      googleRoutePresent:
        Boolean(
          googleAvailability,
        ),

      composerRoutePresent:
        Boolean(
          composerAvailability,
        ),

      automaticRouting:
        same(
          autoRoute.provider,
          expectedAutomaticProvider,
        ),

      automaticFallbackFlag:
        googleAvailability?.configured
          ? autoRoute.fallback !== true
          : autoRoute.provider ===
              "aios-composer" &&
            autoRoute.fallback === true,

      explicitGoogleHonored:
        explicitGoogle.provider ===
        "google-veo" &&
        explicitGoogle.fallback !== true,

      explicitComposerHonored:
        explicitComposer.provider ===
        "aios-composer",

      explicitOpenAIHonored:
        explicitOpenAI.provider ===
        "openai",

      resolutionPreserved:
        explicitComposer.resolution ===
          "720p" &&
        explicitGoogle.resolution ===
          "1080p",

      routeConfiguredFlagsValid:
        typeof autoRoute.configured ===
          "boolean" &&
        typeof explicitGoogle.configured ===
          "boolean" &&
        typeof explicitComposer.configured ===
          "boolean",

      finalRegressionPass: false,
    };

    checks.finalRegressionPass =
      checks.auth &&
      checks.routerLoaded &&
      checks.availabilityReturned &&
      checks.googleRoutePresent &&
      checks.composerRoutePresent &&
      checks.automaticRouting &&
      checks.automaticFallbackFlag &&
      checks.explicitGoogleHonored &&
      checks.explicitComposerHonored &&
      checks.explicitOpenAIHonored &&
      checks.resolutionPreserved &&
      checks.routeConfiguredFlagsValid;

    const latencyMs =
      Date.now() - startedAt;

    return json(
      {
        success:
          checks.finalRegressionPass,

        verified:
          checks.finalRegressionPass,

        code:
          checks.finalRegressionPass
            ? PASS_CODE
            : FAIL_CODE,

        message:
          checks.finalRegressionPass
            ? "AIOS Media Generation Router regression passed."
            : "AIOS Media Generation Router regression failed.",

        ...runtimeMeta(),

        timestamp: Date.now(),

        latencyMs,

        environment: {
          geminiConfigured:
            Boolean(
              googleAvailability?.configured,
            ),

          openAIConfigured:
            Boolean(
              composerAvailability?.configured,
            ),
        },

        automaticRoute: autoRoute,

        explicitRoutes: {
          google: explicitGoogle,
          composer: explicitComposer,
          openai: explicitOpenAI,
        },

        availability,

        routes,

        checks,
      },
      checks.finalRegressionPass
        ? 200
        : 422,
    );
  } catch (error) {
    return json(
      {
        success: false,
        verified: false,
        code:
          "C146_17_MEDIA_ROUTER_RUNTIME_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Media router regression failed.",
        ...runtimeMeta(),
        timestamp: Date.now(),
        latencyMs: Date.now() - startedAt,
        checks: {
          auth: true,
          routerLoaded: false,
          availabilityReturned: false,
          googleRoutePresent: false,
          composerRoutePresent: false,
          automaticRouting: false,
          automaticFallbackFlag: false,
          explicitGoogleHonored: false,
          explicitComposerHonored: false,
          explicitOpenAIHonored: false,
          resolutionPreserved: false,
          routeConfiguredFlagsValid: false,
          finalRegressionPass: false,
        },
      },
      500,
    );
  }
}
