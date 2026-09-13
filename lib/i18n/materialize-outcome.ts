import type { Locale } from "@/lib/i18n";

export interface MaterializeOutcomeCopy {
  eyebrow: string;
  connected: string;
  convert: string;
  existing: (count: number) => string;
  fresh: (title: string) => string;
  generating: string;
  resync: string;
  generate: string;
  result: string;
  total: (count: number) => string;
  created: (count: number) => string;
  reused: (count: number) => string;
  openTasks: string;
  openPlanner: string;
  serverInvalidResponse: (status: number) => string;
  materializeFailed: (status: number) => string;
  missingWorkflow: string;
  genericFailed: string;
}

export const materializeOutcomeCopy: Record<
  Locale,
  MaterializeOutcomeCopy
> = {
  en: {
    eyebrow: "EXECUTION ENGINE",
    connected: "Execution tasks connected",
    convert: "Turn milestones into real tasks",
    existing: (count) =>
      `This outcome has ${count} linked tasks. Running again will not duplicate active tasks with the same name.`,
    fresh: (title) =>
      `Create one task for every milestone in “${title}” and synchronize them with Planner.`,
    generating: "Generating execution tasks…",
    resync: "Synchronize execution tasks",
    generate: "⚡ Generate execution tasks",
    result: "Execution workflow synchronized",
    total: (count) => `${count} tasks`,
    created: (count) => `${count} created`,
    reused: (count) => `${count} reused`,
    openTasks: "Open tasks →",
    openPlanner: "Open Planner →",
    serverInvalidResponse: (status) =>
      `The server returned an unreadable response (HTTP ${status}).`,
    materializeFailed: (status) =>
      `Task generation failed (HTTP ${status}).`,
    missingWorkflow:
      "The server did not return a task generation result.",
    genericFailed:
      "Task generation failed.",
  },

  "zh-CN": {
    eyebrow: "执行引擎",
    connected: "执行任务已连接",
    convert: "将里程碑转为真实任务",
    existing: (count) =>
      `当前 Outcome 已连接 ${count} 项任务。再次执行不会重复创建活动中的同名任务。`,
    fresh: (title) =>
      `为「${title}」的每个里程碑创建一项任务，并同步到 Planner。`,
    generating: "正在生成执行任务…",
    resync: "重新同步执行任务",
    generate: "⚡ 生成执行任务",
    result: "执行工作流已同步",
    total: (count) => `共 ${count} 项任务`,
    created: (count) => `新建 ${count} 项`,
    reused: (count) => `复用 ${count} 项`,
    openTasks: "查看 Tasks →",
    openPlanner: "查看 Planner →",
    serverInvalidResponse: (status) =>
      `服务器返回了无法解析的结果（HTTP ${status}）。`,
    materializeFailed: (status) =>
      `执行任务生成失败（HTTP ${status}）。`,
    missingWorkflow:
      "服务器未返回任务生成结果。",
    genericFailed: "执行任务生成失败。",
  },

  ja: {
    eyebrow: "EXECUTION ENGINE",
    connected: "実行タスク接続済み",
    convert: "マイルストーンを実行タスクに変換",
    existing: (count) =>
      `この成果には ${count} 件のタスクが接続済みです。再実行しても同名の有効タスクは重複しません。`,
    fresh: (title) =>
      `「${title}」の各マイルストーンからタスクを作成し、Planner と同期します。`,
    generating: "実行タスクを生成中…",
    resync: "実行タスクを再同期",
    generate: "⚡ 実行タスクを生成",
    result: "実行ワークフローを同期しました",
    total: (count) => `${count} 件のタスク`,
    created: (count) => `${count} 件を新規作成`,
    reused: (count) => `${count} 件を再利用`,
    openTasks: "タスクを開く →",
    openPlanner: "Planner を開く →",
    serverInvalidResponse: (status) =>
      `サーバーから解析できない応答が返されました（HTTP ${status}）。`,
    materializeFailed: (status) =>
      `実行タスクの生成に失敗しました（HTTP ${status}）。`,
    missingWorkflow:
      "サーバーからタスク生成結果が返されませんでした。",
    genericFailed:
      "実行タスクの生成に失敗しました。",
  },
};
