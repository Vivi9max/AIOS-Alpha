import { NextRequest, NextResponse } from "next/server";

import { isFounderRequest } from "@/lib/founder/auth";
import {
  getMediaGenerationAvailability,
  resolveAvailableMediaGenerationRoute,
} from "@/lib/runtime/media/generation-router";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isConfigured(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export async function GET(request: NextRequest) {
  const startedAt = Date.now();

  if (!isFounderRequest(request)) {
    return NextResponse.json(
      {
        success: false,
        verified: false,
        code: "FOUNDER_AUTH_REQUIRED",
        message: "Founder authentication is required.",
      },
      {
        status: 401,
        headers: { "cache-control": "no-store" },
      },
    );
  }

  const prompt = "C146.18 Chat media router regression";
  const resolution = "1080p";
  const aspectRatio = "9:16";
  const durationSeconds = 8;

  const availability = getMediaGenerationAvailability();

  const route = resolveAvailableMediaGenerationRoute({
    kind: "video",
    prompt,
    resolution,
    aspectRatio,
    durationSeconds,
  });

  const geminiConfigured = isConfigured(
    process.env.GEMINI_API_KEY,
  );

  const openAIConfigured = isConfigured(
    process.env.OPENAI_API_KEY,
  );

  const automaticRouteIsKnownProvider =
    route.provider === "google-veo" ||
    route.provider === "aios-composer";

  const primaryRouteCorrect =
    geminiConfigured
      ? route.provider === "google-veo" &&
        route.configured === true
      : route.provider === "aios-composer" &&
        route.fallback === true &&
        route.configured === openAIConfigured;

  const resolutionPreserved =
    route.resolution === resolution;

  const providerAvailabilityIsConsistent =
    availability.some(
      (item) =>
        item.provider === route.provider &&
        item.available === route.configured,
    );

  const composerAvailabilityIsConsistent =
    availability.some(
      (item) =>
        item.provider === "aios-composer" &&
        item.available === openAIConfigured,
    );

  const checks = {
    auth: true,
    availabilityReturned: Array.isArray(availability),
    routerLoaded: route.provider.length > 0,
    automaticRouteIsKnownProvider,
    primaryRouteCorrect,
    resolutionPreserved,
    providerAvailabilityIsConsistent,
    composerAvailabilityIsConsistent,
  };

  const verified = Object.values(checks).every(Boolean);

  return NextResponse.json(
    {
      success: verified,
      verified,
      code: verified
        ? "C146_18_2_MEDIA_CHAT_RUNTIME_VERIFICATION_PASS"
        : "C146_18_2_MEDIA_CHAT_RUNTIME_VERIFICATION_FAILED",
      message: verified
        ? "C146.18.2 Chat → Media Router runtime contract verification passed."
        : "C146.18.2 Chat → Media Router runtime contract verification failed.",
      runtime: "aios-alpha",
      stage: "C146.18.2",
      environment: {
        geminiConfigured,
        openAIConfigured,
      },
      chatContract: {
        operation: "video-create",
        provider: "automatic",
        model: route.model,
        resolution,
        aspectRatio,
        durationSeconds,
      },
      automaticRoute: route,
      availability,
      checks,
      executionPolicy: {
        providerJobCreated: false,
        reason:
          "Regression verification validates routing and configuration without creating a billable media generation job.",
      },
      latencyMs: Date.now() - startedAt,
      timestamp: Date.now(),
    },
    {
      status: verified ? 200 : 500,
      headers: { "cache-control": "no-store" },
    },
  );
}
