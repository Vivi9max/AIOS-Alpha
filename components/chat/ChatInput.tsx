"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

import type {
  Locale,
} from "@/lib/i18n";

interface Props {
  loading: boolean;
  onSend: (text: string) => void;
}

const inputCopy: Record<
  Locale,
  {
    placeholder: string;
    ariaLabel: string;
    send: string;
    sending: string;
  }
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

export default function ChatInput({
  loading,
  onSend,
}: Props) {
  const {
    locale,
  } = useLanguage();

  const copy =
    inputCopy[locale];

  const [value, setValue] =
    useState("");

  const [
    isTouchDevice,
    setIsTouchDevice,
  ] = useState(false);

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const detectInputMode = () => {
      const hasCoarsePointer =
        window.matchMedia(
          "(pointer: coarse)"
        ).matches;

      const hasTouch =
        navigator.maxTouchPoints > 0;

      setIsTouchDevice(
        hasCoarsePointer ||
          hasTouch
      );
    };

    detectInputMode();

    window.addEventListener(
      "resize",
      detectInputMode
    );

    return () => {
      window.removeEventListener(
        "resize",
        detectInputMode
      );
    };
  }, []);

  useEffect(() => {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height =
      "auto";

    textarea.style.height =
      `${Math.min(
        textarea.scrollHeight,
        150
      )}px`;
  }, [value]);

  function resetTextareaHeight() {
    const textarea =
      textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height =
      "48px";
  }

  function send() {
    const text =
      value.trim();

    if (!text || loading) {
      return;
    }

    onSend(text);
    setValue("");

    window.requestAnimationFrame(
      resetTextareaHeight
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems:
          "flex-end",
        gap: 10,
        width: "100%",
      }}
    >
      <textarea
        ref={textareaRef}
        rows={1}
        value={value}
        disabled={loading}
        enterKeyHint={
          isTouchDevice
            ? "enter"
            : "send"
        }
        placeholder={
          copy.placeholder
        }
        aria-label={
          copy.ariaLabel
        }
        onChange={(event) =>
          setValue(
            event.target.value
          )
        }
        onKeyDown={(event) => {
          if (isTouchDevice) {
            return;
          }

          if (
            event.key === "Enter" &&
            !event.shiftKey
          ) {
            event.preventDefault();
            send();
          }
        }}
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: 48,
          maxHeight: 150,
          boxSizing:
            "border-box",
          padding:
            "13px 15px",
          border:
            "1px solid #d1d5db",
          borderRadius: 14,
          background: loading
            ? "#f3f4f6"
            : "#ffffff",
          color: "#111827",
          fontSize: 16,
          lineHeight: 1.45,
          resize: "none",
          outline: "none",
          overflowY: "auto",
          WebkitAppearance:
            "none",
        }}
      />

      <button
        type="button"
        disabled={
          loading ||
          !value.trim()
        }
        onClick={send}
        aria-label={
          loading
            ? copy.sending
            : copy.send
        }
        title={
          loading
            ? copy.sending
            : copy.send
        }
        style={{
          width: 48,
          height: 48,
          flexShrink: 0,
          display: "flex",
          alignItems:
            "center",
          justifyContent:
            "center",
          padding: 0,
          border: 0,
          borderRadius: 14,
          background:
            loading ||
            !value.trim()
              ? "#d1d5db"
              : "#111827",
          color: "#ffffff",
          fontSize: 21,
          fontWeight: 800,
          cursor:
            loading ||
            !value.trim()
              ? "not-allowed"
              : "pointer",
          WebkitTapHighlightColor:
            "transparent",
        }}
      >
        {loading ? "…" : "↑"}
      </button>
    </div>
  );
}
