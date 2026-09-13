import type { Locale } from "@/lib/i18n";

export type OutcomeStatus =
  | "planned"
  | "active"
  | "blocked"
  | "completed"
  | "archived";

export type OutcomePriority = "low" | "normal" | "high" | "critical";

export type MilestoneStatus =
  | "pending"
  | "active"
  | "blocked"
  | "completed";

export interface OutcomeCopy {
  eyebrow: string;
  title: string;
  subtitle: string;
  newOutcome: string;
  cancel: string;
  all: string;
  active: string;
  blocked: string;
  completed: string;
  average: string;
  planned: string;

  createTitle: string;
  createDescription: string;
  titleLabel: string;
  titlePlaceholder: string;
  description: string;
  descriptionPlaceholder: string;
  criteria: string;
  criteriaPlaceholder: string;
  priority: string;
  targetDate: string;

  milestones: string;
  milestoneHelp: string;
  add: string;
  milestone: string;
  delete: string;
  milestoneTitle: string;
  milestoneDescription: string;

  creating: string;
  create: string;

  list: string;
  listDescription: string;
  refreshing: string;
  refresh: string;
  loading: string;
  empty: string;

  low: string;
  normal: string;
  high: string;
  critical: string;
  priorityPrefix: string;

  done: string;
  linked: string;
  start: string;
  markComplete: string;
  archive: string;
  remove: string;

  status: Record<OutcomeStatus, string>;
  milestoneStatus: Record<MilestoneStatus, string>;

  errors: {
    titleRequired: string;
    milestoneRequired: string;
    invalidDate: string;
    load: string;
    create: string;
    update: string;
    milestoneUpdate: string;
    delete: string;
    invalidResponse: (status: number) => string;
    operationFailed: (status: number) => string;
  };

  success: {
    created: (title: string) => string;
    statusUpdated: (title: string, status: string) => string;
    milestoneUpdated: (title: string) => string;
    deleted: (title: string) => string;
  };

  confirmDelete: (title: string) => string;

  initialMilestones: Array<{
    title: string;
    description: string;
  }>;
}

export const outcomesCopy: Record<Locale, OutcomeCopy> = {
  en: {
    eyebrow: "OUTCOME ENGINE",
    title: "Outcomes",
    subtitle: "From goals and milestones to completed outcomes.",
    newOutcome: "＋ New outcome",
    cancel: "Cancel",
    all: "All outcomes",
    active: "Active",
    blocked: "Blocked",
    completed: "Completed",
    average: "Average progress",
    planned: "Planned",

    createTitle: "Create a new outcome",
    createDescription:
      "Define the final result, success criteria and key milestones.",
    titleLabel: "Outcome title",
    titlePlaceholder: "For example: Publicly launch AIOS Alpha",
    description: "Description",
    descriptionPlaceholder:
      "Explain the problem this outcome must solve.",
    criteria: "Success criteria",
    criteriaPlaceholder:
      "For example: 10 real users complete the core flow and submit feedback.",
    priority: "Priority",
    targetDate: "Target date",

    milestones: "Milestones",
    milestoneHelp: "Ordered by the real execution sequence.",
    add: "＋ Add",
    milestone: "Milestone",
    delete: "Delete",
    milestoneTitle: "Milestone title",
    milestoneDescription: "Milestone description",

    creating: "Creating…",
    create: "Create outcome",

    list: "Outcome list",
    listDescription: "Current outcomes, progress and milestones.",
    refreshing: "Refreshing",
    refresh: "Refresh",
    loading: "Loading outcomes…",
    empty:
      "No outcomes yet. Create your first outcome with New outcome.",

    low: "Low",
    normal: "Normal",
    high: "High",
    critical: "Critical",
    priorityPrefix: "Priority",

    done: "complete",
    linked: "linked tasks",
    start: "🚀 Start",
    markComplete: "✅ Mark complete",
    archive: "Archive",
    remove: "Delete outcome",

    status: {
      planned: "Planned",
      active: "Active",
      blocked: "Blocked",
      completed: "Completed",
      archived: "Archived",
    },

    milestoneStatus: {
      pending: "Pending",
      active: "Active",
      blocked: "Blocked",
      completed: "Completed",
    },

    errors: {
      titleRequired: "Please enter an outcome title.",
      milestoneRequired: "Keep at least one milestone.",
      invalidDate: "The target date is invalid.",
      load: "Failed to load outcomes.",
      create: "Failed to create the outcome.",
      update: "Failed to update the outcome.",
      milestoneUpdate: "Failed to update the milestone.",
      delete: "Failed to delete the outcome.",
      invalidResponse: (status) =>
        `The server returned an unreadable response (HTTP ${status}).`,
      operationFailed: (status) =>
        `Outcome operation failed (HTTP ${status}).`,
    },

    success: {
      created: (title) => `Created outcome: ${title}`,
      statusUpdated: (title, status) =>
        `${title} updated to ${status}.`,
      milestoneUpdated: (title) =>
        `Milestone “${title}” updated.`,
      deleted: (title) => `Deleted “${title}”.`,
    },

    confirmDelete: (title) =>
      `Delete outcome “${title}”?`,

    initialMilestones: [
      {
        title: "Complete the MVP",
        description:
          "Core capabilities run as one complete user flow.",
      },
      {
        title: "Complete public deployment",
        description:
          "The public version is stable and mobile-tested.",
      },
      {
        title: "Invite initial users",
        description:
          "Real users complete the flow and submit feedback.",
      },
    ],
  },

  "zh-CN": {
    eyebrow: "成果引擎",
    title: "成果",
    subtitle: "从目标、里程碑到成果完成。",
    newOutcome: "＋ 新建成果",
    cancel: "取消",
    all: "全部成果",
    active: "进行中",
    blocked: "受阻",
    completed: "已完成",
    average: "平均进度",
    planned: "已规划",

    createTitle: "创建新的成果",
    createDescription:
      "定义最终成果、成功标准与关键里程碑。",
    titleLabel: "成果标题",
    titlePlaceholder: "例如：公开发布 AIOS Alpha",
    description: "成果说明",
    descriptionPlaceholder:
      "说明这个成果需要解决什么问题。",
    criteria: "成功标准",
    criteriaPlaceholder:
      "例如：至少 10 位真实用户完成核心流程并提交反馈。",
    priority: "优先级",
    targetDate: "目标日期",

    milestones: "里程碑",
    milestoneHelp: "按实际执行顺序排列。",
    add: "＋ 添加",
    milestone: "里程碑",
    delete: "删除",
    milestoneTitle: "里程碑标题",
    milestoneDescription: "里程碑说明",

    creating: "正在创建…",
    create: "创建成果",

    list: "成果列表",
    listDescription: "当前成果、进度与里程碑。",
    refreshing: "刷新中",
    refresh: "刷新",
    loading: "正在加载成果…",
    empty:
      "还没有成果。点击“新建成果”创建第一个成果目标。",

    low: "低",
    normal: "普通",
    high: "高",
    critical: "最高",
    priorityPrefix: "优先级",

    done: "完成",
    linked: "项关联任务",
    start: "🚀 开始执行",
    markComplete: "✅ 标记完成",
    archive: "归档",
    remove: "删除成果",

    status: {
      planned: "已规划",
      active: "进行中",
      blocked: "受阻",
      completed: "已完成",
      archived: "已归档",
    },

    milestoneStatus: {
      pending: "待开始",
      active: "进行中",
      blocked: "受阻",
      completed: "已完成",
    },

    errors: {
      titleRequired: "请输入成果标题。",
      milestoneRequired: "请至少保留一个里程碑。",
      invalidDate:
        "目标日期格式无效，请重新选择日期。",
      load: "成果加载失败。",
      create: "成果创建失败。",
      update: "成果更新失败。",
      milestoneUpdate: "里程碑更新失败。",
      delete: "成果删除失败。",
      invalidResponse: (status) =>
        `服务器返回了无法解析的结果（HTTP ${status}）。`,
      operationFailed: (status) =>
        `成果操作失败（HTTP ${status}）。`,
    },

    success: {
      created: (title) => `已创建成果：${title}`,
      statusUpdated: (title, status) =>
        `「${title}」已更新为${status}。`,
      milestoneUpdated: (title) =>
        `里程碑「${title}」已更新。`,
      deleted: (title) => `已删除「${title}」。`,
    },

    confirmDelete: (title) =>
      `确定删除成果「${title}」吗？`,

    initialMilestones: [
      {
        title: "完成 MVP",
        description:
          "核心功能可以正常运行并形成完整使用流程。",
      },
      {
        title: "完成公开部署",
        description:
          "公网版本稳定可访问并完成移动端测试。",
      },
      {
        title: "邀请首批用户",
        description:
          "邀请真实用户体验并提交反馈。",
      },
    ],
  },

  ja: {
    eyebrow: "成果エンジン",
    title: "成果",
    subtitle: "目標とマイルストーンから成果達成まで。",
    newOutcome: "＋ 新しい成果",
    cancel: "キャンセル",
    all: "すべての成果",
    active: "進行中",
    blocked: "停止中",
    completed: "完了",
    average: "平均進捗",
    planned: "計画済み",

    createTitle: "新しい成果を作成",
    createDescription:
      "最終成果、成功基準、主要マイルストーンを定義します。",
    titleLabel: "成果名",
    titlePlaceholder: "例：AIOS Alpha を一般公開",
    description: "成果の説明",
    descriptionPlaceholder:
      "この成果で解決する課題を説明してください。",
    criteria: "成功基準",
    criteriaPlaceholder:
      "例：実ユーザー10名が主要フローを完了し、フィードバックを送信。",
    priority: "優先度",
    targetDate: "目標日",

    milestones: "マイルストーン",
    milestoneHelp: "実際の実行順に並べます。",
    add: "＋ 追加",
    milestone: "マイルストーン",
    delete: "削除",
    milestoneTitle: "マイルストーン名",
    milestoneDescription: "マイルストーンの説明",

    creating: "作成中…",
    create: "成果を作成",

    list: "成果一覧",
    listDescription:
      "現在の成果、進捗、マイルストーン。",
    refreshing: "更新中",
    refresh: "更新",
    loading: "成果を読み込み中…",
    empty:
      "成果はまだありません。「新しい成果」から最初の成果を作成してください。",

    low: "低",
    normal: "通常",
    high: "高",
    critical: "最優先",
    priorityPrefix: "優先度",

    done: "完了",
    linked: "件の関連タスク",
    start: "🚀 実行開始",
    markComplete: "✅ 完了にする",
    archive: "アーカイブ",
    remove: "成果を削除",

    status: {
      planned: "計画済み",
      active: "進行中",
      blocked: "停止中",
      completed: "完了",
      archived: "アーカイブ済み",
    },

    milestoneStatus: {
      pending: "未着手",
      active: "進行中",
      blocked: "停止中",
      completed: "完了",
    },

    errors: {
      titleRequired: "成果名を入力してください。",
      milestoneRequired:
        "少なくとも1つのマイルストーンを残してください。",
      invalidDate: "目標日の形式が無効です。",
      load: "成果を読み込めませんでした。",
      create: "成果を作成できませんでした。",
      update: "成果を更新できませんでした。",
      milestoneUpdate:
        "マイルストーンを更新できませんでした。",
      delete: "成果を削除できませんでした。",
      invalidResponse: (status) =>
        `サーバーから解析できない応答が返されました（HTTP ${status}）。`,
      operationFailed: (status) =>
        `成果の操作に失敗しました（HTTP ${status}）。`,
    },

    success: {
      created: (title) =>
        `成果を作成しました：${title}`,
      statusUpdated: (title, status) =>
        `${title} を「${status}」に更新しました。`,
      milestoneUpdated: (title) =>
        `マイルストーン「${title}」を更新しました。`,
      deleted: (title) =>
        `「${title}」を削除しました。`,
    },

    confirmDelete: (title) =>
      `成果「${title}」を削除しますか？`,

    initialMilestones: [
      {
        title: "MVPを完成",
        description:
          "主要機能を完全な利用フローとして動作させる。",
      },
      {
        title: "一般公開を完了",
        description:
          "公開版を安定稼働させ、モバイルで検証する。",
      },
      {
        title: "初期ユーザーを招待",
        description:
          "実ユーザーに体験とフィードバックを依頼する。",
      },
    ],
  },
};
