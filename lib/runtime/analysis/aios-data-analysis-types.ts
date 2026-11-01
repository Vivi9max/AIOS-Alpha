import type {
  AIOSInputItem,
} from "@/lib/runtime/input/aios-input-types";

export type AIOSDataValue =
  | string
  | number
  | boolean
  | null;

export type AIOSDataColumnType =
  | "number"
  | "boolean"
  | "string"
  | "mixed"
  | "empty";

export type AIOSDataFilterOperator =
  | "eq"
  | "neq"
  | "contains"
  | "gt"
  | "gte"
  | "lt"
  | "lte";

export interface AIOSDataRow {
  [key: string]: AIOSDataValue;
}

export interface AIOSDataColumn {
  name: string;
  type: AIOSDataColumnType;
  nonEmptyCount: number;
  nullCount: number;
  uniqueCount: number;
}

export interface AIOSNumericSummary {
  count: number;
  sum: number;
  mean: number;
  min: number;
  max: number;
  median: number;
}

export interface AIOSDataFilter {
  column: string;
  operator: AIOSDataFilterOperator;
  value: AIOSDataValue;
}

export interface AIOSDataAnalysisOptions {
  sheetName?: string;
  filters?: AIOSDataFilter[];
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  groupBy?: string;
  limit?: number;
}

export interface AIOSDataSourceResult {
  inputId: string;
  fileName: string;
  format: "csv" | "json" | "xlsx";
  sheetName: string | null;
  rowCount: number;
  columns: AIOSDataColumn[];
  numericSummaries: Record<
    string,
    AIOSNumericSummary
  >;
  rows: AIOSDataRow[];
  groupedCounts: Record<
    string,
    number
  > | null;
  limitations: string[];
}

export interface AIOSDataAnalysisError {
  inputId: string;
  fileName: string;
  error: string;
}

export interface AIOSDataAnalysisResult {
  success: boolean;

  code:
    | "AIOS_DATA_ANALYSIS_COMPLETED"
    | "AIOS_DATA_ANALYSIS_PARTIAL"
    | "AIOS_DATA_ANALYSIS_REJECTED";

  sourceCount: number;
  analyzedCount: number;
  rejectedCount: number;
  totalRows: number;

  sources: AIOSDataSourceResult[];

  errors: AIOSDataAnalysisError[];

  safetyBoundary: {
    modelExecution: false;
    plannerDispatched: false;
    tradingExecuted: false;
  };

  generatedAt: string;
}

export interface AIOSDataAnalysisRequest {
  inputs: AIOSInputItem[];
  options?: AIOSDataAnalysisOptions;
}
