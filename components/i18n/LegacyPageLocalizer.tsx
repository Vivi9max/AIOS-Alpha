"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useLanguage } from "@/components/i18n/LanguageProvider";

type Locale = "en" | "zh-CN" | "ja";

const TRANSLATIONS: Record<string, Partial<Record<Locale, string>>> = {
  "Dashboard": { "zh-CN": "仪表盘", ja: "ダッシュボード" },
  "AIOS Dashboard": { "zh-CN": "AIOS 仪表盘", ja: "AIOS ダッシュボード" },
  "Settings": { "zh-CN": "设置", ja: "設定" },
  "Runtime Modules": { "zh-CN": "运行模块", ja: "ランタイムモジュール" },
  "System Status": { "zh-CN": "系统状态", ja: "システム状態" },
  "Active Provider": { "zh-CN": "当前 Provider", ja: "アクティブ Provider" },
  "ACTIVE PROVIDER": { "zh-CN": "当前 Provider", ja: "アクティブ PROVIDER" },
  "Online": { "zh-CN": "在线", ja: "オンライン" },
  "Offline": { "zh-CN": "离线", ja: "オフライン" },
  "Memory": { "zh-CN": "记忆", ja: "メモリ" },
  "Tasks": { "zh-CN": "任务", ja: "タスク" },
  "Projects": { "zh-CN": "项目", ja: "プロジェクト" },
  "Runtime": { "zh-CN": "运行时", ja: "ランタイム" },
  "Provider": { "zh-CN": "Provider", ja: "Provider" },
  "Planner": { "zh-CN": "规划器", ja: "プランナー" },
  "Brain": { "zh-CN": "智能核心", ja: "ブレイン" },
  "Storage": { "zh-CN": "存储", ja: "ストレージ" },
  "New Task": { "zh-CN": "新建任务", ja: "新しいタスク" },
  "Chat": { "zh-CN": "对话", ja: "チャット" },
  "Save Settings": { "zh-CN": "保存设置", ja: "設定を保存" },
  "Save Local Settings": { "zh-CN": "保存本机设置", ja: "ローカル設定を保存" },
  "Refresh": { "zh-CN": "刷新", ja: "更新" },
  "Refreshing…": { "zh-CN": "刷新中…", ja: "更新中…" },
  "Reading…": { "zh-CN": "读取中…", ja: "読み込み中…" },
  "Runtime unavailable.": { "zh-CN": "Runtime 不可用。", ja: "Runtime を利用できません。" },
  "Unknown": { "zh-CN": "未知", ja: "不明" },
  "Awaiting request": { "zh-CN": "等待请求", ja: "リクエスト待ち" },
  "Ready for goal": { "zh-CN": "等待目标", ja: "目標を待機中" },
  "Memory Records": { "zh-CN": "记忆记录", ja: "メモリ記録" },
  "Last Check": { "zh-CN": "最近检查", ja: "最終チェック" },
  "Version": { "zh-CN": "版本", ja: "バージョン" },
  "Status": { "zh-CN": "状态", ja: "ステータス" },
  "Memory records": { "zh-CN": "条记忆记录", ja: "件のメモリ記録" },
  "Current device": { "zh-CN": "当前设备", ja: "現在のデバイス" },
  "Save": { "zh-CN": "保存", ja: "保存" }
};

function translateText(text: string, locale: Locale): string {
  const trimmed = text.trim();
  if (!trimmed || locale === "en") return text;
  const exact = TRANSLATIONS[trimmed]?.[locale];
  if (exact) return text.replace(trimmed, exact);

  let next = text;
  for (const [source, values] of Object.entries(TRANSLATIONS)) {
    const target = values[locale];
    if (target && next.includes(source)) next = next.replaceAll(source, target);
  }
  return next;
}

export default function LegacyPageLocalizer() {
  const pathname = usePathname();
  const { locale } = useLanguage();

  useEffect(() => {
    if (pathname !== "/dashboard" && pathname !== "/settings") return;

    let frame = 0;
    const translate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const nodes: Text[] = [];
        let node: Node | null = walker.nextNode();
        while (node) {
          if (node.parentElement && !["SCRIPT", "STYLE", "NOSCRIPT"].includes(node.parentElement.tagName)) {
            nodes.push(node as Text);
          }
          node = walker.nextNode();
        }
        for (const textNode of nodes) {
          const translated = translateText(textNode.nodeValue ?? "", locale as Locale);
          if (translated !== textNode.nodeValue) textNode.nodeValue = translated;
        }
      });
    };

    translate();
    const observer = new MutationObserver(translate);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [locale, pathname]);

  return null;
}
