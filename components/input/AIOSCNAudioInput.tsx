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

const MAX_AUDIO_BYTES =
  25 * 1024 * 1024;

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

export default function AIOSCNAudioInput({
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
    mode,
    setMode,
  ] = useState<
    "summary" | "transcription"
  >("summary");

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
      MAX_AUDIO_BYTES
    ) {
      setError(
        localized(
          locale,
          "音频超过 25 MB 限制。",
          "Audio exceeds the 25 MB limit.",
          "音声が 25 MB の上限を超えています。",
        ),
      );
      return;
    }

    setLoading(true);

    try {
      const formData =
        new FormData();

      formData.append(
        "file",
        file,
        file.name,
      );

      formData.append(
        "mode",
        mode,
      );

      const response =
        await fetch(
          "/api/cn/audio/transcription",
          {
            method:
              "POST",
            headers: {
              "x-aios-locale":
                locale,
            },
            credentials:
              "same-origin",
            body:
              formData,
          },
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        data.success !==
          true
      ) {
        if (
          data.code ===
          "AIOS_CN_AUDIO_TRANSCRIPTION_UNAVAILABLE"
        ) {
          throw new Error(
            localized(
              locale,
              "当前 AIOS 音频转写能力暂不可用。",
              "AIOS audio transcription is currently unavailable.",
              "現在 AIOS 音声文字起こしは利用できません。",
            ),
          );
        }

        throw new Error(
          data.error ??
            localized(
              locale,
              "音频转写失败。",
              "Audio transcription failed.",
              "音声の文字起こしに失敗しました。",
            ),
        );
      }

      const title =
        mode ===
        "summary"
          ? localized(
              locale,
              "音频关键信息",
              "Audio key information",
              "音声の要点",
            )
          : localized(
              locale,
              "音频完整转写",
              "Full audio transcription",
              "音声の完全な文字起こし",
            );

      onResult(
        [
          `音频：${file.name}`,
          title,
          "",
          data.content ??
            localized(
              locale,
              "没有返回可显示的音频内容。",
              "No displayable audio content was returned.",
              "表示可能な音声内容が返されませんでした。",
            ),
        ].join(
          "\n",
        ),
      );
    } catch (
      caughtError
    ) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : localized(
              locale,
              "音频转写失败。",
              "Audio transcription failed.",
              "音声の文字起こしに失敗しました。",
            ),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display:
          "flex",
        flexWrap:
          "wrap",
        alignItems:
          "center",
        gap: 6,
        marginTop: 8,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        onChange={
          handleChange
        }
        disabled={
          disabled ||
          loading
        }
        style={{
          display:
            "none",
        }}
      />

      <select
        value={
          mode
        }
        onChange={(
          event,
        ) =>
          setMode(
            event.target
              .value as
              | "summary"
              | "transcription",
          )
        }
        disabled={
          disabled ||
          loading
        }
        aria-label={localized(
          locale,
          "音频处理方式",
          "Audio processing mode",
          "音声処理モード",
        )}
        style={{
          height: 40,
          padding:
            "0 9px",
          border:
            "1px solid #d1d5db",
          borderRadius:
            11,
          background:
            "#ffffff",
          color:
            "#334155",
          fontSize: 11,
          fontWeight: 700,
        }}
      >
        <option value="summary">
          {localized(
            locale,
            "精简提取",
            "Key information",
            "要点抽出",
          )}
        </option>

        <option value="transcription">
          {localized(
            locale,
            "完整转写",
            "Full transcription",
            "完全文字起こし",
          )}
        </option>
      </select>

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
          borderRadius: 11,
          background:
            loading
              ? "#f8fafc"
              : "#ffffff",
          color:
            "#334155",
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
              "正在处理音频...",
              "Processing audio...",
              "音声を処理中...",
            )
          : localized(
              locale,
              "音频转文字",
              "Audio to text",
              "音声を文字化",
            )}
      </button>

      {error && (
        <div
          role="alert"
          style={{
            flexBasis:
              "100%",
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
