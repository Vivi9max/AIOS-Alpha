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
  | "application/octet-stream"
  | string;

export interface AIOSInputMetadata {
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

  processingStatus:
    | "pending"
    | "ready"
    | "failed";

  processingError: string | null;
}

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
