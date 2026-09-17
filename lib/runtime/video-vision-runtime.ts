import type {
  VideoVisualEvidenceResult,
} from "./video-visual-evidence-runtime";

import {
  executeVideoVisionGateway,
} from "./video-vision-gateway";

export interface VideoVisionRuntimeResult {
  success: boolean;

  code: string;

  provider:
    | "openai"
    | "none";

  model?: string;

  frameCount: number;

  analyzedFrameCount: number;

  semanticUnderstandingReady: boolean;

  content?: string;

  error?: string;
}

export async function executeRuntimeVideoVision(
  userPrompt: string,
  visualEvidence: VideoVisualEvidenceResult,
): Promise<VideoVisionRuntimeResult> {
  return executeVideoVisionGateway(
    userPrompt,
    visualEvidence,
  );
}
