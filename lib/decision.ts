export type DecisionResult = {
  title: string;
  action: string;
};

export function makeDecision(state: string): DecisionResult {
  switch (state) {
    case "Explore":
      return {
        title: "探索",
        action: "列出3个最值得验证的方向，并选择其中1个开始。"
      };

    case "Validate":
      return {
        title: "验证",
        action: "设计一个24小时内可以完成的最小实验。"
      };

    case "Execute":
      return {
        title: "执行",
        action: "完成今天最重要的一项任务，不切换目标。"
      };

    case "Optimize":
      return {
        title: "优化",
        action: "找出最大的瓶颈，并只优化这一项。"
      };

    case "Scale":
      return {
        title: "扩大",
        action: "复制已经验证成功的方法，并形成标准流程。"
      };

    default:
      return {
        title: "开始",
        action: "先明确今天真正想推进的一件事。"
      };
  }
}
