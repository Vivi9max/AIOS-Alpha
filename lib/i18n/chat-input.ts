import type { Locale } from "@/lib/i18n";

export interface ChatInputCopy {
  placeholder: string;
  ariaLabel: string;
  send: string;
  sending: string;
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
  },

  "zh-CN": {
    placeholder: "输入消息……",
    ariaLabel: "输入消息",
    send: "发送消息",
    sending: "正在发送",
  },

  ja: {
    placeholder: "メッセージを入力してください…",
    ariaLabel: "AIOS へのメッセージ入力",
    send: "メッセージを送信",
    sending: "送信しています",
  },
};
