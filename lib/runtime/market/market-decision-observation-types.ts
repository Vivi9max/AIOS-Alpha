import type {
  MarketRegion,
} from "./market-types";

import type {
  MarketDecisionRecord,
} from "./market-decision-record-types";

export type MarketDecisionObservationMode =
  | "observe"
  | "mutate";

export interface MarketDecisionObservationRequest {
  mode:
    MarketDecisionObservationMode;

  symbol?: string;

  market?: MarketRegion;

  universe?: Array<{
    symbol: string;
    market: MarketRegion;
  }>;

  record?: MarketDecisionRecord;
}

export interface MarketDecisionObservation {
  symbol: string;

  market: MarketRegion;

  record:
    MarketDecisionRecord;

  observationFingerprint:
    string;

  previousFingerprint:
    string | null;

  isNewObservation:
    boolean;

  wouldMutate:
    boolean;

  previousVersion:
    number;

  currentVersion:
    number;

  mutationReason:
    | "new-observation"
    | "same-observation"
    | "no-history"
    | "invalid";

  reassessmentAvailable:
    boolean;
}

export interface MarketDecisionObservationResult {
  success: boolean;

  code:
    | "C147_11_OBSERVATION_PASS"
    | "C147_11_OBSERVATION_INSUFFICIENT"
    | "C147_11_MUTATION_PASS"
    | "C147_11_MUTATION_NOOP"
    | "C147_11_MUTATION_BLOCKED";

  mode:
    MarketDecisionObservationMode;

  mutated:
    boolean;

  versionCreated:
    number | null;

  observation:
    MarketDecisionObservation | null;

  storage: {
    mode:
      | "redis"
      | "memory";

    persistent:
      boolean;
  };

  humanDecisionRequired:
    boolean;

  runtime: {
    name:
      "market-decision-observation-runtime";

    version:
      "C147.11";

    generatedAt:
      string;

    latencyMs:
      number;
  };

  principles:
    string[];

  disclaimer:
    string;
}
