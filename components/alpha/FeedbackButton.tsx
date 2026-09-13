"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

import type {
  Locale,
} from "@/lib/i18n";

import {
  APP_VERSION,
} from "@/lib/config/app";

import {
  OPEN_FEEDBACK_EVENT,
} from "@/lib/ui/feedback-events";

type FeedbackCategory =
  | "great"
  | "good"
  | "neutral"
  | "bad"
  | "bug";

interface FeedbackOption {
  category: FeedbackCategory;
  label: string;
  emoji: string;
  rating: number;
}

type FeedbackCopy = {
  button: string;
  title: string;
  description: string;
  placeholder: string;
  submit: string;
  submitting: string;
  success: string;
  submitFailed: string;
  close: string;
};

const feedbackOptions: Record<
  Locale,
  FeedbackOption[]
> = {
  en: [
    {
      category: "great",
      label: "Excellent",
      emoji: "😍",
      rating: 5,
    },
    {
      category: "good",
      label: "Good",
      emoji: "🙂",
      rating: 4,
    },
    {
      category: "neutral",
      label: "Okay",
      emoji: "😐",
      rating: 3,
    },
    {
      category: "bad",
      label: "Needs work",
      emoji: "☹️",
      rating: 2,
    },
    {
      category: "bug",
      label: "Bug found",
      emoji: "🐛",
      rating: 1,
    },
  ],

  "zh-CN": [
    {
      category: "great",
      label: "很满意",
      emoji: "😍",
      rating: 5,
    },
    {
      category: "good",
      label: "满意",
      emoji: "🙂",
      rating: 4,
    },
    {
      category: "neutral",
      label: "一般",
      emoji: "😐",
      rating: 3,
    },
    {
      category: "bad",
      label: "不满意",
      emoji: "☹️",
      rating: 2,
    },
    {
      category: "bug",
      label: "发现 Bug",
      emoji: "🐛",
      rating: 1,
    },
  ],

  ja: [
    {
      category: "great",
      label: "とても満足",
      emoji: "😍",
      rating: 5,
    },
    {
      category: "good",
      label: "満足",
      emoji: "🙂",
      rating: 4,
    },
    {
      category: "neutral",
      label: "普通",
      emoji: "😐",
      rating: 3,
    },
    {
      category: "bad",
      label: "改善が必要",
      emoji: "☹️",
      rating: 2,
    },
    {
      category: "bug",
      label: "バグを発見",
      emoji: "🐛",
      rating: 1,
    },
  ],
};

const feedbackCopy: Record<
  Locale,
  FeedbackCopy
> = {
  en: {
    button: "💬 Feedback",
    title: "Help us improve AIOS",
    description:
      "Tell us how your experience feels.",
    placeholder:
      "Tell us what works well and what should be improved…",
    submit: "Submit feedback",
    submitting: "Submitting…",
    success:
      "✅ Thank you for your feedback.",
    submitFailed:
      "Failed to submit feedback.",
    close: "Close",
  },

  "zh-CN": {
    button: "💬 反馈",
    title: "帮助我们改进 AIOS",
    description:
      "请选择你的使用感受。",
    placeholder:
      "告诉我们哪里好用、哪里需要改进……",
    submit: "提交反馈",
    submitting: "正在提交……",
    success:
      "✅ 感谢你的反馈",
    submitFailed:
      "反馈提交失败。",
    close: "关闭",
  },

  ja: {
    button: "💬 フィードバック",
    title: "AIOS の改善にご協力ください",
    description:
      "ご利用いただいた感想を教えてください。",
    placeholder:
      "良かった点や改善してほしい点を教えてください…",
    submit: "フィードバックを送信",
    submitting: "送信中…",
    success:
      "✅ フィードバックありがとうございます。",
    submitFailed:
      "フィードバックの送信に失敗しました。",
    close: "閉じる",
  },
};

export default function FeedbackButton() {
  const {
    locale,
  } = useLanguage();

  const text =
    feedbackCopy[locale];

  const options =
    feedbackOptions[locale];

  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    selected,
    setSelected,
  ] =
    useState<FeedbackOption | null>(
      null
    );

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    success,
    setSuccess,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  useEffect(() => {
    function handleOpenFeedback() {
      setSuccess(false);
      setError("");
      setOpen(true);
    }

    window.addEventListener(
      OPEN_FEEDBACK_EVENT,
      handleOpenFeedback
    );

    return () => {
      window.removeEventListener(
        OPEN_FEEDBACK_EVENT,
        handleOpenFeedback
      );
    };
  }, []);

  function closePanel() {
    if (submitting) {
      return;
    }

    setOpen(false);
    setSelected(null);
    setMessage("");
    setError("");
    setSuccess(false);
  }

  async function submitFeedback() {
    if (
      !selected ||
      submitting
    ) {
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/feedback",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              "x-aios-locale":
                locale,
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              category:
                selected.category,
              rating:
                selected.rating,
              message,
              page:
                window.location.pathname,
              runtimeVersion:
                APP_VERSION,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.error ||
            text.submitFailed
        );
      }

      setSuccess(true);
      setMessage("");

      window.setTimeout(
        () => {
          closePanel();
        },
        1400
      );
    } catch (
      submitError
    ) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : text.submitFailed
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() =>
          setOpen(true)
        }
        aria-label={text.button}
        style={{
          position: "fixed",
          right: 22,
          bottom: 22,
          zIndex: 50,
          height: 48,
          padding: "0 18px",
          border:
            "1px solid #334155",
          borderRadius: 999,
          background: "#0f172a",
          color: "#ffffff",
          boxShadow:
            "0 12px 30px rgba(15, 23, 42, 0.24)",
          fontWeight: 800,
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        {text.button}
      </button>

      {open && (
        <div
          role="presentation"
          onClick={closePanel}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: 16,
            background:
              "rgba(15, 23, 42, 0.48)",
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-label={text.title}
            onClick={(event) =>
              event.stopPropagation()
            }
            style={{
              width: "100%",
              maxWidth: 520,
              padding: 20,
              borderRadius: 22,
              background: "#ffffff",
              boxShadow:
                "0 24px 70px rgba(15, 23, 42, 0.28)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                gap: 16,
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 20,
                  }}
                >
                  {text.title}
                </h2>

                <p
                  style={{
                    margin:
                      "6px 0 0",
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  {text.description}
                </p>
              </div>

              <button
                type="button"
                onClick={closePanel}
                aria-label={text.close}
                title={text.close}
                style={{
                  width: 38,
                  height: 38,
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: "50%",
                  background: "#ffffff",
                  fontSize: 20,
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(5, minmax(0, 1fr))",
                gap: 8,
                marginTop: 20,
              }}
            >
              {options.map(
                (option) => {
                  const active =
                    selected?.category ===
                    option.category;

                  return (
                    <button
                      key={
                        option.category
                      }
                      type="button"
                      onClick={() =>
                        setSelected(
                          option
                        )
                      }
                      aria-pressed={
                        active
                      }
                      style={{
                        padding:
                          "12px 5px",
                        border:
                          active
                            ? "2px solid #2563eb"
                            : "1px solid #e2e8f0",
                        borderRadius: 14,
                        background:
                          active
                            ? "#eff6ff"
                            : "#ffffff",
                        cursor:
                          "pointer",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 23,
                        }}
                      >
                        {option.emoji}
                      </div>

                      <div
                        style={{
                          marginTop: 6,
                          color:
                            "#334155",
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {option.label}
                      </div>
                    </button>
                  );
                }
              )}
            </div>

            <textarea
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value
                )
              }
              placeholder={
                text.placeholder
              }
              aria-label={
                text.placeholder
              }
              maxLength={1000}
              style={{
                width: "100%",
                minHeight: 110,
                marginTop: 18,
                padding: 14,
                boxSizing:
                  "border-box",
                resize: "vertical",
                border:
                  "1px solid #cbd5e1",
                borderRadius: 14,
                outline: "none",
                font: "inherit",
                lineHeight: 1.55,
              }}
            />

            {error && (
              <div
                role="alert"
                style={{
                  marginTop: 12,
                  color: "#b91c1c",
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                role="status"
                style={{
                  marginTop: 12,
                  color: "#15803d",
                  fontSize: 14,
                  fontWeight: 800,
                }}
              >
                {text.success}
              </div>
            )}

            <button
              type="button"
              disabled={
                !selected ||
                submitting ||
                success
              }
              onClick={
                submitFeedback
              }
              style={{
                width: "100%",
                height: 48,
                marginTop: 16,
                border: 0,
                borderRadius: 14,
                background:
                  selected &&
                  !submitting
                    ? "#0f172a"
                    : "#cbd5e1",
                color: "#ffffff",
                fontWeight: 800,
                fontSize: 15,
                cursor:
                  selected &&
                  !submitting
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              {submitting
                ? text.submitting
                : text.submit}
            </button>
          </section>
        </div>
      )}
    </>
  );
}
