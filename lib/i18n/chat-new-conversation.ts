import type { Locale } from "@/lib/i18n";

export interface ChatNewConversationCopy {
  confirmTitle: string;
  confirmBody: string;
  confirmMemory: string;
  creating: string;
  newConversation: string;
  resetFailed: string;
  createFailed: string;
}

export const chatNewConversationCopy: Record<
  Locale,
  ChatNewConversationCopy
> = {
  en: {
    confirmTitle:
      "Start a new conversation?",
    confirmBody:
      "The current conversation history will be cleared.",
    confirmMemory:
      "Memory Profile and Tasks will not be affected.",
    creating: "Creating…",
    newConversation:
      "＋ New conversation",
    resetFailed:
      "Conversation reset failed.",
    createFailed:
      "Failed to create a new conversation.",
  },

  "zh-CN": {
    confirmTitle:
      "确定开始新对话吗？",
    confirmBody:
      "当前对话记录将被清空。",
    confirmMemory:
      "Memory Profile 和 Tasks 不会受到影响。",
    creating: "正在创建…",
    newConversation:
      "＋ 新对话",
    resetFailed:
      "对话重置失败。",
    createFailed:
      "新对话创建失败。",
  },

  ja: {
    confirmTitle:
      "新しい会話を開始しますか？",
    confirmBody:
      "現在の会話履歴は消去されます。",
    confirmMemory:
      "Memory Profile と Tasks には影響しません。",
    creating: "作成中…",
    newConversation:
      "＋ 新しい会話",
    resetFailed:
      "会話のリセットに失敗しました。",
    createFailed:
      "新しい会話を作成できませんでした。",
  },
};
