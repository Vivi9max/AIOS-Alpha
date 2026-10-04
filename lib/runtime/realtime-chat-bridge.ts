import {
  executeRealtimeCapability,
  routeRealtimeCapability,
  type RealtimeCapabilityResult,
  type RealtimeCapabilityRoute,
} from "@/lib/runtime/realtime-capability-router";
import type { Locale } from "@/lib/i18n";

export interface RealtimeChatBridgeResult {
  detected: boolean;
  handled: boolean;
  success: boolean;
  shouldContinueRuntime: boolean;
  requiresExternalEvidence: boolean;
  capability: RealtimeCapabilityRoute["capability"];
  execution: RealtimeCapabilityRoute["execution"];
  code:
    | "REALTIME_CHAT_NOT_DETECTED"
    | "REALTIME_CHAT_COMPLETED"
    | "REALTIME_CHAT_EXTERNAL_EVIDENCE_REQUIRED"
    | "REALTIME_CHAT_FAILED";
  content: string;
  route: RealtimeCapabilityRoute;
  realtime?: RealtimeCapabilityResult;
}

function buildNotDetectedResult(
  route: RealtimeCapabilityRoute,
): RealtimeChatBridgeResult {
  return {
    detected: false,
    handled: false,
    success: false,
    shouldContinueRuntime: true,
    requiresExternalEvidence: false,
    capability: route.capability,
    execution: route.execution,
    code: "REALTIME_CHAT_NOT_DETECTED",
    content: "",
    route,
  };
}

function buildCompletedResult(
  route: RealtimeCapabilityRoute,
  realtime: RealtimeCapabilityResult,
): RealtimeChatBridgeResult {
  return {
    detected: true,
    handled: true,
    success: realtime.success,
    shouldContinueRuntime: false,
    requiresExternalEvidence: false,
    capability: route.capability,
    execution: route.execution,
    code: realtime.success
      ? "REALTIME_CHAT_COMPLETED"
      : "REALTIME_CHAT_FAILED",
    content: realtime.content,
    route,
    realtime,
  };
}

function buildExternalEvidenceResult(
  route: RealtimeCapabilityRoute,
  realtime: RealtimeCapabilityResult,
): RealtimeChatBridgeResult {
  return {
    detected: true,
    handled: true,
    success: false,
    shouldContinueRuntime: false,
    requiresExternalEvidence: true,
    capability: route.capability,
    execution: route.execution,
    code:
      "REALTIME_CHAT_EXTERNAL_EVIDENCE_REQUIRED",
    content: realtime.content,
    route,
    realtime,
  };
}

/**
 * C167.31.1
 *
 * Product-level bridge between Chat Runtime
 * and the realtime capability boundary.
 *
 * The bridge deliberately separates:
 *
 * 1. realtime capability detection
 * 2. runtime-executable capabilities
 * 3. capabilities requiring external evidence
 * 4. ordinary prompts that should continue
 *
 * This prevents the general model runtime from
 * treating realtime requests as ordinary language
 * generation.
 */
export function executeRealtimeChatBridge(
  prompt: string,
  locale: Locale = "en",
): RealtimeChatBridgeResult {
  const route =
    routeRealtimeCapability(prompt);

  if (!route.detected) {
    return buildNotDetectedResult(route);
  }

  const realtime =
    executeRealtimeCapability(
      prompt,
      locale === "zh-CN"
        ? "zh-CN"
        : locale === "ja"
          ? "ja"
          : "en",
    );

  if (
    route.requiresExternalEvidence
  ) {
    return buildExternalEvidenceResult(
      route,
      realtime,
    );
  }

  return buildCompletedResult(
    route,
    realtime,
  );
}

/**
 * Returns true when the request is a realtime
 * request that must not fall through to the
 * normal model runtime.
 */
export function shouldHandleRealtimeChat(
  prompt: string,
): boolean {
  return routeRealtimeCapability(
    prompt,
  ).detected;
}

/**
 * Returns true when the realtime request has
 * reached a hard external-evidence boundary.
 *
 * This is intentionally different from a
 * successful realtime execution such as time.
 */
export function requiresRealtimeExternalEvidence(
  prompt: string,
): boolean {
  const route =
    routeRealtimeCapability(prompt);

  return (
    route.detected &&
    route.requiresExternalEvidence
  );
}

/**
 * Returns true when the request can continue
 * through the ordinary AIOS Runtime.
 */
export function shouldContinueAfterRealtimeBridge(
  prompt: string,
): boolean {
  return !shouldHandleRealtimeChat(prompt);
}

/**
 * Compact capability inspection used by
 * API/status layers without executing the
 * capability.
 */
export function inspectRealtimeChatCapability(
  prompt: string,
): {
  detected: boolean;
  capability: RealtimeChatBridgeResult["capability"];
  execution: RealtimeChatBridgeResult["execution"];
  requiresExternalEvidence: boolean;
  code: RealtimeChatBridgeResult["code"];
} {
  const route =
    routeRealtimeCapability(prompt);

  if (!route.detected) {
    return {
      detected: false,
      capability: route.capability,
      execution: route.execution,
      requiresExternalEvidence:
        false,
      code:
        "REALTIME_CHAT_NOT_DETECTED",
    };
  }

  if (
    route.requiresExternalEvidence
  ) {
    return {
      detected: true,
      capability: route.capability,
      execution: route.execution,
      requiresExternalEvidence:
        true,
      code:
        "REALTIME_CHAT_EXTERNAL_EVIDENCE_REQUIRED",
    };
  }

  return {
    detected: true,
    capability: route.capability,
    execution: route.execution,
    requiresExternalEvidence:
      false,
    code:
      "REALTIME_CHAT_COMPLETED",
  };
}
