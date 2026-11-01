import type {
  AIOSInputItem,
} from "@/lib/runtime/input/aios-input-types";

import {
  analyzeAIOSData,
} from "./aios-data-analysis-runtime";

function assert(
  condition: boolean,
  message: string,
): void {
  if (!condition) {
    throw new Error(
      `C169.3 regression failed: ${message}`,
    );
  }
}

function createCsvInput(): AIOSInputItem {
  return {
    id: "c1693-csv",
    kind: "file",

    metadata: {
      name: "sales.csv",
      mimeType: "text/csv",
      sizeBytes: 64,
      lastModifiedAt: null,
      source: "runtime",
    },

    localReference: null,

    extractedText:
      "product,region,revenue\nA,East,100\nB,West,200\nC,East,300",

    extractedData: null,

    processingStatus: "ready",
    processingError: null,
  };
}

function createJsonInput(): AIOSInputItem {
  return {
    id: "c1693-json",
    kind: "file",

    metadata: {
      name: "orders.json",
      mimeType: "application/json",
      sizeBytes: 50,
      lastModifiedAt: null,
      source: "runtime",
    },

    localReference: null,

    extractedText: JSON.stringify([
      {
        order: "A",
        amount: 12,
      },
      {
        order: "B",
        amount: 18,
      },
    ]),

    extractedData: null,

    processingStatus: "ready",
    processingError: null,
  };
}

export function runAIOSDataAnalysisRegression(): {
  passed: number;
  checks: string[];
} {
  const checks: string[] = [];

  const csvResult = analyzeAIOSData({
    inputs: [
      createCsvInput(),
    ],

    options: {
      groupBy: "region",
      sortBy: "revenue",
      sortDirection: "desc",
    },
  });

  assert(
    csvResult.success,
    "CSV source should be analyzed.",
  );

  assert(
    csvResult.totalRows === 3,
    "CSV row count should be 3.",
  );

  assert(
    csvResult.sources[0]
      .numericSummaries.revenue.sum === 600,
    "CSV revenue sum should equal 600.",
  );

  assert(
    csvResult.sources[0]
      .groupedCounts?.East === 2,
    "CSV East group count should equal 2.",
  );

  assert(
    csvResult.sources[0]
      .rows[0].product === "C",
    "CSV sorting should be descending.",
  );

  checks.push(
    "CSV parsing, numeric summary, grouping, and sorting",
  );

  const jsonResult = analyzeAIOSData({
    inputs: [
      createJsonInput(),
    ],

    options: {
      filters: [
        {
          column: "amount",
          operator: "gte",
          value: 15,
        },
      ],
    },
  });

  assert(
    jsonResult.success,
    "JSON source should be analyzed.",
  );

  assert(
    jsonResult.totalRows === 1,
    "JSON filter should retain one row.",
  );

  assert(
    jsonResult.sources[0]
      .numericSummaries.amount.mean === 18,
    "JSON numeric mean should equal 18.",
  );

  checks.push(
    "JSON records, numeric summary, and filtering",
  );

  const pendingResult = analyzeAIOSData({
    inputs: [
      {
        ...createCsvInput(),
        processingStatus: "pending",
      },
    ],
  });

  assert(
    !pendingResult.success,
    "Pending input must not be analyzed.",
  );

  assert(
    pendingResult.rejectedCount === 1,
    "Pending input should be rejected.",
  );

  checks.push(
    "Input readiness and rejection boundary",
  );

  assert(
    csvResult.safetyBoundary.modelExecution ===
      false &&
      csvResult.safetyBoundary.plannerDispatched ===
        false &&
      csvResult.safetyBoundary.tradingExecuted ===
        false,
    "Analysis must not execute models, Planner, or trading.",
  );

  checks.push(
    "Model, Planner, and trading safety boundary",
  );

  return {
    passed: checks.length,
    checks,
  };
}
