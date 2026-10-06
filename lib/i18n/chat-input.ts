import type { Locale } from "@/lib/i18n";

export interface ChatInputCopy {
  placeholder: string;
  ariaLabel: string;
  send: string;
  sending: string;
  objectiveLabel: string;
  objectivePlaceholder: string;
}

export const chatInputCopy: Record<
  Locale,
  ChatInputCopy
> = {
  en: {
    placeholder: "Message AIOS…",
    ariaLabel: "Message AIOS",
    send: "Send message",
    sending: "Sending",
    objectiveLabel:
      "What do you want to do?",
    objectivePlaceholder:
      "Tell AIOS what you want to do…",
  },

  "zh-CN": {
    placeholder: "输入消息……",
    ariaLabel: "输入消息",
    send: "发送消息",
    sending: "正在发送",
    objectiveLabel:
      "你想让 AIOS 做什么？",
    objectivePlaceholder:
      "告诉 AIOS 你要做什么……",
  },

  ja: {
    placeholder:
      "メッセージを入力してください…",
    ariaLabel:
      "AIOS へのメッセージ入力",
    send: "メッセージを送信",
    sending: "送信しています",
    objectiveLabel:
      "AIOS に何をしてほしいですか？",
    objectivePlaceholder:
      "AIOS にやりたいことを伝えてください…",
  },
};
