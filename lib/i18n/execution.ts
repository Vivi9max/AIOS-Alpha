export type AIOSLocale =
  | "en"
  | "zh-CN"
  | "ja";

export interface ExecutionTranslations {
  execution: string;
  executionConsole: string;
  executionDescription: string;
  goal: string;
  runtimeInput: string;
  executeJob: string;
  executing: string;
  runtimeStatus: string;
  verification: string;
  retryCount: string;
  retryExecution: string;
  latestResult: string;
  executionHistory: string;
  refresh: string;
  noExecutionJobs: string;
  executionCompleted: string;
  executionFailed: string;
}

export const executionTranslations: Record<
  AIOSLocale,
  ExecutionTranslations
> = {
  en: {
    execution:
      "Execution",
    executionConsole:
      "Execution Console",
    executionDescription:
      "Turn an AIOS goal into a real execution job, observe the runtime result, verify it, and recover from failures.",
    goal:
      "Goal",
    runtimeInput:
      "Runtime Input",
    executeJob:
      "Execute Job",
    executing:
      "Executing...",
    runtimeStatus:
      "Runtime Status",
    verification:
      "Verification",
    retryCount:
      "Retry count",
    retryExecution:
      "Retry Execution",
    latestResult:
      "Latest Result",
    executionHistory:
      "Execution History",
    refresh:
      "Refresh",
    noExecutionJobs:
      "No execution jobs yet.",
    executionCompleted:
      "Execution completed successfully.",
    executionFailed:
      "Execution failed.",
  },

  "zh-CN": {
    execution:
      "执行",
    executionConsole:
      "执行控制台",
    executionDescription:
      "将 AIOS 目标转换为真实执行任务，观察运行结果、验证结果，并在失败后恢复。",
    goal:
      "目标",
    runtimeInput:
      "运行输入",
    executeJob:
      "执行任务",
    executing:
      "执行中...",
    runtimeStatus:
      "运行状态",
    verification:
      "验证",
    retryCount:
      "重试次数",
    retryExecution:
      "重新执行",
    latestResult:
      "最新结果",
    executionHistory:
      "执行历史",
    refresh:
      "刷新",
    noExecutionJobs:
      "暂时没有执行任务。",
    executionCompleted:
      "执行成功完成。",
    executionFailed:
      "执行失败。",
  },

  ja: {
    execution:
      "実行",
    executionConsole:
      "実行コンソール",
    executionDescription:
      "AIOS の目標を実行ジョブに変換し、実行結果を確認し、検証し、失敗時には復旧します。",
    goal:
      "目標",
    runtimeInput:
      "実行入力",
    executeJob:
      "ジョブを実行",
    executing:
      "実行中...",
    runtimeStatus:
      "実行状態",
    verification:
      "検証",
    retryCount:
      "再試行回数",
    retryExecution:
      "再実行",
    latestResult:
      "最新結果",
    executionHistory:
      "実行履歴",
    refresh:
      "更新",
    noExecutionJobs:
      "実行ジョブはまだありません。",
    executionCompleted:
      "実行が正常に完了しました。",
    executionFailed:
      "実行に失敗しました。",
  },
};

export function getExecutionTranslations(
  locale: string,
): ExecutionTranslations {
  if (
    locale ===
    "zh-CN"
  ) {
    return executionTranslations[
      "zh-CN"
    ];
  }

  if (
    locale ===
    "ja"
  ) {
    return executionTranslations[
      "ja"
    ];
  }

  return executionTranslations.en;
}
