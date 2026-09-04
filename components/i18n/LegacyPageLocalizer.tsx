"use client";

import { useEffect } from "react";
import { useLanguage } from "@/components/i18n/LanguageProvider";

type Locale = "en" | "zh-CN" | "ja";

type TranslationTriple = {
  en: string;
  "zh-CN": string;
  ja: string;
};

/**
 * C142.6
 *
 * Global Strict i18n compatibility layer.
 *
 * The main AIOS UI should use the typed i18n system directly.
 * This component exists as a compatibility boundary for legacy
 * hard-coded UI strings that still exist in older pages/components.
 *
 * Important:
 * - Only known UI phrases are translated.
 * - User-generated content is not translated.
 * - Product/technical names such as AIOS, Runtime, Planner,
 *   GitHub, API, Provider, Outcome and Execution remain intact.
 * - Translation is bidirectional so an English, Chinese or Japanese
 *   legacy string can be normalized into the selected locale.
 */

const TRANSLATIONS: TranslationTriple[] = [
  {
    en: "Dashboard",
    "zh-CN": "控制台",
    ja: "ダッシュボード",
  },
  {
    en: "AIOS Dashboard",
    "zh-CN": "AIOS 控制台",
    ja: "AIOS ダッシュボード",
  },
  {
    en: "Settings",
    "zh-CN": "设置",
    ja: "設定",
  },
  {
    en: "Runtime",
    "zh-CN": "Runtime",
    ja: "Runtime",
  },
  {
    en: "Runtime Control Center",
    "zh-CN": "运行控制中心",
    ja: "ランタイム管理センター",
  },
  {
    en: "Runtime Console",
    "zh-CN": "Runtime Console",
    ja: "Runtime Console",
  },
  {
    en: "Runtime Online",
    "zh-CN": "Runtime 在线",
    ja: "Runtime 稼働中",
  },
  {
    en: "Runtime Offline",
    "zh-CN": "Runtime 离线",
    ja: "Runtime 停止中",
  },
  {
    en: "Runtime status",
    "zh-CN": "Runtime 状态",
    ja: "Runtime 状態",
  },
  {
    en: "Provider",
    "zh-CN": "Provider",
    ja: "Provider",
  },
  {
    en: "Active Provider",
    "zh-CN": "当前 Provider",
    ja: "アクティブ Provider",
  },
  {
    en: "ACTIVE PROVIDER",
    "zh-CN": "当前 PROVIDER",
    ja: "アクティブ PROVIDER",
  },
  {
    en: "Online",
    "zh-CN": "在线",
    ja: "オンライン",
  },
  {
    en: "Offline",
    "zh-CN": "离线",
    ja: "オフライン",
  },
  {
    en: "Memory",
    "zh-CN": "记忆",
    ja: "メモリー",
  },
  {
    en: "Tasks",
    "zh-CN": "任务",
    ja: "タスク",
  },
  {
    en: "Projects",
    "zh-CN": "项目",
    ja: "プロジェクト",
  },
  {
    en: "Planner",
    "zh-CN": "Planner",
    ja: "Planner",
  },
  {
    en: "Brain",
    "zh-CN": "智能核心",
    ja: "ブレイン",
  },
  {
    en: "Storage",
    "zh-CN": "存储",
    ja: "ストレージ",
  },
  {
    en: "Chat",
    "zh-CN": "对话",
    ja: "チャット",
  },
  {
    en: "New Task",
    "zh-CN": "新建任务",
    ja: "新規タスク",
  },
  {
    en: "Save",
    "zh-CN": "保存",
    ja: "保存",
  },
  {
    en: "Save Settings",
    "zh-CN": "保存设置",
    ja: "設定を保存",
  },
  {
    en: "Refresh",
    "zh-CN": "刷新",
    ja: "更新",
  },
  {
    en: "Refreshing…",
    "zh-CN": "刷新中…",
    ja: "更新中…",
  },
  {
    en: "Loading…",
    "zh-CN": "加载中…",
    ja: "読み込み中…",
  },
  {
    en: "Loading",
    "zh-CN": "加载中",
    ja: "読み込み中",
  },
  {
    en: "Reading…",
    "zh-CN": "读取中…",
    ja: "読み込み中…",
  },
  {
    en: "Processing…",
    "zh-CN": "处理中…",
    ja: "処理中…",
  },
  {
    en: "Checking…",
    "zh-CN": "检查中…",
    ja: "確認中…",
  },
  {
    en: "Synchronizing…",
    "zh-CN": "同步中…",
    ja: "同期中…",
  },
  {
    en: "Success",
    "zh-CN": "成功",
    ja: "成功",
  },
  {
    en: "Failed",
    "zh-CN": "失败",
    ja: "失敗",
  },
  {
    en: "Error",
    "zh-CN": "错误",
    ja: "エラー",
  },
  {
    en: "Unknown",
    "zh-CN": "未知",
    ja: "不明",
  },
  {
    en: "None",
    "zh-CN": "暂无",
    ja: "なし",
  },

  // Tasks
  {
    en: "Task queue",
    "zh-CN": "任务队列",
    ja: "タスクキュー",
  },
  {
    en: "Task list",
    "zh-CN": "任务列表",
    ja: "タスク一覧",
  },
  {
    en: "Task title",
    "zh-CN": "任务标题",
    ja: "タスク名",
  },
  {
    en: "Task description",
    "zh-CN": "任务说明",
    ja: "タスクの説明",
  },
  {
    en: "Create task",
    "zh-CN": "创建任务",
    ja: "タスクを作成",
  },
  {
    en: "No tasks yet",
    "zh-CN": "还没有任务",
    ja: "タスクはまだありません",
  },
  {
    en: "Allowed",
    "zh-CN": "允许",
    ja: "許可",
  },
  {
    en: "Paused",
    "zh-CN": "已暂停",
    ja: "一時停止",
  },
  {
    en: "In progress",
    "zh-CN": "进行中",
    ja: "進行中",
  },
  {
    en: "Waiting",
    "zh-CN": "等待中",
    ja: "待機中",
  },
  {
    en: "Completed",
    "zh-CN": "已完成",
    ja: "完了",
  },
  {
    en: "Completed tasks",
    "zh-CN": "已完成任务",
    ja: "完了したタスク",
  },

  // Planner
  {
    en: "Strategic Planner",
    "zh-CN": "战略规划器",
    ja: "戦略プランナー",
  },
  {
    en: "Waiting for goal",
    "zh-CN": "等待目标",
    ja: "目標を待機中",
  },
  {
    en: "Goal is clear",
    "zh-CN": "目标清晰",
    ja: "目標が明確です",
  },
  {
    en: "Ready to plan",
    "zh-CN": "可以规划",
    ja: "計画可能",
  },
  {
    en: "Add more detail",
    "zh-CN": "建议补充细节",
    ja: "詳細を追加",
  },
  {
    en: "Final outcome",
    "zh-CN": "最终结果",
    ja: "最終成果",
  },
  {
    en: "Timeframe",
    "zh-CN": "时间范围",
    ja: "期間",
  },
  {
    en: "Success metric",
    "zh-CN": "成功标准",
    ja: "成功指標",
  },
  {
    en: "Constraints",
    "zh-CN": "限制条件",
    ja: "制約",
  },
  {
    en: "Generating plan…",
    "zh-CN": "正在生成计划…",
    ja: "計画を生成中…",
  },
  {
    en: "Generate plan",
    "zh-CN": "生成计划",
    ja: "計画を生成",
  },
  {
    en: "Planning and executing…",
    "zh-CN": "正在规划并执行…",
    ja: "計画して実行中…",
  },
  {
    en: "Plan and execute",
    "zh-CN": "规划并执行",
    ja: "計画して実行",
  },

  // Execution
  {
    en: "Execution Center",
    "zh-CN": "执行中心",
    ja: "実行センター",
  },
  {
    en: "Execution plan",
    "zh-CN": "执行计划",
    ja: "実行計画",
  },
  {
    en: "Execution Trace",
    "zh-CN": "执行轨迹",
    ja: "Execution Trace",
  },
  {
    en: "Current stage",
    "zh-CN": "当前阶段",
    ja: "現在の段階",
  },
  {
    en: "Current milestone",
    "zh-CN": "当前里程碑",
    ja: "現在のマイルストーン",
  },
  {
    en: "Queue total",
    "zh-CN": "队列总数",
    ja: "キュー合計",
  },
  {
    en: "Remaining",
    "zh-CN": "待执行",
    ja: "未実行",
  },
  {
    en: "Start next",
    "zh-CN": "开始下一项",
    ja: "次を開始",
  },
  {
    en: "Starting…",
    "zh-CN": "开始中…",
    ja: "開始中…",
  },
  {
    en: "Completing…",
    "zh-CN": "完成中…",
    ja: "完了処理中…",
  },
  {
    en: "Complete current task",
    "zh-CN": "完成当前任务",
    ja: "現在のタスクを完了",
  },
  {
    en: "No execution queue yet",
    "zh-CN": "尚未建立执行队列",
    ja: "実行キューはまだありません",
  },

  // Outcomes
  {
    en: "Outcome",
    "zh-CN": "成果",
    ja: "成果",
  },
  {
    en: "Outcomes",
    "zh-CN": "成果",
    ja: "成果",
  },
  {
    en: "All outcomes",
    "zh-CN": "全部成果",
    ja: "すべての成果",
  },
  {
    en: "Active",
    "zh-CN": "进行中",
    ja: "進行中",
  },
  {
    en: "Blocked",
    "zh-CN": "受阻",
    ja: "停止中",
  },
  {
    en: "Planned",
    "zh-CN": "已规划",
    ja: "計画済み",
  },
  {
    en: "Archived",
    "zh-CN": "已归档",
    ja: "アーカイブ済み",
  },
  {
    en: "Average progress",
    "zh-CN": "平均进度",
    ja: "平均進捗",
  },
  {
    en: "Create a new outcome",
    "zh-CN": "创建新的 Outcome",
    ja: "新しい成果を作成",
  },
  {
    en: "Outcome title",
    "zh-CN": "Outcome 标题",
    ja: "成果名",
  },
  {
    en: "Description",
    "zh-CN": "成果说明",
    ja: "成果の説明",
  },
  {
    en: "Success criteria",
    "zh-CN": "成功标准",
    ja: "成功基準",
  },
  {
    en: "Priority",
    "zh-CN": "优先级",
    ja: "優先度",
  },
  {
    en: "Target date",
    "zh-CN": "目标日期",
    ja: "目標日",
  },
  {
    en: "Milestones",
    "zh-CN": "里程碑",
    ja: "マイルストーン",
  },
  {
    en: "Milestone",
    "zh-CN": "里程碑",
    ja: "マイルストーン",
  },
  {
    en: "Milestone title",
    "zh-CN": "里程碑标题",
    ja: "マイルストーン名",
  },
  {
    en: "Milestone description",
    "zh-CN": "里程碑说明",
    ja: "マイルストーンの説明",
  },
  {
    en: "Add",
    "zh-CN": "添加",
    ja: "追加",
  },
  {
    en: "Delete",
    "zh-CN": "删除",
    ja: "削除",
  },
  {
    en: "Cancel",
    "zh-CN": "取消",
    ja: "キャンセル",
  },
  {
    en: "Create outcome",
    "zh-CN": "创建 Outcome",
    ja: "成果を作成",
  },
  {
    en: "Refreshing",
    "zh-CN": "刷新中",
    ja: "更新中",
  },
  {
    en: "Refresh",
    "zh-CN": "刷新",
    ja: "更新",
  },
  {
    en: "Loading outcomes…",
    "zh-CN": "正在加载 Outcomes…",
    ja: "成果を読み込み中…",
  },
  {
    en: "Low",
    "zh-CN": "低",
    ja: "低",
  },
  {
    en: "Normal",
    "zh-CN": "普通",
    ja: "通常",
  },
  {
    en: "High",
    "zh-CN": "高",
    ja: "高",
  },
  {
    en: "Critical",
    "zh-CN": "最高",
    ja: "最優先",
  },
  {
    en: "Pending",
    "zh-CN": "待开始",
    ja: "未着手",
  },

  // Common legacy status strings
  {
    en: "Running",
    "zh-CN": "运行中",
    ja: "稼働中",
  },
  {
    en: "Planning",
    "zh-CN": "规划中",
    ja: "計画中",
  },
  {
    en: "Building",
    "zh-CN": "建设中",
    ja: "構築中",
  },
  {
    en: "Ready",
    "zh-CN": "已就绪",
    ja: "準備完了",
  },
  {
    en: "Open",
    "zh-CN": "打开",
    ja: "開く",
  },
  {
    en: "Close",
    "zh-CN": "关闭",
    ja: "閉じる",
  },
  {
    en: "Back",
    "zh-CN": "返回",
    ja: "戻る",
  },
  {
    en: "Create",
    "zh-CN": "创建",
    ja: "作成",
  },
  {
    en: "Save",
    "zh-CN": "保存",
    ja: "保存",
  },
  {
    en: "Language",
    "zh-CN": "语言",
    ja: "言語",
  },

  // Founder / development UI
  {
    en: "FOUNDER ONLY",
    "zh-CN": "仅限创始人",
    ja: "創設者専用",
  },
  {
    en: "FOUNDER AUTH",
    "zh-CN": "创始人授权",
    ja: "創設者認証",
  },
  {
    en: "Founder Access Key",
    "zh-CN": "创始人访问密钥",
    ja: "創設者アクセスキー",
  },
  {
    en: "Run",
    "zh-CN": "运行",
    ja: "実行",
  },
  {
    en: "EXECUTION PIPELINE",
    "zh-CN": "执行流程",
    ja: "実行パイプライン",
  },
  {
    en: "READ",
    "zh-CN": "读取",
    ja: "読み取り",
  },
  {
    en: "WRITE",
    "zh-CN": "写入",
    ja: "書き込み",
  },
  {
    en: "COMMIT",
    "zh-CN": "提交",
    ja: "コミット",
  },
  {
    en: "READBACK",
    "zh-CN": "回读验证",
    ja: "読み戻し検証",
  },
  {
    en: "VERIFY",
    "zh-CN": "验证",
    ja: "検証",
  },
  {
    en: "PLANNER",
    "zh-CN": "Planner",
    ja: "Planner",
  },
  {
    en: "ELIGIBILITY",
    "zh-CN": "资格检查",
    ja: "実行資格",
  },
  {
    en: "AUTONOMOUS TASK",
    "zh-CN": "自主任务",
    ja: "自律タスク",
  },
  {
    en: "CLAIM",
    "zh-CN": "领取任务",
    ja: "タスク取得",
  },
  {
    en: "DISPATCH BLOCKED",
    "zh-CN": "调度受阻",
    ja: "ディスパッチ停止",
  },
  {
    en: "Code:",
    "zh-CN": "代码：",
    ja: "コード：",
  },
  {
    en: "Autonomous development dispatch failed.",
    "zh-CN": "自主开发调度失败。",
    ja: "自律開発のディスパッチに失敗しました。",
  },
  {
    en: "Founder Access Key loaded",
    "zh-CN": "创始人访问密钥已加载",
    ja: "創設者アクセスキーを読み込みました",
  },
];

/**
 * Match longer phrases first.
 *
 * This prevents:
 *   "Runtime Control Center"
 * from being partially transformed by:
 *   "Runtime"
 */
const SORTED_TRANSLATIONS = [...TRANSLATIONS].sort((a, b) => {
  const maxA = Math.max(a.en.length, a["zh-CN"].length, a.ja.length);
  const maxB = Math.max(b.en.length, b["zh-CN"].length, b.ja.length);
  return maxB - maxA;
});

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function translateText(text: string, locale: Locale): string {
  if (!text.trim()) return text;

  let result = text;

  for (const entry of SORTED_TRANSLATIONS) {
    const target = entry[locale];

    const sources =
      locale === "en"
        ? [entry["zh-CN"], entry.ja]
        : locale === "zh-CN"
          ? [entry.en, entry.ja]
          : [entry.en, entry["zh-CN"]];

    for (const source of sources) {
      if (!source || source === target) continue;

      if (result === source) {
        return target;
      }

      if (result.includes(source)) {
        result = result.replace(
          new RegExp(escapeRegExp(source), "g"),
          target,
        );
      }
    }
  }

  return result;
}

const TRANSLATABLE_ATTRIBUTES = [
  "placeholder",
  "title",
  "aria-label",
  "aria-description",
] as const;

function shouldSkipElement(element: Element): boolean {
  const tag = element.tagName;

  return [
    "SCRIPT",
    "STYLE",
    "NOSCRIPT",
    "CODE",
    "PRE",
    "TEXTAREA",
  ].includes(tag);
}

function translateTextNodes(locale: Locale): void {
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
  );

  const nodes: Text[] = [];

  let node = walker.nextNode();

  while (node) {
    const parent = node.parentElement;

    if (
      parent &&
      !shouldSkipElement(parent) &&
      parent.getAttribute("data-i18n-ignore") !== "true"
    ) {
      nodes.push(node as Text);
    }

    node = walker.nextNode();
  }

  for (const textNode of nodes) {
    const current = textNode.nodeValue ?? "";

    if (!current.trim()) continue;

    const translated = translateText(current, locale);

    if (translated !== current) {
      textNode.nodeValue = translated;
    }
  }
}

function translateAttributes(locale: Locale): void {
  const elements = document.querySelectorAll<HTMLElement>(
    "[placeholder], [title], [aria-label], [aria-description]",
  );

  for (const element of elements) {
    if (shouldSkipElement(element)) continue;

    if (element.dataset.i18nIgnore === "true") continue;

    for (const attribute of TRANSLATABLE_ATTRIBUTES) {
      const value = element.getAttribute(attribute);

      if (!value) continue;

      const translated = translateText(value, locale);

      if (translated !== value) {
        element.setAttribute(attribute, translated);
      }
    }
  }
}

function translateLegacyUI(locale: Locale): void {
  translateTextNodes(locale);
  translateAttributes(locale);
}

export default function LegacyPageLocalizer() {
  const { locale } = useLanguage();

  useEffect(() => {
    let frame = 0;

    const scheduleTranslation = () => {
      cancelAnimationFrame(frame);

      frame = requestAnimationFrame(() => {
        translateLegacyUI(locale);
      });
    };

    scheduleTranslation();

    const observer = new MutationObserver(() => {
      scheduleTranslation();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        "placeholder",
        "title",
        "aria-label",
        "aria-description",
      ],
    });

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [locale]);

  return null;
}
