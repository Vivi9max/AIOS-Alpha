import type { Locale } from "@/lib/i18n";

export type FeedbackCategory =
  | "great"
  | "good"
  | "neutral"
  | "bad"
  | "bug";

export interface FeedbackOption {
  category: FeedbackCategory;
  label: string;
  emoji: string;
  rating: number;
}

export interface FeedbackCopy {
  button: string;
  title: string;
  description: string;
  placeholder: string;
  submit: string;
  submitting: string;
  success: string;
  submitFailed: string;
  close: string;
}

export const feedbackOptions: Record<
  Locale,
  FeedbackOption[]
> = {
  en: [
    { category: "great", label: "Excellent", emoji: "😍", rating: 5 },
    { category: "good", label: "Good", emoji: "🙂", rating: 4 },
    { category: "neutral", label: "Okay", emoji: "😐", rating: 3 },
    { category: "bad", label: "Needs work", emoji: "☹️", rating: 2 },
    { category: "bug", label: "Bug found", emoji: "🐛", rating: 1 },
  ],

  "zh-CN": [
    { category: "great", label: "很满意", emoji: "😍", rating: 5 },
    { category: "good", label: "满意", emoji: "🙂", rating: 4 },
    { category: "neutral", label: "一般", emoji: "😐", rating: 3 },
    { category: "bad", label: "不满意", emoji: "☹️", rating: 2 },
    { category: "bug", label: "发现 Bug", emoji: "🐛", rating: 1 },
  ],

  ja: [
    { category: "great", label: "とても満足", emoji: "😍", rating: 5 },
    { category: "good", label: "満足", emoji: "🙂", rating: 4 },
    { category: "neutral", label: "普通", emoji: "😐", rating: 3 },
    { category: "bad", label: "改善が必要", emoji: "☹️", rating: 2 },
    { category: "bug", label: "バグを発見", emoji: "🐛", rating: 1 },
  ],
};

export const feedbackCopy: Record<
  Locale,
  FeedbackCopy
> = {
  en: {
    button: "💬 Feedback",
    title: "Help us improve AIOS",
    description: "Tell us how your experience feels.",
    placeholder:
      "Tell us what works well and what should be improved…",
    submit: "Submit feedback",
    submitting: "Submitting…",
    success: "✅ Thank you for your feedback.",
    submitFailed: "Failed to submit feedback.",
    close: "Close",
  },

  "zh-CN": {
    button: "💬 反馈",
    title: "帮助我们改进 AIOS",
    description: "请选择你的使用感受。",
    placeholder:
      "告诉我们哪里好用、哪里需要改进……",
    submit: "提交反馈",
    submitting: "正在提交……",
    success: "✅ 感谢你的反馈",
    submitFailed: "反馈提交失败。",
    close: "关闭",
  },

  ja: {
    button: "💬 フィードバック",
    title: "AIOS の改善にご協力ください",
    description: "ご利用いただいた感想を教えてください。",
    placeholder:
      "良かった点や改善してほしい点を教えてください…",
    submit: "フィードバックを送信",
    submitting: "送信中…",
    success: "✅ フィードバックありがとうございます。",
    submitFailed:
      "フィードバックの送信に失敗しました。",
    close: "閉じる",
  },
};
