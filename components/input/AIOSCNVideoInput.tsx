"use client";

import {
  useRef,
  useState,
} from "react";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

interface Props {
  disabled?: boolean;
  onResult: (
    content: string,
  ) => void;
}

interface VideoFramePayload {
  index: number;
  timestampSeconds: number;
  ratio: number;
  mimeType: string;
  imageBase64: string;
}

const MAX_VIDEO_BYTES =
  50 * 1024 * 1024;

const MAX_VIDEO_DURATION =
  120;

const SAMPLE_RATIOS = [
  0,
  0.25,
  0.5,
  0.75,
  0.95,
];

function localized(
  locale: string,
  zh: string,
  en: string,
  ja: string,
): string {
  if (
    locale === "ja"
  ) {
    return ja;
  }

  if (
    locale === "en"
  ) {
    return en;
  }

  return zh;
}

function waitForEvent(
  target: EventTarget,
  eventName: string,
): Promise<void> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const onEvent =
        () => {
          cleanup();
          resolve();
        };

      const onError =
        () => {
          cleanup();
          reject(
            new Error(
              "Video frame decoding failed.",
            ),
          );
        };

      const cleanup =
        () => {
          target.removeEventListener(
            eventName,
            onEvent,
          );

          target.removeEventListener(
            "error",
            onError,
          );
        };

      target.addEventListener(
        eventName,
        onEvent,
        {
          once: true,
        },
      );

      target.addEventListener(
        "error",
        onError,
        {
          once: true,
        },
      );
    },
  );
}

async function extractFrames(
  file: File,
): Promise<VideoFramePayload[]> {
  const objectUrl =
    URL.createObjectURL(
      file,
    );

  const video =
    document.createElement(
      "video",
    );

  video.preload =
    "metadata";

  video.muted =
    true;

  video.playsInline =
    true;

  video.src =
    objectUrl;

  try {
    await waitForEvent(
      video,
      "loadedmetadata",
    );

    const duration =
      video.duration;

    if (
      !Number.isFinite(
        duration,
      ) ||
      duration <= 0
    ) {
      throw new Error(
        "Video duration is unavailable.",
      );
    }

    if (
      duration >
      MAX_VIDEO_DURATION
    ) {
      throw new Error(
        "Video is longer than the 120 second CN analysis limit.",
      );
    }

    const width =
      Math.min(
        video.videoWidth ||
          1280,
        1280,
      );

    const height =
      Math.max(
        1,
        Math.round(
          width *
            (
              (video.videoHeight ||
                720) /
              (video.videoWidth ||
                1280)
            ),
        ),
      );

    const canvas =
      document.createElement(
        "canvas",
      );

    canvas.width =
      width;

    canvas.height =
      height;

    const context =
      canvas.getContext(
        "2d",
      );

    if (!context) {
      throw new Error(
        "Browser canvas is unavailable.",
      );
    }

    const frames:
      VideoFramePayload[] =
      [];

    for (
      let index = 0;
      index <
        SAMPLE_RATIOS.length;
      index += 1
    ) {
      const ratio =
        SAMPLE_RATIOS[index];

      const timestamp =
        Math.min(
          duration,
          duration *
            ratio,
        );

      video.currentTime =
        timestamp;

      await waitForEvent(
        video,
        "seeked",
      );

      context.drawImage(
        video,
        0,
        0,
        width,
        height,
      );

      const dataUrl =
        canvas.toDataURL(
          "image/jpeg",
          0.62,
        );

      const commaIndex =
        dataUrl.indexOf(
          ",",
        );

      if (
        commaIndex < 0
      ) {
        continue;
      }

      const base64 =
        dataUrl.slice(
          commaIndex + 1,
        );

      frames.push({
        index,
        timestampSeconds:
          timestamp,
        ratio,
        mimeType:
          "image/jpeg",
        imageBase64:
          base64,
      });
    }

    if (
      frames.length ===
      0
    ) {
      throw new Error(
        "No usable video frames were extracted.",
      );
    }

    return frames;
  } finally {
    video.pause();
    video.removeAttribute(
      "src",
    );
    video.load();
    URL.revokeObjectURL(
      objectUrl,
    );
  }
}

export default function AIOSCNVideoInput({
  disabled = false,
  onResult,
}: Props) {
  const {
    locale,
  } = useLanguage();

  const inputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  async function handleChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    event.target.value =
      "";

    if (!file) {
      return;
    }

    setError("");

    if (
      file.size >
      MAX_VIDEO_BYTES
    ) {
      setError(
        localized(
          locale,
          "视频超过 50 MB 限制。",
          "Video exceeds the 50 MB limit.",
          "動画が 50 MB の上限を超えています。",
        ),
      );
      return;
    }

    setLoading(true);

    try {
      const frames =
        await extractFrames(
          file,
        );

      const response =
        await fetch(
          "/api/cn/video/understanding",
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
                prompt:
                  locale ===
                  "zh-CN"
                    ? "请分析这个视频的主要内容、关键画面、时间顺序变化、可确认事实、画面文字、人物动作、产品或商业信息，以及不确定项。"
                    : locale ===
                        "ja"
                      ? "この動画の主な内容、重要な場面、時間順の変化、確認できる事実、画面内テキスト、人物の動き、商品または商業情報、不確実な点を分析してください。"
                      : "Analyze the main content, key frames, temporal changes, confirmed visual facts, visible text, people actions, product or commercial information, and uncertainties in this video.",
                frames,
                fileName:
                  file.name,
                durationSeconds:
                  undefined,
              }),
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        data.success !== true
      ) {
        throw new Error(
          data.error ??
            localized(
              locale,
              "视频分析失败。",
              "Video analysis failed.",
              "動画分析に失敗しました。",
            ),
        );
      }

      onResult(
        [
          `视频：${file.name}`,
          `关键帧：${data.analyzedFrameCount ?? frames.length}`,
          `模型：${data.model ?? "deepseek-flash"}`,
          "",
          data.content ??
            localized(
              locale,
              "没有返回可显示的视频分析结果。",
              "No displayable video analysis was returned.",
              "表示可能な動画分析結果が返されませんでした。",
            ),
        ].join("\n"),
      );
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : localized(
              locale,
              "视频分析失败。",
              "Video analysis failed.",
              "動画分析に失敗しました。",
            ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        marginTop: 8,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        onChange={
          handleChange
        }
        disabled={
          disabled ||
          loading
        }
        style={{
          display: "none",
        }}
      />

      <button
        type="button"
        disabled={
          disabled ||
          loading
        }
        onClick={() =>
          inputRef.current?.click()
        }
        style={{
          minHeight: 40,
          padding:
            "0 12px",
          border:
            "1px solid #d1d5db",
          borderRadius: 12,
          background:
            loading
              ? "#f8fafc"
              : "#ffffff",
          color: "#334155",
          fontSize: 12,
          fontWeight: 800,
          cursor:
            disabled ||
            loading
              ? "not-allowed"
              : "pointer",
        }}
      >
        {loading
          ? localized(
              locale,
              "正在分析视频...",
              "Analyzing video...",
              "動画を分析中...",
            )
          : localized(
              locale,
              "视频分析",
              "Video Analysis",
              "動画分析",
            )}
      </button>

      {error && (
        <div
          role="alert"
          style={{
            marginTop: 7,
            padding:
              "7px 9px",
            border:
              "1px solid #fecaca",
            borderRadius: 9,
            background:
              "#fef2f2",
            color:
              "#b91c1c",
            fontSize: 10,
            lineHeight: 1.45,
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
