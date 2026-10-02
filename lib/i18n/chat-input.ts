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
    objectiveLabel: "What outcome do you want to achieve?",
    objectivePlaceholder: "Describe the result you want AIOS to deliver…",
  },

  "zh-CN": {
    placeholder: "输入消息……",
    ariaLabel: "输入消息",
    send: "发送消息",
    sending: "正在发送",
    objectiveLabel: "你希望达成什么结果？",
    objectivePlaceholder: "描述你希望 AIOS 交付的结果……",
  },

  ja: {
    placeholder: "メッセージを入力してください…",
    ariaLabel: "AIOS へのメッセージ入力",
    send: "メッセージを送信",
    sending: "送信しています",
    objectiveLabel: "どんな結果を実現したいですか？",
    objectivePlaceholder: "AIOS に届けてほしい結果を説明してください…",
  },
};
