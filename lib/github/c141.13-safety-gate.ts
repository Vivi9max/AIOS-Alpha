import "server-only";

import {
  evaluateFounderAutonomousSafety as evaluateFounderAutonomousSafetyCanonical,
  type FounderAutonomousSafetyAudit,
  type FounderAutonomousSafetyInput,
} from "./founder-autonomous-safety-gate";

/**
 * C141.13 compatibility boundary.
 *
 * Provides the stable ASCII import path used by the C141.13
 * runtime adapter while keeping the canonical safety implementation
 * in founder-autonomous-safety-gate.ts.
 */
export type {
  FounderAutonomousSafetyAudit,
  FounderAutonomousSafetyInput,
};

export function evaluateFounderAutonomousSafety(
  input: FounderAutonomousSafetyInput,
): FounderAutonomousSafetyAudit {
  return evaluateFounderAutonomousSafetyCanonical(input);
}
