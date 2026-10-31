export type AIOSInputKind =
  | "text"
  | "image"
  | "video"
  | "file";

export type AIOSInputSource =
  | "camera"
  | "photo-library"
  | "file-picker"
  | "runtime"
  | "unknown";

export type AIOSInputMimeType =
  | "image/jpeg"
  | "image/png"
  | "image/webp"
  | "image/heic"
  | "image/heif"
  | "video/mp4"
  | "video/webm"
  | "video/quicktime"
  | "video/x-m4v"
  | "application/pdf"
  | "text/plain"
  | "text/csv"
  | "application/json"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  | "application/msword"
  | "application/vnd.ms-excel"
  | "application/octet-stream"
  | string;
SEARCH_END

export interface AIOSInputSpreadsheetCell {
  row: number;
  column: number;
  value: string;
}

export interface AIOSInputSpreadsheetRow {
  row: number;
  cells: AIOSInputSpreadsheetCell[];
}

export interface AIOSInputSpreadsheetSheet {
  name: string;
  index: number;
  rows: AIOSInputSpreadsheetRow[];
}

export interface AIOSInputExtractedData {
  format:
    | "xlsx";

  sheets: AIOSInputSpreadsheetSheet[];
}

export interface AIOSInputMetadata {
SEARCH_END
  name: string | null;
  mimeType: AIOSInputMimeType;
  sizeBytes: number | null;
  lastModifiedAt: string | null;
  source: AIOSInputSource;
}

export interface AIOSInputItem {
  id: string;

  kind:
    | AIOSInputKind;

  metadata: AIOSInputMetadata;

  /**
   * Browser/runtime-local object URL or
   * another temporary reference.
   *
   * This field must never be treated as
   * a permanent storage URL.
   */
  localReference: string | null;

  /**
   * Optional text representation produced
   * by an upstream parser/OCR/Vision layer.
   */
  extractedText: string | null;

  /**
   * Optional structured representation produced
   * by the document intelligence runtime.
   *
   * For XLSX this contains deterministic
   * sheet/row/cell data. For other formats
   * this may remain null.
   */
  extractedData: AIOSInputExtractedData | null;

  processingStatus:
    | "pending"
    | "ready"
    | "failed";

  processingError: string | null;
}
SEARCH_END

export interface AIOSInputRequest {
  inputs: AIOSInputItem[];

  /**
   * Optional user text associated with
   * the uploaded/captured inputs.
   */
  prompt: string | null;

  /**
   * Identifies the originating runtime
   * interaction without exposing secrets.
   */
  sessionId: string | null;
}

export interface AIOSInputResult {
  success: boolean;

  code:
    | "AIOS_INPUT_ACCEPTED"
    | "AIOS_INPUT_PARTIAL"
    | "AIOS_INPUT_REJECTED";

  inputs: AIOSInputItem[];

  acceptedCount: number;

  rejectedCount: number;

  limitations: string[];

  /**
   * Input Foundation never performs
   * planner dispatch or trading.
   */
  safetyBoundary: {
    modelExecution: false;
    plannerDispatched: false;
    tradingExecuted: false;
  };

  generatedAt: string;
}

export interface AIOSInputDocumentParseRequest {
  /**
   * Raw document bytes. Must be a real
   * Buffer/Uint8Array produced by the
   * caller; never a fake placeholder.
   */
  data: Uint8Array;

  mimeType: AIOSInputMimeType;

  fileName: string | null;
}

export interface AIOSInputDocumentParseSuccess {
  ok: true;

  mimeType: AIOSInputMimeType;

  extractedText: string;

  extractedData: AIOSInputExtractedData | null;

  limitations: string[];
}

export interface AIOSInputDocumentParseFailure {
  ok: false;

  mimeType: AIOSInputMimeType;

  code:
    | "AIOS_INPUT_PARSE_UNSUPPORTED"
    | "AIOS_INPUT_PARSE_EMPTY"
    | "AIOS_INPUT_PARSE_FAILED";

  error: string;

  limitations: string[];
}

export type AIOSInputDocumentParseResult =
  | AIOSInputDocumentParseSuccess
  | AIOSInputDocumentParseFailure;
SEARCH_END
