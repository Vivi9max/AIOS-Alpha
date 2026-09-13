import type { Locale } from "@/lib/i18n";

export interface ChatPanelCopy {
  welcome: string;
  restoring: string;
  thinking: string;
  connectionError: string;
  runtimeError: string;
  unknownResponse: string;
  providerFallback: string;
  memoryConnected: string;
  failed: string;
}

export const chatPanelCopy: Record<
  Locale,
  ChatPanelCopy
> = {
  en: {
    welcome:
      "Welcome to AIOS Alpha.\n\nAI Engine is connected.",
    restoring:
      "Restoring your conversation…",
    thinking:
      "AIOS is thinking…",
    connectionError:
      "Connection failed. Please try again shortly.",
    runtimeError:
      "AIOS Runtime error",
    unknownResponse:
      "No response was returned.",
    providerFallback:
      "Provider fallback reason:",
    memoryConnected:
      "Memory connected",
    failed:
      "failed",
  },

  "zh-CN": {
    welcome:
      "欢迎来到 AIOS Alpha。\n\nAI Engine 已连接。",
    restoring:
      "正在恢复你的对话……",
    thinking:
      "AIOS 正在思考……",
    connectionError:
      "连接失败，请稍后再试。",
    runtimeError:
      "AIOS Runtime 错误",
    unknownResponse:
      "AIOS 没有返回有效响应。",
    providerFallback:
      "Provider 回退原因：",
    memoryConnected:
      "Memory 已连接",
    failed:
      "失败",
  },

  ja: {
    welcome:
      "AIOS Alpha へようこそ。\n\nAI Engine に接続されています。",
    restoring:
      "会話を復元しています…",
    thinking:
      "AIOS が考えています…",
    connectionError:
      "接続に失敗しました。しばらくしてからもう一度お試しください。",
    runtimeError:
      "AIOS Runtime エラー",
    unknownResponse:
      "AIOS から応答が返ってきませんでした。",
    providerFallback:
      "Provider の切り替え理由：",
    memoryConnected:
      "Memory に接続されています",
    failed:
      "失敗",
  },
};
