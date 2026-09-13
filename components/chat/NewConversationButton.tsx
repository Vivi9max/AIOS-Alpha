"use client";

import {
  useState,
} from "react";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

import type {
  Locale,
} from "@/lib/i18n";

type Copy = {
  confirmTitle: string;
  confirmBody: string;
  confirmMemory: string;
  cancel: string;
  confirm: string;
  creating: string;
  newConversation: string;
  resetFailed: string;
  createFailed: string;
};

const copy: Record<
  Locale,
  Copy
> = {
  en: {
    confirmTitle:
      "Start a new conversation?",
    confirmBody:
      "The current conversation history will be cleared.",
    confirmMemory:
      "Memory Profile and Tasks will not be affected.",
    cancel: "Cancel",
    confirm: "Continue",
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
    cancel: "取消",
    confirm: "继续",
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
    cancel: "キャンセル",
    confirm: "続行",
    creating: "作成中…",
    newConversation:
      "＋ 新しい会話",
    resetFailed:
      "会話のリセットに失敗しました。",
    createFailed:
      "新しい会話を作成できませんでした。",
  },
};

export default function NewConversationButton() {
  const { locale } =
    useLanguage();

  const text =
    copy[locale];

  const [clearing, setClearing] =
    useState(false);

  const [error, setError] =
    useState("");

  async function handleNewConversation() {
    if (clearing) {
      return;
    }

    const confirmed =
      window.confirm(
        [
          text.confirmTitle,
          "",
          text.confirmBody,
          text.confirmMemory,
        ].join("\n")
      );

    if (!confirmed) {
      return;
    }

    setClearing(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/memory",
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          text.resetFailed
        );
      }

      window.location.reload();
    } catch (clearError) {
      setError(
        clearError instanceof Error
          ? clearError.message
          : text.createFailed
      );

      setClearing(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection:
          "column",
        alignItems:
          "flex-end",
        gap: 7,
        marginBottom: 12,
      }}
    >
      <button
        type="button"
        disabled={clearing}
        onClick={
          handleNewConversation
        }
        style={{
          minHeight: 42,
          padding: "10px 15px",
          border:
            "1px solid #d1d5db",
          borderRadius: 12,
          background:
            clearing
              ? "#f3f4f6"
              : "#ffffff",
          color: "#111827",
          fontSize: 14,
          fontWeight: 800,
          cursor:
            clearing
              ? "not-allowed"
              : "pointer",
          opacity:
            clearing
              ? 0.65
              : 1,
          boxShadow:
            "0 5px 16px rgba(15, 23, 42, 0.05)",
        }}
      >
        {clearing
          ? text.creating
          : text.newConversation}
      </button>

      {error && (
        <span
          role="alert"
          style={{
            maxWidth: 300,
            color: "#b91c1c",
            fontSize: 12,
            textAlign: "right",
            overflowWrap:
              "anywhere",
          }}
        >
          {error}
        </span>
      )}
    </div>
  );
}
