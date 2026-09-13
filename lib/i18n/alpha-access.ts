import type { Locale } from "@/lib/i18n";

export interface AlphaAccessCopy {
  badge: string;
  title: string;
  description: string;
  inviteLabel: string;
  invitePlaceholder: string;
  verifying: string;
  enter: string;
  continueText: string;
  privacy: string;
  invalidCode: string;
}

export const alphaAccessCopy: Record<
  Locale,
  AlphaAccessCopy
> = {
  en: {
    badge: "PRIVATE ALPHA",
    title: "Welcome to AIOS Alpha",
    description:
      "AIOS Alpha is currently available to a limited group of early testers. Enter your invitation code to continue to the workspace.",
    inviteLabel: "Alpha invitation code",
    invitePlaceholder:
      "Enter your invitation code",
    verifying: "Verifying…",
    enter: "Enter AIOS Alpha",
    continueText:
      "By continuing, you agree to the",
    privacy: "Alpha Privacy Notice",
    invalidCode:
      "We couldn't verify this invitation code.",
  },

  "zh-CN": {
    badge: "封闭 Alpha",
    title: "欢迎来到 AIOS Alpha",
    description:
      "AIOS Alpha 目前仅向首批测试用户开放。请输入邀请码，进入 AIOS 工作空间。",
    inviteLabel: "Alpha 邀请码",
    invitePlaceholder: "请输入邀请码",
    verifying: "正在验证……",
    enter: "进入 AIOS Alpha",
    continueText: "继续即表示你同意",
    privacy: "Alpha 隐私说明",
    invalidCode:
      "邀请码验证失败，请检查后重试。",
  },

  ja: {
    badge: "クローズド Alpha",
    title: "AIOS Alpha へようこそ",
    description:
      "AIOS Alpha は現在、限られた先行テスターの方にのみ公開しています。招待コードを入力して、ワークスペースへ進んでください。",
    inviteLabel: "Alpha 招待コード",
    invitePlaceholder:
      "招待コードを入力してください",
    verifying: "確認しています…",
    enter: "AIOS Alpha に入る",
    continueText:
      "続行すると、",
    privacy: "Alpha プライバシー通知",
    invalidCode:
      "招待コードを確認できませんでした。もう一度お試しください。",
  },
};
