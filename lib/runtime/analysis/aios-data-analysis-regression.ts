
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

function createInput(
  overrides: Partial<AIOSInputItem> = {},
): AIOSInputItem {
  return {
    id: overrides.id ?? "c1693-regression",
    kind: overrides.kind ?? "file",

    metadata: {
      name:
        overrides.metadata?.name ?? "data.csv",
      mimeType:
        overrides.metadata?.mimeType ?? "text/csv",
      sizeBytes:
        overrides.metadata?.sizeBytes ?? 128,
      lastModifiedAt:
        overrides.metadata?.lastModifiedAt ?? null,
      source:
        overrides.metadata?.source ?? "runtime",
    },

    localReference:
      overrides.localReference ?? null,

    extractedText:
      overrides.extractedText ?? null,

    extractedData:
      overrides.extractedData ?? null,

    processingStatus:
      overrides.processingStatus ?? "ready",

    processingError:
      overrides.processingError ?? null,
  };
}

function createCsvInput(): AIOSInputItem {
  return createInput({
    id: "c1693-csv",
    metadata: {
      name: "sales.csv",
      mimeType: "text/csv",
      sizeBytes: 128,
      lastModifiedAt: null,
      source: "runtime",
    },
    extractedText:
      "product,region,revenue\nA,East,100\nB,West,200\nC,East,300",
  });
}

function createQuotedCsvInput(): AIOSInputItem {
  return createInput({
    id: "c1693-quoted-csv",
    metadata: {
      name: "quoted.csv",
      mimeType: "text/csv",
      sizeBytes: 128,
      lastModifiedAt: null,
      source: "runtime",
    },
    extractedText:
      'product,description,revenue\nA,"Small, blue item",10\nB,"Large ""premium"" item",20',
  });
}

function createJsonInput(): AIOSInputItem {
  return createInput({
    id: "c1693-json",
    metadata: {
      name: "orders.json",
      mimeType: "application/json",
      sizeBytes: 128,
      lastModifiedAt: null,
      source: "runtime",
    },
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
  });
}

function createXlsxInput(): AIOSInputItem {
  return createInput({
    id: "c1693-xlsx",
    metadata: {
      name: "workbook.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      sizeBytes: 256,
      lastModifiedAt: null,
      source: "runtime",
    },
    extractedText: null,
    extractedData: {
      format: "xlsx",
      sheets: [
        {
          name: "Sales",
          index: 0,
          rows: [
            {
              row: 0,
              cells: [
                {
                  row: 0,
                  column: 0,
                  value: "product",
                },
                {
                  row: 0,
                  column: 1,
                  value: "revenue",
                },
              ],
            },
            {
              row: 1,
              cells: [
                {
                  row: 1,
                  column: 0,
                  value: "A",
                },
                {
                  row: 1,
                  column: 1,
                  value: "125",
                },
              ],
            },
            {
              row: 2,
              cells: [
                {
                  row: 2,
                  column: 0,
                  value: "B",
                },
                {
                  row: 2,
                  column: 1,
                  value: "275",
                },
              ],
            },
          ],
        },
        {
          name: "Inventory",
          index: 1,
          rows: [
            {
              row: 0,
              cells: [
                {
                  row: 0,
                  column: 0,
                  value: "sku",
                },
                {
                  row: 0,
                  column: 1,
                  value: "quantity",
                },
              ],
            },
            {
              row: 1,
              cells: [
                {
                  row: 1,
                  column: 0,
                  value: "00123",
                },
                {
                  row: 1,
                  column: 1,
                  value: "8",
                },
              ],
            },
          ],
        },
      ],
    },
  });
}

export interface AIOSDataAnalysisRegressionResult {
  success: boolean;
  code:
    | "C169_3_REGRESSION_PASS"
    | "C169_3_REGRESSION_FAIL";
  passed: number;
  failed: number;
  checks: Array<{
    name: string;
    passed: boolean;
    detail: string;
  }>;
  safetyBoundary: {
    modelExecution: false;
    plannerDispatched: false;
    tradingExecuted: false;
  };
}

export function runAIOSDataAnalysisRegression(): AIOSDataAnalysisRegressionResult {
  const checks: AIOSDataAnalysisRegressionResult["checks"] = [];

  function record(
    name: string,
    passed: boolean,
    detail: string,
  ): void {
    checks.push({
      name,
      passed,
      detail,
    });
  }

  const csvResult = analyzeAIOSData({
    inputs: [createCsvInput()],
    options: {
      groupBy: "region",
      sortBy: "revenue",
      sortDirection: "desc",
    },
  });

  record(
    "CSV parsing",
    csvResult.success &&
      csvResult.totalRows === 3,
    `success=${csvResult.success}, rows=${csvResult.totalRows}`,
  );

  record(
    "CSV numeric summary",
    csvResult.sources[0]?.numericSummaries.revenue?.sum === 600,
    `revenueSum=${csvResult.sources[0]?.numericSummaries.revenue?.sum ?? "missing"}`,
  );

  record(
    "CSV grouping",
    csvResult.sources[0]?.groupedCounts?.East === 2,
    `East=${csvResult.sources[0]?.groupedCounts?.East ?? "missing"}`,
  );

  record(
    "CSV descending sort",
    csvResult.sources[0]?.rows[0]?.product === "C",
    `firstProduct=${String(csvResult.sources[0]?.rows[0]?.product ?? "missing")}`,
  );

  const quotedCsvResult = analyzeAIOSData({
    inputs: [createQuotedCsvInput()],
  });

  record(
    "CSV quoted fields and embedded commas",
    quotedCsvResult.success &&
      quotedCsvResult.sources[0]?.rows[0]?.description ===
        "Small, blue item",
    `description=${String(quotedCsvResult.sources[0]?.rows[0]?.description ?? "missing")}`,
  );

  record(
    "CSV escaped quote handling",
    quotedCsvResult.sources[0]?.rows[1]?.description ===
      'Large "premium" item',
    `description=${String(quotedCsvResult.sources[0]?.rows[1]?.description ?? "missing")}`,
  );

  const jsonResult = analyzeAIOSData({
    inputs: [createJsonInput()],
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

  record(
    "JSON parsing and filtering",
    jsonResult.success &&
      jsonResult.totalRows === 1,
    `success=${jsonResult.success}, rows=${jsonResult.totalRows}`,
  );

  record(
    "JSON numeric summary",
    jsonResult.sources[0]?.numericSummaries.amount?.mean === 18,
    `mean=${jsonResult.sources[0]?.numericSummaries.amount?.mean ?? "missing"}`,
  );

  const xlsxResult = analyzeAIOSData({
    inputs: [createXlsxInput()],
  });

  record(
    "XLSX structured worksheet parsing",
    xlsxResult.success &&
      xlsxResult.totalRows === 2 &&
      xlsxResult.sources[0]?.format === "xlsx",
    `success=${xlsxResult.success}, rows=${xlsxResult.totalRows}`,
  );

  record(
    "XLSX numeric summary",
    xlsxResult.sources[0]?.numericSummaries.revenue?.sum === 400,
    `revenueSum=${xlsxResult.sources[0]?.numericSummaries.revenue?.sum ?? "missing"}`,
  );

  const selectedSheetResult = analyzeAIOSData({
    inputs: [createXlsxInput()],
    options: {
      sheetName: "Inventory",
    },
  });

  record(
    "XLSX worksheet selection",
    selectedSheetResult.success &&
      selectedSheetResult.sources[0]?.sheetName ===
        "Inventory" &&
      selectedSheetResult.totalRows === 1,
    `sheet=${selectedSheetResult.sources[0]?.sheetName ?? "missing"}`,
  );

  record(
    "XLSX identifier preservation",
    selectedSheetResult.sources[0]?.rows[0]?.sku === "00123",
    `sku=${String(selectedSheetResult.sources[0]?.rows[0]?.sku ?? "missing")}`,
  );

  const missingSheetResult = analyzeAIOSData({
    inputs: [createXlsxInput()],
    options: {
      sheetName: "MissingSheet",
    },
  });

  record(
    "XLSX missing worksheet rejection",
    !missingSheetResult.success &&
      missingSheetResult.rejectedCount === 1,
    `rejected=${missingSheetResult.rejectedCount}`,
  );

  const pendingResult = analyzeAIOSData({
    inputs: [
      {
        ...createCsvInput(),
        processingStatus: "pending",
      },
    ],
  });

  record(
    "Pending input rejection",
    !pendingResult.success &&
      pendingResult.rejectedCount === 1,
    `rejected=${pendingResult.rejectedCount}`,
  );

  const failedResult = analyzeAIOSData({
    inputs: [
      {
        ...createCsvInput(),
        processingStatus: "failed",
      },
    ],
  });

  record(
    "Failed input rejection",
    !failedResult.success &&
      failedResult.rejectedCount === 1,
    `rejected=${failedResult.rejectedCount}`,
  );

  const invalidCsvResult = analyzeAIOSData({
    inputs: [
      createInput({
        id: "c1693-invalid-csv",
        metadata: {
          name: "invalid.csv",
          mimeType: "text/csv",
          sizeBytes: 32,
          lastModifiedAt: null,
          source: "runtime",
        },
        extractedText:
          'name,value\n"Alice,10',
      }),
    ],
  });

  record(
    "Malformed CSV rejection",
    !invalidCsvResult.success &&
      invalidCsvResult.rejectedCount === 1,
    `rejected=${invalidCsvResult.rejectedCount}`,
  );

  const invalidJsonResult = analyzeAIOSData({
    inputs: [
      createInput({
        id: "c1693-invalid-json",
        metadata: {
          name: "invalid.json",
          mimeType: "application/json",
          sizeBytes: 16,
          lastModifiedAt: null,
          source: "runtime",
        },
        extractedText: "{invalid-json",
      }),
    ],
  });

  record(
    "Malformed JSON rejection",
    !invalidJsonResult.success &&
      invalidJsonResult.rejectedCount === 1,
    `rejected=${invalidJsonResult.rejectedCount}`,
  );

  const unsupportedResult = analyzeAIOSData({
    inputs: [
      createInput({
        id: "c1693-unsupported",
        metadata: {
          name: "archive.zip",
          mimeType: "application/zip",
          sizeBytes: 64,
          lastModifiedAt: null,
          source: "runtime",
        },
        extractedText: null,
      }),
    ],
  });

  record(
    "Unsupported format rejection",
    !unsupportedResult.success &&
      unsupportedResult.rejectedCount === 1,
    `rejected=${unsupportedResult.rejectedCount}`,
  );

  record(
    "Model execution safety boundary",
    csvResult.safetyBoundary.modelExecution === false,
    "modelExecution=false",
  );

  record(
    "Planner dispatch safety boundary",
    csvResult.safetyBoundary.plannerDispatched === false,
    "plannerDispatched=false",
  );

  record(
    "Trading execution safety boundary",
    csvResult.safetyBoundary.tradingExecuted === false,
    "tradingExecuted=false",
  );

  const passed = checks.filter(
    (check) => check.passed,
  ).length;

  const failed = checks.length - passed;

  const success = failed === 0;

  return {
    success,

    code: success
      ? "C169_3_REGRESSION_PASS"
      : "C169_3_REGRESSION_FAIL",

    passed,
    failed,
    checks,

    safetyBoundary: {
      modelExecution: false,
      plannerDispatched: false,
      tradingExecuted: false,
    },
  };
}
