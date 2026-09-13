import type { Locale } from "@/lib/i18n";

export type MemoryProfileField =
  | "name"
  | "location"
  | "project"
  | "goal"
  | "preference";

export interface MemoryFieldDefinition {
  key: MemoryProfileField;
  label: string;
  placeholder: string;
  icon: string;
}

export interface MemoryPageCopy {
  title: string;
  description: string;

  clear: string;
  clearConfirm: string;

  profileTitle: string;
  profileDescription: string;
  edit: string;
  save: string;
  saving: string;
  cancel: string;
  reset: string;
  resetConfirm: string;

  saved: string;
  resetDone: string;
  cleared: string;

  conversationTitle: string;
  conversationDescription: string;
  empty: string;

  loading: string;
  missing: string;

  loadError: string;
  saveError: string;
  resetError: string;
  clearError: string;

  progress: string;
  fields: string;
  user: string;
  assistant: string;
}

export const memoryProfileFields: Record<
  Locale,
  MemoryFieldDefinition[]
> = {
  en: [
    {
      key: "name",
      label: "Name",
      icon: "👤",
      placeholder: "For example: Vivi",
    },
    {
      key: "location",
      label: "Location",
      icon: "📍",
      placeholder: "For example: China or Japan",
    },
    {
      key: "project",
      label: "Current project",
      icon: "🚀",
      placeholder: "For example: AIOS Alpha",
    },
    {
      key: "goal",
      label: "Long-term goal",
      icon: "🎯",
      placeholder:
        "For example: Launch AIOS Alpha publicly",
    },
    {
      key: "preference",
      label: "Preferences",
      icon: "✨",
      placeholder:
        "For example: concise, delivery-first responses",
    },
  ],

  "zh-CN": [
    {
      key: "name",
      label: "姓名",
      icon: "👤",
      placeholder: "例如：Vivi",
    },
    {
      key: "location",
      label: "所在地",
      icon: "📍",
      placeholder: "例如：中国、日本",
    },
    {
      key: "project",
      label: "当前项目",
      icon: "🚀",
      placeholder: "例如：AIOS Alpha",
    },
    {
      key: "goal",
      label: "长期目标",
      icon: "🎯",
      placeholder:
        "例如：让 AIOS Alpha 正式上线",
    },
    {
      key: "preference",
      label: "用户偏好",
      icon: "✨",
      placeholder:
        "例如：少废话、直接交付",
    },
  ],

  ja: [
    {
      key: "name",
      label: "名前",
      icon: "👤",
      placeholder: "例：Vivi",
    },
    {
      key: "location",
      label: "所在地",
      icon: "📍",
      placeholder: "例：中国、日本",
    },
    {
      key: "project",
      label: "現在のプロジェクト",
      icon: "🚀",
      placeholder: "例：AIOS Alpha",
    },
    {
      key: "goal",
      label: "長期目標",
      icon: "🎯",
      placeholder:
        "例：AIOS Alpha を一般公開",
    },
    {
      key: "preference",
      label: "ユーザー設定",
      icon: "✨",
      placeholder:
        "例：簡潔で成果物を優先",
    },
  ],
};

export const memoryPageCopy: Record<
  Locale,
  MemoryPageCopy
> = {
  en: {
    title: "Memory",
    description:
      "Manage structured long-term information and conversation memory.",

    clear: "Clear conversations",
    clearConfirm:
      "Clear all conversation memory? Your manually saved profile will remain.",

    profileTitle: "Memory Profile",
    profileDescription:
      "Structured information retained for future conversations.",
    edit: "Edit profile",
    save: "Save profile",
    saving: "Saving…",
    cancel: "Cancel",
    reset: "Reset manual profile",
    resetConfirm:
      "Reset manually entered profile information? Information automatically extracted from conversations will remain.",

    saved: "Memory Profile saved.",
    resetDone:
      "Manual profile information reset.",
    cleared: "Conversation memory cleared.",

    conversationTitle: "Conversation memory",
    conversationDescription:
      "Context retained from previous conversations.",
    empty: "No conversation memory yet.",

    loading: "Loading memory…",
    missing: "Not recorded",

    loadError:
      "Memory could not be loaded.",
    saveError:
      "Memory Profile could not be saved.",
    resetError:
      "Memory Profile could not be reset.",
    clearError:
      "Conversation memory could not be cleared.",

    progress: "Profile completeness",
    fields: "fields",
    user: "You",
    assistant: "AIOS",
  },

  "zh-CN": {
    title: "记忆",
    description:
      "管理结构化长期资料和对话记忆。",

    clear: "清空对话",
    clearConfirm:
      "确定清空全部对话记忆吗？手动保存的 Profile 会继续保留。",

    profileTitle: "Memory Profile",
    profileDescription:
      "为后续对话保留的结构化长期资料。",
    edit: "编辑 Profile",
    save: "保存资料",
    saving: "保存中…",
    cancel: "取消",
    reset: "重置手动资料",
    resetConfirm:
      "确定重置手动填写的资料吗？从对话中自动提取的资料仍会保留。",

    saved: "Memory Profile 已保存。",
    resetDone: "手动资料已重置。",
    cleared: "对话记忆已清空。",

    conversationTitle: "对话记忆",
    conversationDescription:
      "从历史对话中保留的上下文。",
    empty: "还没有对话记忆。",

    loading: "正在读取记忆……",
    missing: "尚未记录",

    loadError: "记忆读取失败。",
    saveError: "Memory Profile 保存失败。",
    resetError: "Memory Profile 重置失败。",
    clearError: "清空对话记忆失败。",

    progress: "Profile 完整度",
    fields: "项",
    user: "你",
    assistant: "AIOS",
  },

  ja: {
    title: "メモリー",
    description:
      "構造化された長期情報と会話メモリーを管理します。",

    clear: "会話を消去",
    clearConfirm:
      "すべての会話メモリーを消去しますか？手動で保存したプロフィールは残ります。",

    profileTitle: "メモリープロフィール",
    profileDescription:
      "今後の会話で使用する構造化された長期情報です。",
    edit: "プロフィールを編集",
    save: "プロフィールを保存",
    saving: "保存中…",
    cancel: "キャンセル",
    reset: "手動情報をリセット",
    resetConfirm:
      "手動で入力したプロフィール情報をリセットしますか？会話から自動抽出された情報は残ります。",

    saved: "プロフィールを保存しました。",
    resetDone:
      "手動情報をリセットしました。",
    cleared: "会話メモリーを消去しました。",

    conversationTitle: "会話メモリー",
    conversationDescription:
      "過去の会話から保持されたコンテキスト。",
    empty: "会話メモリーはまだありません。",

    loading: "メモリーを読み込み中…",
    missing: "未登録",

    loadError:
      "メモリーを読み込めませんでした。",
    saveError:
      "プロフィールを保存できませんでした。",
    resetError:
      "プロフィールをリセットできませんでした。",
    clearError:
      "会話メモリーを消去できませんでした。",

    progress: "プロフィール完成度",
    fields: "項目",
    user: "あなた",
    assistant: "AIOS",
  },
};
