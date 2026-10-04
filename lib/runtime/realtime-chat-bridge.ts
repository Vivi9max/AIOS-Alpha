import {
  executeRealtimeCapability,
  routeRealtimeCapability,
  type RealtimeCapabilityResult,
  type RealtimeCapabilityRoute,
} from "@/lib/runtime/realtime-capability-router";
import {
  retrieveRealtimeEvidence,
  canUseRealtimeEvidence,
  type RealtimeEvidenceAdapterResult,
} from "@/lib/runtime/realtime-evidence-adapter";
import type { Locale } from "@/lib/i18n";

export interface RealtimeChatBridgeResult {
  detected: boolean;
  handled: boolean;
  success: boolean;
  shouldContinueRuntime: boolean;
  requiresExternalEvidence: boolean;
  evidenceVerified: boolean;
  evidenceAvailable: boolean;
  capability: RealtimeCapabilityRoute["capability"];
  execution: RealtimeCapabilityRoute["execution"];
  code:
    | "REALTIME_CHAT_NOT_DETECTED"
    | "REALTIME_CHAT_COMPLETED"
    | "REALTIME_CHAT_EXTERNAL_EVIDENCE_REQUIRED"
    | "REALTIME_CHAT_EVIDENCE_VERIFIED"
    | "REALTIME_CHAT_EVIDENCE_UNVERIFIED"
    | "REALTIME_CHAT_FAILED";
  content: string;
  route: RealtimeCapabilityRoute;
  realtime?: RealtimeCapabilityResult;
  evidence?: RealtimeEvidenceAdapterResult;
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
    evidenceVerified: false,
    evidenceAvailable: false,
    capability:
      route.capability,
    execution:
      route.execution,
    code:
      "REALTIME_CHAT_NOT_DETECTED",
    content: "",
    route,
  };
}

function buildTimeCompletedResult(
  route: RealtimeCapabilityRoute,
  realtime: RealtimeCapabilityResult,
): RealtimeChatBridgeResult {
  return {
    detected: true,
    handled: true,
    success:
      realtime.success,
    shouldContinueRuntime: false,
    requiresExternalEvidence: false,
    evidenceVerified: false,
    evidenceAvailable: false,
    capability:
      route.capability,
    execution:
      route.execution,
    code:
      realtime.success
        ? "REALTIME_CHAT_COMPLETED"
        : "REALTIME_CHAT_FAILED",
    content:
      realtime.content,
    route,
    realtime,
  };
}

function buildEvidenceFailureResult(
  route: RealtimeCapabilityRoute,
  evidence: RealtimeEvidenceAdapterResult,
): RealtimeChatBridgeResult {
  return {
    detected: true,
    handled: true,
    success: false,
    shouldContinueRuntime: false,
    requiresExternalEvidence: true,
    evidenceVerified:
      evidence.verified,
    evidenceAvailable:
      evidence.evidence.length > 0,
    capability:
      route.capability,
    execution:
      route.execution,
    code:
      evidence.code ===
        "REALTIME_EVIDENCE_UNVERIFIED"
        ? "REALTIME_CHAT_EVIDENCE_UNVERIFIED"
        : "REALTIME_CHAT_FAILED",
    content:
      evidence.content,
    route,
    evidence,
  };
}

function buildEvidenceVerifiedResult(
  route: RealtimeCapabilityRoute,
  evidence: RealtimeEvidenceAdapterResult,
): RealtimeChatBridgeResult {
  return {
    detected: true,
    handled: true,
    success: true,
    shouldContinueRuntime: false,
    requiresExternalEvidence: true,
    evidenceVerified: true,
    evidenceAvailable:
      evidence.evidence.length > 0,
    capability:
      route.capability,
    execution:
      route.execution,
    code:
      "REALTIME_CHAT_EVIDENCE_VERIFIED",
    content:
      evidence.content,
    route,
    evidence,
  };
}

/**
 * C167.31.4
 *
 * Product-level realtime bridge.
 *
 * Execution boundary:
 *
 * 1. Time
 *    -> direct Runtime execution.
 *
 * 2. Weather / News / Exchange Rate / Market
 *    -> Realtime Evidence Adapter.
 *
 * 3. Unknown realtime requests
 *    -> Realtime Evidence Adapter.
 *
 * 4. Verified evidence
 *    -> exposed to the Chat Runtime boundary.
 *
 * 5. Unverified or unavailable evidence
 *    -> hard stop.
 *
 * The bridge never treats model memory as
 * realtime data.
 */
export async function executeRealtimeChatBridge(
  prompt: string,
  locale: Locale = "en",
): Promise<RealtimeChatBridgeResult> {
  const route =
    routeRealtimeCapability(
      prompt,
    );

  if (!route.detected) {
    return buildNotDetectedResult(
      route,
    );
  }

  /*
   * Runtime-executable realtime capability.
   *
   * Currently this is the time capability.
   * It does not require external evidence.
   */
  if (
    !route.requiresExternalEvidence
  ) {
    const realtime =
      executeRealtimeCapability(
        prompt,
        locale === "zh-CN"
          ? "zh-CN"
          : locale === "ja"
            ? "ja"
            : "en",
      );

    return buildTimeCompletedResult(
      route,
      realtime,
    );
  }

  /*
   * External realtime capabilities must pass
   * through the existing Web Intelligence and
   * evidence verification boundary.
   */
  const evidence =
    await retrieveRealtimeEvidence(
      prompt,
      locale,
    );

  if (
    canUseRealtimeEvidence(
      evidence,
    )
  ) {
    return buildEvidenceVerifiedResult(
      route,
      evidence,
    );
  }

  return buildEvidenceFailureResult(
    route,
    evidence,
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
 * Returns true when the realtime request
 * requires external evidence.
 */
export function requiresRealtimeExternalEvidence(
  prompt: string,
): boolean {
  const route =
    routeRealtimeCapability(
      prompt,
    );

  return (
    route.detected &&
    route.requiresExternalEvidence
  );
}

/**
 * Returns true when the request can continue
 * through the ordinary AIOS Runtime.
 *
 * Realtime requests never fall through.
 */
export function shouldContinueAfterRealtimeBridge(
  prompt: string,
): boolean {
  return !shouldHandleRealtimeChat(
    prompt,
  );
}

/**
 * Returns true only when realtime evidence
 * has been successfully retrieved and verified.
 */
export async function hasVerifiedRealtimeEvidence(
  prompt: string,
  locale: Locale = "en",
): Promise<boolean> {
  const route =
    routeRealtimeCapability(
      prompt,
    );

  if (
    !route.detected ||
    !route.requiresExternalEvidence
  ) {
    return false;
  }

  const evidence =
    await retrieveRealtimeEvidence(
      prompt,
      locale,
    );

  return canUseRealtimeEvidence(
    evidence,
  );
}

/**
 * Compact capability inspection used by
 * API/status layers without executing the
 * realtime capability.
 */
export function inspectRealtimeChatCapability(
  prompt: string,
): {
  detected: boolean;
  capability:
    RealtimeChatBridgeResult["capability"];
  execution:
    RealtimeChatBridgeResult["execution"];
  requiresExternalEvidence: boolean;
  evidenceBoundary:
    boolean;
  code:
    RealtimeChatBridgeResult["code"];
} {
  const route =
    routeRealtimeCapability(
      prompt,
    );

  if (!route.detected) {
    return {
      detected: false,
      capability:
        route.capability,
      execution:
        route.execution,
      requiresExternalEvidence:
        false,
      evidenceBoundary:
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
      capability:
        route.capability,
      execution:
        route.execution,
      requiresExternalEvidence:
        true,
      evidenceBoundary:
        true,
      code:
        "REALTIME_CHAT_EXTERNAL_EVIDENCE_REQUIRED",
    };
  }

  return {
    detected: true,
    capability:
      route.capability,
    execution:
      route.execution,
    requiresExternalEvidence:
      false,
    evidenceBoundary:
      false,
    code:
      "REALTIME_CHAT_COMPLETED",
  };
}
