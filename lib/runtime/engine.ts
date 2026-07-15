import {
  runBrain,
  type AIProvider,
  type BrainResponse,
} from "../brain";

export interface RuntimeRequest {
  prompt: string;
  provider?: AIProvider;
}

export interface RuntimeResponse
  extends BrainResponse {
  runtime: "aios-alpha";
  timestamp: number;
}

export async function executeRuntime(
  request: RuntimeRequest
): Promise<RuntimeResponse> {
  const prompt = request.prompt.trim();

  if (!prompt) {
    return {
      success: false,
      provider: "mock",
      content: "请输入内容。",
      runtime: "aios-alpha",
      timestamp: Date.now(),
    };
  }

  const result = await runBrain({
    provider:
      request.provider ?? "mock",
    prompt,
  });

  return {
    ...result,
    runtime: "aios-alpha",
    timestamp: Date.now(),
  };
}