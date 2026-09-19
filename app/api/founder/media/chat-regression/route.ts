import { NextRequest, NextResponse } from "next/server";

import { isFounderRequest } from "@/lib/founder/auth";
import {
  getMediaGenerationAvailability,
  resolveAvailableMediaGenerationRoute,
} from "@/lib/runtime/media/generation-router";

export async function GET(request: NextRequest) {
  const startedAt = Date.now();

  if (!isFounderRequest(request)) {
    return NextResponse.json({
      success: false,
      verified: false,
      code: "FOUNDER_AUTH_REQUIRED",
      message: "Founder authentication is required.",
    }, { status: 401 });
  }

  const availability = getMediaGenerationAvailability();
  const route = resolveAvailableMediaGenerationRoute({
    kind: "video",
    prompt: "C146.18 Chat media router regression",
    resolution: "1080p",
    aspectRatio: "9:16",
    durationSeconds: 8,
  });

  const checks = {
    auth: true,
    availabilityReturned: Array.isArray(availability),
    routerLoaded: route.provider.length > 0,
    automaticRoutePresent: route.provider === "aios-composer" || route.provider === "google-veo",
    automaticFallbackWhenGeminiMissing: process.env.GEMINI_API_KEY ? route.provider === "google-veo" : route.provider === "aios-composer" && route.fallback === true,
    resolutionPreserved: route.resolution === "1080p",
    composerAvailable: availability.some((item) => item.provider === "aios-composer" && item.available),
    openAIConfigured: Boolean(process.env.OPENAI_API_KEY),
  };

  const verified = Object.values(checks).every(Boolean);

  return NextResponse.json({
    success: verified,
    verified,
    code: verified ? "C146_18_MEDIA_CHAT_ROUTER_PASS" : "C146_18_MEDIA_CHAT_ROUTER_REGRESSION_FAILED",
    message: verified
      ? "C146.18 Chat → Media Router contract regression passed."
      : "C146.18 Chat → Media Router contract regression failed.",
    runtime: "aios-alpha",
    environment: {
      geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
      openAIConfigured: Boolean(process.env.OPENAI_API_KEY),
    },
    chatContract: {
      operation: "video-create",
      provider: "automatic",
      model: "automatic",
      resolution: "1080p",
      aspectRatio: "9:16",
      durationSeconds: 30,
    },
    automaticRoute: route,
    availability,
    checks,
    latencyMs: Date.now() - startedAt,
    timestamp: Date.now(),
  });
}
