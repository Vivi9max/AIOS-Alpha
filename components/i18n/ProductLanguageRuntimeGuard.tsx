"use client";

import { useEffect } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";

/**
 * C143.22.2
 *
 * AIOS Product Language Runtime Integrity Guard
 *
 * Purpose:
 * - Detect known product-language contamination after the UI renders.
 * - Verify that EN / zh-CN / JA remain within the canonical product wording.
 * - Provide a runtime safety net after ProductLanguageNormalizer.
 *
 * This is a diagnostic guard.
 *
 * It does NOT:
 * - translate text
 * - modify text
 * - inspect user-generated content
 * - inspect AI-generated content
 * - inspect editable fields
 *
 * The guard only reports known product-language regressions.
 */

const EXCLUDED_TAGS = new Set([
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "OPTION",
  "BUTTON",
  "CODE",
  "PRE",
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
]);

const EXCLUDED_SELECTORS = [
  "[contenteditable='true']",
  "[data-user-content]",
  "[data-generated-content]",
  "[data-ai-content]",
  "[data-runtime-content]",
];

const FORBIDDEN_BY_LOCALE: Record<
  "en" | "zh-CN" | "ja",
  string[]
> = {
  en: [
    "运行在线",
    "运行离线",
    "服务提供方",
    "当前 Provider",
    "ランタイム状態",
    "タスク标题",
  ],

  "zh-CN": [
    "Runtime Online",
    "Runtime Offline",
    "ランタイム状態",
    "現在の Provider",
    "タスクタイトル",
  ],

  ja: [
    "运行在线",
    "运行离线",
    "运行状态",
    "服务提供方",
    "当前 Provider",
    "タスク标题",
  ],
};

function shouldSkip(
  node: Text,
): boolean {
  const parent = node.parentElement;

  if (!parent) {
    return true;
  }

  if (EXCLUDED_TAGS.has(parent.tagName)) {
    return true;
  }

  if (
    parent.closest(
      EXCLUDED_SELECTORS.join(","),
    )
  ) {
    return true;
  }

  return false;
}

function collectVisibleText(): string[] {
  if (
    typeof document === "undefined" ||
    !document.body
  ) {
    return [];
  }

  const walker =
    document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
    );

  const values: string[] = [];

  let current =
    walker.nextNode();

  while (current) {
    const node = current as Text;

    if (!shouldSkip(node)) {
      const value =
        node.nodeValue?.trim();

      if (value) {
        values.push(value);
      }
    }

    current =
      walker.nextNode();
  }

  return values;
}

function findForbiddenPhrases(
  locale: "en" | "zh-CN" | "ja",
): string[] {
  const visibleText =
    collectVisibleText();

  const forbidden =
    FORBIDDEN_BY_LOCALE[locale];

  return forbidden.filter(
    (phrase) =>
      visibleText.includes(phrase),
  );
}

export default function ProductLanguageRuntimeGuard() {
  const { locale } = useLanguage();

  useEffect(() => {
    if (
      typeof document === "undefined" ||
      !document.body
    ) {
      return;
    }

    let scheduled = false;

    const verify = () => {
      scheduled = false;

      const violations =
        findForbiddenPhrases(locale);

      if (
        violations.length === 0
      ) {
        if (
          process.env.NODE_ENV !==
          "production"
        ) {
          console.info(
            `[AIOS Locale Guard] PASS: ${locale}`,
          );
        }

        return;
      }

      console.warn(
        `[AIOS Locale Guard] ${locale} product-language contamination detected:`,
        violations,
      );
    };

    const scheduleVerify = () => {
      if (scheduled) {
        return;
      }

      scheduled = true;

      window.requestAnimationFrame(
        verify,
      );
    };

    scheduleVerify();

    const observer =
      new MutationObserver(() => {
        scheduleVerify();
      });

    observer.observe(
      document.body,
      {
        childList: true,
        characterData: true,
        subtree: true,
      },
    );

    return () => {
      observer.disconnect();
    };
  }, [locale]);

  return null;
}
