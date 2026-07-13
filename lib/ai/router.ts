import { AIProvider } from "./types";

export function getProvider(): AIProvider {
  if (process.env.DEEPSEEK_API_KEY) {
    return "deepseek";
  }

  if (process.env.QWEN_API_KEY) {
    return "qwen";
  }

  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }

  return "mock";
}