import type {
MarketRegion,
} from “./market-types”;

import type {
MarketDecisionRecord,
} from “./market-decision-record-types”;

import type {
MarketReassessmentResult,
} from “./market-reassessment-types”;

export interface MarketDecisionChangeDetectionRequest {
universe: Array<{
symbol: string;
market: MarketRegion;
}>;

query?: string | null;

includeExcluded?: boolean;

includeInsufficientData?: boolean;
}

export type MarketDecisionChangeAction =
| “no-history”
| “no-material-change”
| “reassessment-required”
| “blocked”;

export interface MarketDecisionChangeDetectionItem {
symbol: string;

market: MarketRegion;

action: MarketDecisionChangeAction;

observationFingerprint: string;

previousFingerprint: string | null;

previousVersion: number;

currentVersion: number;

observationChanged: boolean;

materialChange: boolean;

previousRecordId: string | null;

currentRecordId: string;

currentRecord: MarketDecisionRecord;

reassessment: MarketReassessmentResult | null;

humanDecisionRequired: boolean;

mutationPerformed: false;
}

export interface MarketDecisionChangeDetectionResult {
success: boolean;

code:
| “C147_12_CHANGE_DETECTION_PASS”
| “C147_12_CHANGE_DETECTION_PARTIAL”
| “C147_12_CHANGE_DETECTION_INSUFFICIENT”;

universeSize: number;

evaluatedCount: number;

changedCount: number;

reassessmentRequiredCount: number;

noMaterialChangeCount: number;

noHistoryCount: number;

blockedCount: number;

mutationPerformed: false;

items: MarketDecisionChangeDetectionItem[];

principles: string[];

humanDecisionRequired: true;

storage: {
mode:
| “redis”
| “memory”;

persistent: boolean;

};

runtime: {
name:
“market-decision-change-detection-runtime”;

version:
  "C147.12";
generatedAt: string;
latencyMs: number;

};

disclaimer: string;
}
