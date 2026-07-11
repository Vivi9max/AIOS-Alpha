export type AIState =
  | "Unknown"
  | "Explore"
  | "Validate"
  | "Execute"
  | "Optimize"
  | "Scale";

export function detectState(intent: string): AIState {
  const text = intent.toLowerCase();

  if (!text.trim()) return "Unknown";

  if (
    text.includes("开始") ||
    text.includes("想") ||
    text.includes("学习")
  ) {
    return "Explore";
  }

  if (
    text.includes("测试") ||
    text.includes("验证")
  ) {
    return "Validate";
  }

  if (
    text.includes("执行") ||
    text.includes("制作") ||
    text.includes("开发")
  ) {
    return "Execute";
  }

  if (
    text.includes("优化")
  ) {
    return "Optimize";
  }

  return "Scale";
}
