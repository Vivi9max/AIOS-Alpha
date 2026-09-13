import type { Locale } from "@/lib/i18n";

export interface RuntimeReviewCopy {
  eyebrow: string;
  title: string;
  description: string;
  analyzing: string;
  analyze: string;
  error: string;
  score: string;
  allowedRate: string;
  completion: string;
  trend: string;
  samples: string;
  priority: string;
  reason: string;
  act: string;
  evidence: string;
  nav: string;
  health: {
    "insufficient-data": string;
    healthy: string;
    watch: string;
    blocked: string;
  };
  trends: {
    "insufficient-data": string;
    improving: string;
    stable: string;
    declining: string;
  };
  refreshAriaLabel: string;
  scoreAriaLabel: string;
}

export const runtimeReviewCopy: Record<
  Locale,
  RuntimeReviewCopy
> = {
  en: {
    eyebrow: "EXECUTION REVIEW",
    title: "Execution Review",
    description:
      "Turn execution evidence into the next improvement action.",
    analyzing: "Analyzing…",
    analyze: "Analyze again",
    error: "Execution review could not be loaded.",
    score: "Health score",
    allowedRate: "Allowed rate",
    completion: "Completion conversion",
    trend: "Recent trend",
    samples: "Evidence samples",
    priority: "SINGLE PRIORITY ACTION",
    reason: "Primary block reason:",
    act: "Execute priority action",
    evidence: "View source evidence",
    nav: "Review related pages",
    health: {
      "insufficient-data": "Build baseline",
      healthy: "Healthy",
      watch: "Watch",
      blocked: "Blocked",
    },
    trends: {
      "insufficient-data": "Insufficient data",
      improving: "Improving",
      stable: "Stable",
      declining: "Declining",
    },
    refreshAriaLabel: "Regenerate execution review",
    scoreAriaLabel: "Execution health score",
  },

  "zh-CN": {
    eyebrow: "执行复盘",
    title: "执行复盘",
    description: "把执行证据转化为下一项改进行动。",
    analyzing: "分析中…",
    analyze: "重新分析",
    error: "执行复盘读取失败。",
    score: "健康分",
    allowedRate: "允许率",
    completion: "完成转化",
    trend: "近期趋势",
    samples: "证据样本",
    priority: "唯一优先动作",
    reason: "主要阻止原因：",
    act: "执行优先动作",
    evidence: "查看原始证据",
    nav: "复盘相关页面",
    health: {
      "insufficient-data": "建立基线",
      healthy: "健康",
      watch: "需关注",
      blocked: "受阻",
    },
    trends: {
      "insufficient-data": "数据不足",
      improving: "正在改善",
      stable: "保持稳定",
      declining: "正在下降",
    },
    refreshAriaLabel: "重新生成执行复盘",
    scoreAriaLabel: "执行健康分",
  },

  ja: {
    eyebrow: "EXECUTION REVIEW",
    title: "実行レビュー",
    description:
      "実行証拠を次の改善アクションへ変換します。",
    analyzing: "分析中…",
    analyze: "再分析",
    error: "実行レビューを読み込めませんでした。",
    score: "健全性スコア",
    allowedRate: "許可率",
    completion: "完了転換率",
    trend: "最近の傾向",
    samples: "証拠サンプル",
    priority: "最優先アクション",
    reason: "主なブロック理由：",
    act: "優先アクションを実行",
    evidence: "元の証拠を見る",
    nav: "レビュー関連ページ",
    health: {
      "insufficient-data": "基準を構築",
      healthy: "健全",
      watch: "要注意",
      blocked: "ブロック",
    },
    trends: {
      "insufficient-data": "データ不足",
      improving: "改善中",
      stable: "安定",
      declining: "低下中",
    },
    refreshAriaLabel: "実行レビューを再生成",
    scoreAriaLabel: "実行健全性スコア",
  },
};
