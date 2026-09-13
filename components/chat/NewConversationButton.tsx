"use client";

import {
  useState,
} from "react";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

import {
  chatNewConversationCopy,
} from "@/lib/i18n/chat-new-conversation";

export default function NewConversationButton() {
  const { locale } =
    useLanguage();

  const text =
    chatNewConversationCopy[locale];

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
