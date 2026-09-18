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

type MediaEngine =
  | "composer"
  | "sora";

interface Props {
  loading: boolean;
  onSend: (text: string) => void;
}

const LANGUAGE_OPTIONS = [
  {
    value: "zh-CN" as const,
    label: "\u4e2d\u6587",
  },
  {
    value: "en-US" as const,
    label: "English",
  },
  {
    value: "ja-JP" as const,
    label: "\u65e5\u672c\u8a9e",
  },
];

const DURATION_OPTIONS = [
  {
    value: 30 as const,
    label: "30\u79d2",
  },
  {
    value: 60 as const,
    label: "1\u5206\u949f",
  },
  {
    value: 90 as const,
    label: "1\u5206 30\u79d2",
  },
  {
    value: 120 as const,
    label: "2\u5206\u949f",
  },
];

const ASPECT_OPTIONS = [
  "9:16",
  "16:9",
  "1:1",
  "4:5",
  "4:3",
  "3:2",
] as MediaAspectRatio[];

function localized(
  locale: string,
  zh: string,
  en: string,
  ja: string,
) {
  if (locale === "ja") {
    return ja;
  }

  if (locale === "en") {
    return en;
  }

  return zh;
}

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
    mediaEngine,
    setMediaEngine,
  ] =
    useState<MediaEngine>(
      "composer",
    );

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
    useState<MediaDuration>(
      30,
    );

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

  const [
    mediaVideoUrl,
    setMediaVideoUrl,
  ] = useState("");

  const textareaRef =
    useRef<HTMLTextAreaElement>(
      null,
    );

  useEffect(() => {
    const detectInputMode =
      () => {
        const coarse =
          window.matchMedia(
            "(pointer: coarse)",
          ).matches;

        const touch =
          navigator.maxTouchPoints >
          0;

        setIsTouchDevice(
          coarse || touch,
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

  async function pollSoraVideo(
    videoId: string,
  ) {
    const maxAttempts =
      150;

    for (
      let attempt = 0;
      attempt <
      maxAttempts;
      attempt += 1
    ) {
      const response =
        await fetch(
          `/api/media?videoId=${encodeURIComponent(
            videoId,
          )}`,
          {
            method: "GET",
            credentials:
              "same-origin",
            cache: "no-store",
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
            "Unable to retrieve video status.",
        );
      }

      const progress =
        Number(
          data.providerProgress ||
            data.job?.progress ||
            0,
        );

      setMediaStatus(
        localized(
          locale,
          `AI 视频生成中… ${progress}%`,
          `AI video generating… ${progress}%`,
          `AI\u52d5\u753b\u751f\u6210\u4e2d\u2026 ${progress}%`,
        ),
      );

      if (
        data.providerStatus ===
          "completed" &&
        typeof data.contentUrl ===
          "string"
      ) {
        setMediaVideoUrl(
          data.contentUrl,
        );

        setMediaStatus(
          localized(
            locale,
            "Sora 视频生成完成。",
            "Sora video generation completed.",
            "Sora\u52d5\u753b\u751f\u6210\u5b8c\u4e86\u3002",
          ),
        );

        return;
      }

      if (
        data.providerStatus ===
        "failed"
      ) {
        throw new Error(
          data.content ||
            data.job?.error?.message ||
            "Sora video generation failed.",
        );
      }

      await new Promise(
        (resolve) =>
          window.setTimeout(
            resolve,
            3000,
          ),
      );
    }

    throw new Error(
      localized(
        locale,
        "视频生成等待时间过长，请稍后查看。",
        "Video generation is taking longer than expected.",
        "\u52d5\u753b\u751f\u6210\u306b\u6642\u9593\u304c\u304b\u304b\u3063\u3066\u3044\u307e\u3059\u3002",
      ),
    );
  }

  async function generateSoraVideo() {
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
    setMediaVideoUrl("");

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
                  "video-create",

                prompt,

                language:
                  mediaLanguage,

                durationSeconds:
                  mediaDuration,

                aspectRatio:
                  mediaAspectRatio,

                videoModel:
                  "sora-2",

                videoSeconds:
                  "12",
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
            "Sora video generation failed.",
        );
      }

      const videoId =
        data.providerJobId;

      if (
        typeof videoId !==
        "string"
      ) {
        throw new Error(
          "Sora did not return a video job ID.",
        );
      }

      setMediaStatus(
        localized(
          locale,
          "已提交真实 Text-to-Video 任务，正在生成…",
          "Real Text-to-Video job submitted. Generating…",
          "\u5b9f\u969b\u306eText-to-Video\u30bf\u30b9\u30af\u3092\u9001\u4fe1\u3057\u307e\u3057\u305f\u3002\u751f\u6210\u4e2d\u2026",
        ),
      );

      await pollSoraVideo(
        videoId,
      );

      setValue("");

      window.requestAnimationFrame(
        resetTextareaHeight,
      );
    } catch (error) {
      setMediaStatus(
        error instanceof Error
          ? error.message
          : localized(
              locale,
              "视频生成失败。",
              "Video generation failed.",
              "\u52d5\u753b\u751f\u6210\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002",
            ),
      );
    } finally {
      setMediaLoading(
        false,
      );
    }
  }

  async function generateComposerVideo() {
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
    setMediaVideoUrl("");

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
        localized(
          locale,
          "AIOS 成片完成。",
          "AIOS video composition completed.",
          "AIOS\u52d5\u753b\u306e\u5408\u6210\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002",
        ),
      );

      if (
        typeof data.outputPath ===
        "string"
      ) {
        setMediaStatus(
          localized(
            locale,
            "AIOS 成片完成。",
            "AIOS video composition completed.",
            "AIOS\u52d5\u753b\u306e\u5408\u6210\u304c\u5b8c\u4e86\u3057\u307e\u3057\u305f\u3002",
          ),
        );
      }

      setValue("");

      window.requestAnimationFrame(
        resetTextareaHeight,
      );
    } catch (error) {
      setMediaStatus(
        error instanceof Error
          ? error.message
          : localized(
              locale,
              "视频生成失败。",
              "Video generation failed.",
              "\u52d5\u753b\u751f\u6210\u306b\u5931\u6557\u3057\u307e\u3057\u305f\u3002",
            ),
      );
    } finally {
      setMediaLoading(
        false,
      );
    }
  }

  function generateVideo() {
    if (
      mediaEngine ===
      "sora"
    ) {
      void generateSoraVideo();
      return;
    }

    void generateComposerVideo();
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
            padding:
              "9px 10px",
            border:
              "1px solid #e5e7eb",
            borderRadius: 12,
            background:
              "#f8fafc",
          }}
        >
          <select
            value={
              mediaEngine
            }
            onChange={(
              event,
            ) => {
              setMediaEngine(
                event.target
                  .value as MediaEngine,
              );

              setMediaStatus(
                "",
              );

              setMediaVideoUrl(
                "",
              );
            }}
            disabled={
              loading ||
              mediaLoading
            }
            aria-label="Video engine"
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
              fontWeight: 600,
            }}
          >
            <option value="composer">
              {localized(
                locale,
                "AIOS 成片",
                "AIOS Composer",
                "AIOS\u5408\u6210",
              )}
            </option>

            <option value="sora">
              Sora TTV
            </option>
          </select>

          <select
            value={
              mediaLanguage
            }
            onChange={(
              event,
            ) =>
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
              (
                item,
              ) => (
                <option
                  key={
                    item.value
                  }
                  value={
                    item.value
                  }
                >
                  {
                    item.label
                  }
                </option>
              ),
            )}
          </select>

          <select
            value={
              mediaDuration
            }
            onChange={(
              event,
            ) =>
              setMediaDuration(
                Number(
                  event.target
                    .value,
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
              (
                item,
              ) => (
                <option
                  key={
                    item.value
                  }
                  value={
                    item.value
                  }
                >
                  {
                    item.label
                  }
                </option>
              ),
            )}
          </select>

          <select
            value={
              mediaAspectRatio
            }
            onChange={(
              event,
            ) =>
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
              (
                item,
              ) => (
                <option
                  key={item}
                  value={item}
                >
                  {item}
                </option>
              ),
            )}
          </select>
        </div>
      )}

      {mediaMode &&
        mediaEngine ===
          "sora" && (
          <div
            style={{
              marginBottom: 8,
              padding:
                "7px 10px",
              borderRadius: 9,
              background:
                "#f8fafc",
              color:
                "#64748b",
              fontSize: 11,
              lineHeight: 1.45,
            }}
          >
            {localized(
              locale,
              "Sora 当前直接生成单段 12 秒 TTV；30/60/90/120 秒由 AIOS 长视频合成链路负责。",
              "Sora currently generates a direct 12-second TTV clip; 30/60/90/120-second videos use the AIOS long-form composition pipeline.",
              "Sora\u306f\u73fe\u5728\u76f4\u63a512\u79d2\u306eTTV\u30af\u30ea\u30c3\u30d7\u3092\u751f\u6210\u3057\u300130/60/90/120\u79d2\u306fAIOS\u9577\u5c3a\u5408\u6210\u30d1\u30a4\u30d7\u30e9\u30a4\u30f3\u3092\u4f7f\u7528\u3057\u307e\u3059\u3002",
            )}
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
              "#f8fafc",
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

      {mediaVideoUrl && (
        <div
          style={{
            marginBottom: 8,
            borderRadius: 12,
            overflow: "hidden",
            background:
              "#000000",
          }}
        >
          <video
            src={
              mediaVideoUrl
            }
            controls
            playsInline
            style={{
              display:
                "block",
              width:
                "100%",
              maxHeight:
                420,
              background:
                "#000000",
            }}
          />

          <a
            href={
              mediaVideoUrl
            }
            download
            target="_blank"
            rel="noreferrer"
            style={{
              display:
                "inline-block",
              margin:
                "8px 10px 10px",
              color:
                "#ffffff",
              fontSize: 12,
              textDecoration:
                "none",
            }}
          >
            {localized(
              locale,
              "打开 / 保存视频",
              "Open / save video",
              "\u52d5\u753b\u3092\u958b\u304f / \u4fdd\u5b58",
            )}
          </a>
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
              (
                current,
              ) =>
                !current,
            );

            setMediaStatus(
              "",
            );

            setMediaVideoUrl(
              "",
            );
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
          ref={
            textareaRef
          }
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
              ? localized(
                  locale,
                  "输入视频需求……",
                  "Describe the video you want…",
                  "\u52d5\u753b\u306e\u5185\u5bb9\u3092\u5165\u529b\u2026",
                )
              : copy.placeholder
          }
          aria-label={
            copy.ariaLabel
          }
          onChange={(
            event,
          ) =>
            setValue(
              event.target
                .value,
            )
          }
          onKeyDown={(
            event,
          ) => {
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
                generateVideo();
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
            color:
              "#111827",
            fontSize: 16,
            lineHeight: 1.45,
            resize: "none",
            outline: "none",
            overflowY:
              "auto",
            WebkitAppearance:
              "none",
          }}
        />

        <button
          type="button"
          disabled={
            disabled
          }
          onClick={
            mediaMode
              ? generateVideo
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
