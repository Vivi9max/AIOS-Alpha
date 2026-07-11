import { runMock } from "./providers/mock";

export type AIProvider = "mock" | "openai";

export interface BrainRequest {
  provider: AIProvider;
  prompt: string;
}

export interface BrainResponse {
  success: boolean;
  content: string;
}

export async function runBrain(
  request: BrainRequest
): Promise<BrainResponse> {

  if (typeof window !== "undefined") {

    const history =
      JSON.parse(
        localStorage.getItem("aios-memory") ?? "[]"
      );

    history.push({
      id: Date.now(),
      text: request.prompt,
    });

    localStorage.setItem(
      "aios-memory",
      JSON.stringify(history)
    );
  }

  switch (request.provider) {

    case "mock":
      return await runMock(request.prompt);

    case "openai":
      return {
        success: false,
        content: "OpenAI Runtime Coming Soon",
      };

    default:
      return {
        success: false,
        content: "Unknown Provider",
      };
  }
}