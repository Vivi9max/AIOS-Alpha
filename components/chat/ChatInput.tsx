"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

import {
  chatInputCopy,
} from "@/lib/i18n/chat-input";

type MediaLanguage =
  | "zh-CN"
  | "en-US"
  | "ja-JP";

type MediaAspectRatio =
  | "9:16"
  | "16:9"
  | "1:1"
  | "4:5"
  | "4:3"
  | "3:2";

type MediaDuration =
  | 30
  | 60
  | 90
  | 120;

interface Props {
  loading: boolean;
  onSend: (text: string) => void;
}

const LANGUAGE_OPTIONS: Array<{
  value: MediaLanguage;
  label: string;
}> = [
  {
    value: "zh-CN",
    label: "\u4e2d\u6587",
  },
  {
    value: "en-US",
    label: "English",
  },
  {
    value: "ja-JP",
    label: "\u65e5\u672c\u8a9e",
  },
];

const DURATION_OPTIONS: Array<{
  value: MediaDuration;
  label: string;
}> = [
  {
    value: 30,
    label: "30\u79d2",
  },
  {
    value: 60,
    label: "1\u5206\u949f",
  },
  {
    value: 90,
    label: "1\u5206\u002030\u79d2",
  },
  {
    value: 120,
    label: "2\u5206\u949f",
  },
];

const ASPECT_OPTIONS: Array<{
  value: MediaAspectRatio;
  label: string;
}> = [
  {
    value: "9:16",
    label: "9:16",
  },
  {
    value: "16:9",
    label: "16:9",
  },
  {
    value: "1:1",
    label: "1:1",
  },
  {
    value: "4:5",
    label: "4:5",
  },
  {
    value: "4:3",
    label: "4:3",
  },
  {
    value: "3:2",
    label: "3:2",
  },
];

export default function ChatInput({
  loading,
  onSend,
}: Props) {
  const {
    locale,
  } = useLanguage();

  const copy =
    chatInputCopy[locale];

  const [
    value,
    setValue,
  ] = useState("");

  const [
    isTouchDevice,
    setIsTouchDevice,
  ] = useState(false);

  const [
    mediaMode,
    setMediaMode,
  ] = useState(false);

  const [
    mediaLanguage,
    setMediaLanguage,
  ] =
    useState<MediaLanguage>(
      locale === "ja"
        ? "ja-JP"
        : locale === "en"
          ? "en-US"
          : "zh-CN",
    );

  const [
    mediaDuration,
    setMediaDuration,
  ] =
    useState<MediaDuration>(30);

  const [
    mediaAspectRatio,
    setMediaAspectRatio,
  ] =
    useState<MediaAspectRatio>(
      "9:16",
    );

  const [
    mediaLoading,
    setMediaLoading,
  ] = useState(false);

  const [
    mediaStatus,
    setMediaStatus,
  ] = useState("");

  const textareaRef =
    useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const detectInputMode =
      () => {
        const hasCoarsePointer =
          window.matchMedia(
            "(pointer: coarse)",
          ).matches;

        const hasTouch =
          navigator.maxTouchPoints > 0;

        setIsTouchDevice(
          hasCoarsePointer ||
            hasTouch,
        );
      };

    detectInputMode();

    window.addEventListener(
      "resize",
      detectInputMode,
    );

    return () => {
      window.removeEventListener(
        "resize",
        detectInputMode,
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
        150,
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

    if (
      !text ||
      loading ||
      mediaLoading
    ) {
      return;
    }

    onSend(text);
    setValue("");

    window.requestAnimationFrame(
      resetTextareaHeight,
    );
  }

  async function generateVideo() {
    const prompt =
      value.trim();

    if (
      !prompt ||
      loading ||
      mediaLoading
    ) {
      return;
    }

    setMediaLoading(true);
    setMediaStatus("");

    try {
      const response =
        await fetch(
          "/api/media",
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
            body:
              JSON.stringify({
                operation:
                  "render",
                prompt,
                language:
                  mediaLanguage,
                durationSeconds:
                  mediaDuration,
                aspectRatio:
                  mediaAspectRatio,
                includeSubtitles:
                  true,
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.content ||
            data.error ||
            "Media generation failed.",
        );
      }

      setMediaStatus(
        locale === "zh-CN"
          ? "\u89c6\u9891\u751f\u6210\u5b8c\u6210"
          : locale === "ja"
            ? "\u52d5\u753b\u751f\u6210\u5b8c\u4e86"
            : "Video generation completed.",
      );

      setValue("");

      window.requestAnimationFrame(
        resetTextareaHeight,
      );

      const outputPath =
        typeof data.outputPath ===
        "string"
          ? data.outputPath
          : "";

      if (outputPath) {
        setMediaStatus(
          locale === "zh-CN"
            ? `\u89c6\u9891\u751f\u6210\u5b8c\u6210\uff1a${outputPath}`
            : locale === "ja"
              ? `\u52d5\u753b\u751f\u6210\u5b8c\u4e86\uff1a${outputPath}`
              : `Video generation completed: ${outputPath}`,
        );
      }
    } catch (error) {
      setMediaStatus(
        error instanceof Error
          ? error.message
          : locale === "zh-CN"
            ? "\u89c6\u9891\u751f\u6210\u5931\u8d25"
            : locale === "ja"
              ? "\u52d5\u753b\u751f\u6210\u306b\u5931\u6557\u3057\u307e\u3057\u305f"
              : "Video generation failed.",
      );
    } finally {
      setMediaLoading(false);
    }
  }

  const disabled =
    loading ||
    mediaLoading ||
    !value.trim();

  return (
    <div
      style={{
        width: "100%",
      }}
    >
      {mediaMode && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 8,
            padding: "9px 10px",
            border:
              "1px solid #e5e7eb",
            borderRadius: 12,
            background: "#f8fafc",
          }}
        >
          <select
            value={mediaLanguage}
            onChange={(event) =>
              setMediaLanguage(
                event.target
                  .value as MediaLanguage,
              )
            }
            disabled={
              loading ||
              mediaLoading
            }
            aria-label="Video language"
            style={{
              height: 34,
              border:
                "1px solid #d1d5db",
              borderRadius: 8,
              padding:
                "0 8px",
              background:
                "#ffffff",
              fontSize: 12,
            }}
          >
            {LANGUAGE_OPTIONS.map(
              (item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ),
            )}
          </select>

          <select
            value={mediaDuration}
            onChange={(event) =>
              setMediaDuration(
                Number(
                  event.target.value,
                ) as MediaDuration,
              )
            }
            disabled={
              loading ||
              mediaLoading
            }
            aria-label="Video duration"
            style={{
              height: 34,
              border:
                "1px solid #d1d5db",
              borderRadius: 8,
              padding:
                "0 8px",
              background:
                "#ffffff",
              fontSize: 12,
            }}
          >
            {DURATION_OPTIONS.map(
              (item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ),
            )}
          </select>

          <select
            value={
              mediaAspectRatio
            }
            onChange={(event) =>
              setMediaAspectRatio(
                event.target
                  .value as MediaAspectRatio,
              )
            }
            disabled={
              loading ||
              mediaLoading
            }
            aria-label="Video aspect ratio"
            style={{
              height: 34,
              border:
                "1px solid #d1d5db",
              borderRadius: 8,
              padding:
                "0 8px",
              background:
                "#ffffff",
              fontSize: 12,
            }}
          >
            {ASPECT_OPTIONS.map(
              (item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.label}
                </option>
              ),
            )}
          </select>
        </div>
      )}

      {mediaStatus && (
        <div
          style={{
            marginBottom: 8,
            padding:
              "8px 10px",
            borderRadius: 9,
            background:
              mediaStatus.includes(
                "\u5931\u8d25",
              ) ||
              mediaStatus.includes(
                "failed",
              )
                ? "#fef2f2"
                : "#f8fafc",
            color:
              "#475569",
            fontSize: 12,
            lineHeight: 1.45,
            wordBreak:
              "break-word",
          }}
        >
          {mediaStatus}
        </div>
      )}

      <div
        style={{
          display: "flex",
          alignItems:
            "flex-end",
          gap: 8,
          width: "100%",
        }}
      >
        <button
          type="button"
          disabled={
            loading ||
            mediaLoading
          }
          onClick={() => {
            setMediaMode(
              (current) =>
                !current,
            );
            setMediaStatus("");
          }}
          aria-label="Video mode"
          title="One-click video"
          style={{
            width: 44,
            height: 48,
            flexShrink: 0,
            border:
              mediaMode
                ? "1px solid #111827"
                : "1px solid #d1d5db",
            borderRadius: 14,
            background:
              mediaMode
                ? "#111827"
                : "#ffffff",
            color:
              mediaMode
                ? "#ffffff"
                : "#475569",
            fontSize: 18,
            cursor:
              loading ||
              mediaLoading
                ? "not-allowed"
                : "pointer",
          }}
        >
          🎬
        </button>

        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          disabled={
            loading ||
            mediaLoading
          }
          enterKeyHint={
            isTouchDevice
              ? "enter"
              : "send"
          }
          placeholder={
            mediaMode
              ? locale === "zh-CN"
                ? "\u8f93\u5165\u89c6\u9891\u9700\u6c42\u2026\u2026"
                : locale === "ja"
                  ? "\u52d5\u753b\u306e\u5185\u5bb9\u3092\u5165\u529b\u2026"
                  : "Describe the video you want…"
              : copy.placeholder
          }
          aria-label={
            copy.ariaLabel
          }
          onChange={(event) =>
            setValue(
              event.target.value,
            )
          }
          onKeyDown={(event) => {
            if (
              isTouchDevice
            ) {
              return;
            }

            if (
              event.key ===
                "Enter" &&
              !event.shiftKey
            ) {
              event.preventDefault();

              if (
                mediaMode
              ) {
                void generateVideo();
              } else {
                send();
              }
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
            background:
              loading ||
              mediaLoading
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
          disabled={disabled}
          onClick={
            mediaMode
              ? () =>
                  void generateVideo()
              : send
          }
          aria-label={
            mediaLoading
              ? "Generating video"
              : mediaMode
                ? "Generate video"
                : loading
                  ? copy.sending
                  : copy.send
          }
          title={
            mediaMode
              ? "Generate video"
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
              disabled
                ? "#d1d5db"
                : "#111827",
            color:
              "#ffffff",
            fontSize: 19,
            fontWeight: 800,
            cursor:
              disabled
                ? "not-allowed"
                : "pointer",
            WebkitTapHighlightColor:
              "transparent",
          }}
        >
          {mediaLoading
            ? "…"
            : mediaMode
              ? "▶"
              : "↑"}
        </button>
      </div>
    </div>
  );
}
