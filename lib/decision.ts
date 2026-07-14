import type {
  AIProvider,
  AICapability,
} from "./ai/types";

export type DecisionResult = {
  title: string;
  action: string;
  provider: AIProvider;
  capability: AICapability;
};

function decideCapability(
  state: string
): AICapability {
  switch (state) {
    case "Explore":
      return "reason";

    case "Validate":
      return "reason";

    case "Execute":
      return "chat";

    case "Optimize":
      return "reason";

    case "Scale":
      return "chat";

    default:
      return "chat";
  }
}

function decideProvider(
  capability: AICapability
): AIProvider {
  switch (capability) {
    case "reason":
      return "deepseek";

    case "vision":
      return "qwen";

    case "embedding":
      return "qwen";

    default:
      return "deepseek";
  }
}

export function makeDecision(
  state: string
): DecisionResult {

  let title = "开始";
  let action =
    "先明确今天真正想推进的一件事。";

  switch (state) {

    case "Explore":
      title = "探索";
      action =
        "列出3个最值得验证的方向，并选择其中1个开始。";
      break;

    case "Validate":
      title = "验证";
      action =
        "设计一个24小时内可以完成的最小实验。";
      break;

    case "Execute":
      title = "执行";
      action =
        "完成今天最重要的一项任务，不切换目标。";
      break;

    case "Optimize":
      title = "优化";
      action =
        "找出最大的瓶颈，并只优化这一项。";
      break;

    case "Scale":
      title = "扩大";
      action =
        "复制已经验证成功的方法，并形成标准流程。";
      break;
  }

  const capability =
    decideCapability(state);

  const provider =
    decideProvider(capability);

  return {
    title,
    action,
    provider,
    capability,
  };
}