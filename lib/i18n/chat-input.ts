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
    objectiveLabel: "What do you want AIOS to help you achieve?",
    objectivePlaceholder:
      "Tell AIOS what you want to achieve. AIOS will help you understand the goal, plan the path and move it forward…",
  },

  "zh-CN": {
    placeholder: "输入消息……",
    ariaLabel: "输入消息",
    send: "发送消息",
    sending: "正在发送",
    objectiveLabel: "你希望 AIOS 帮你实现什么？",
    objectivePlaceholder:
      "告诉 AIOS 你想达成的目标。AIOS 会帮你理解目标、规划路径，并推动执行……",
  },

  ja: {
    placeholder: "メッセージを入力してください…",
    ariaLabel: "AIOS へのメッセージ入力",
    send: "メッセージを送信",
    sending: "送信しています",
    objectiveLabel: "AIOS に、何を実現してほしいですか？",
    objectivePlaceholder:
      "AIOS に実現したいことを伝えてください。目標を理解し、進め方を整理して実行をサポートします…",
  },
};
