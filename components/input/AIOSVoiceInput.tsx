"use client";
import {
  useEffect,
  useRef,
  useState,
} from "react";
interface AIOSSpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: {
    transcript: string;
  };
}
interface AIOSSpeechRecognitionResultList {
  length: number;
  [index: number]: AIOSSpeechRecognitionResult;
}
interface AIOSSpeechRecognitionEvent {
  results: AIOSSpeechRecognitionResultList;
}
interface AIOSSpeechRecognitionErrorEvent {
  error: string;
}
interface AIOSSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult:
    | ((event: AIOSSpeechRecognitionEvent) => void)
    | null;
  onerror:
    | ((event: AIOSSpeechRecognitionErrorEvent) => void)
    | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
interface AIOSSpeechRecognitionConstructor {
  new (): AIOSSpeechRecognition;
}
interface Props {
  value: string;
  disabled?: boolean;
  locale?: string;
  onChange: (value: string) => void;
}
function getSpeechRecognitionConstructor():
  | AIOSSpeechRecognitionConstructor
  | null {
  if (
    typeof window === "undefined"
  ) {
    return null;
  }
  const browserWindow =
    window as Window & {
      SpeechRecognition?: AIOSSpeechRecognitionConstructor;
      webkitSpeechRecognition?: AIOSSpeechRecognitionConstructor;
    };
  return (
    browserWindow.SpeechRecognition ??
    browserWindow.webkitSpeechRecognition ??
    null
  );
}
function getRecognitionLanguage(
  locale: string,
): string {
  if (locale === "ja") {
    return "ja-JP";
  }
  if (locale === "en") {
    return "en-US";
  }
  return "zh-CN";
}
function getLocalizedText(
  locale: string,
  zh: string,
  en: string,
  ja: string,
): string {
  if (locale === "ja") {
    return ja;
  }
  if (locale === "en") {
    return en;
  }
  return zh;
}
export default function AIOSVoiceInput({
  value,
  disabled = false,
  locale = "zh-CN",
  onChange,
}: Props) {
  const [
    supported,
    setSupported,
  ] = useState(false);
  const [
    listening,
    setListening,
  ] = useState(false);
  const [
    status,
    setStatus,
  ] = useState("");
  const recognitionRef =
    useRef<AIOSSpeechRecognition | null>(
      null,
    );
  const valueRef =
    useRef(value);
  useEffect(() => {
    valueRef.current =
      value;
  }, [value]);
  useEffect(() => {
    const constructor =
      getSpeechRecognitionConstructor();
    setSupported(
      constructor !== null &&
        window.isSecureContext,
    );
  }, []);
  useEffect(() => {
    return () => {
      const recognition =
        recognitionRef.current;
      if (!recognition) {
        return;
      }
      try {
        recognition.abort();
      } catch {
        // Ignore cleanup errors.
      }
      recognitionRef.current =
        null;
    };
  }, []);
  function stopRecognition() {
    const recognition =
      recognitionRef.current;
    if (!recognition) {
      setListening(false);
      return;
    }
    try {
      recognition.stop();
    } catch {
      try {
        recognition.abort();
      } catch {
        // Ignore stop errors.
      }
    }
    setListening(false);
  }
  function startRecognition() {
    if (
      disabled ||
      listening
    ) {
      return;
    }
    const constructor =
      getSpeechRecognitionConstructor();
    if (
      !constructor ||
      !window.isSecureContext
    ) {
      setStatus(
        getLocalizedText(
          locale,
          "当前浏览器不支持语音输入，请使用支持语音识别的浏览器。",
          "Voice input is not supported by this browser.",
          "現在のブラウザは音声入力に対応していません。",
        ),
      );
      return;
    }
    const recognition =
      new constructor();
    recognition.lang =
      getRecognitionLanguage(
        locale,
      );
    recognition.continuous =
      false;
    recognition.interimResults =
      true;
    recognition.maxAlternatives =
      1;
    recognition.onstart =
      () => {
        setListening(true);
        setStatus(
          getLocalizedText(
            locale,
            "正在听，请说话……",
            "Listening...",
            "音声を聞いています...",
          ),
        );
      };
    recognition.onresult =
      (event) => {
        let finalTranscript =
          "";
        for (
          let index = 0;
          index <
          event.results.length;
          index += 1
        ) {
          const result =
            event.results[index];
          if (
            result.isFinal
          ) {
            finalTranscript +=
              result[0]
                .transcript;
          }
        }
        const cleaned =
          finalTranscript.trim();
        if (!cleaned) {
          return;
        }
        const current =
          valueRef.current.trim();
        const nextValue =
          current.length > 0
            ? current +
              " " +
              cleaned
            : cleaned;
        onChange(
          nextValue,
        );
        valueRef.current =
          nextValue;
      };
    recognition.onerror =
      (event) => {
        setListening(false);
        if (
          event.error ===
          "not-allowed"
        ) {
          setStatus(
            getLocalizedText(
              locale,
              "麦克风权限被拒绝，请在浏览器设置中允许麦克风访问。",
              "Microphone permission was denied. Please allow microphone access in browser settings.",
              "マイクの権限が拒否されました。ブラウザ設定でマイクを許可してください。",
            ),
          );
          return;
        }
        if (
          event.error ===
          "no-speech"
        ) {
          setStatus(
            getLocalizedText(
              locale,
              "没有检测到语音，请重新尝试。",
              "No speech was detected. Please try again.",
              "音声が検出されませんでした。もう一度お試しください。",
            ),
          );
          return;
        }
        if (
          event.error ===
          "audio-capture"
        ) {
          setStatus(
            getLocalizedText(
              locale,
              "无法访问麦克风。",
              "The microphone could not be accessed.",
              "マイクにアクセスできません。",
            ),
          );
          return;
        }
        setStatus(
          getLocalizedText(
            locale,
            "语音输入失败，请重试。",
            "Voice input failed. Please try again.",
            "音声入力に失敗しました。もう一度お試しください。",
          ),
        );
      };
    recognition.onend =
      () => {
        setListening(false);
        recognitionRef.current =
          null;
        setStatus(
          getLocalizedText(
            locale,
            "语音输入完成。",
            "Voice input completed.",
            "音声入力が完了しました。",
          ),
        );
      };
    recognitionRef.current =
      recognition;
    setStatus("");
    try {
      recognition.start();
    } catch {
      recognitionRef.current =
        null;
      setListening(false);
      setStatus(
        getLocalizedText(
          locale,
          "无法启动语音输入，请重试。",
          "Voice input could not be started. Please try again.",
          "音声入力を開始できませんでした。もう一度お試しください。",
        ),
      );
    }
  }
  function toggleRecognition() {
    if (listening) {
      stopRecognition();
      return;
    }
    startRecognition();
  }
  if (!supported) {
    return null;
  }
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
      }}
    >
      <button
        type="button"
        onClick={
          toggleRecognition
        }
        disabled={disabled}
        aria-label={
          listening
            ? getLocalizedText(
                locale,
                "停止语音输入",
                "Stop voice input",
                "音声入力を停止",
              )
            : getLocalizedText(
                locale,
                "开始语音输入",
                "Start voice input",
                "音声入力を開始",
              )
        }
        title={
          listening
            ? getLocalizedText(
                locale,
                "停止语音输入",
                "Stop voice input",
                "音声入力を停止",
              )
            : getLocalizedText(
                locale,
                "开始语音输入",
                "Start voice input",
                "音声入力を開始",
              )
        }
        style={{
          width: 44,
          height: 44,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border:
            listening
              ? "1px solid #ef4444"
              : "1px solid #d1d5db",
          borderRadius: 12,
          background:
            listening
              ? "#fef2f2"
              : disabled
                ? "#f3f4f6"
                : "#ffffff",
          color:
            listening
              ? "#dc2626"
              : "#334155",
          cursor:
            disabled
              ? "not-allowed"
              : "pointer",
          fontSize: 18,
          WebkitTapHighlightColor:
            "transparent",
        }}
      >
        <span
          aria-hidden="true"
        >
          {listening
            ? "■"
            : "🎙️"}
        </span>
      </button>
      {status && (
        <span
          aria-live="polite"
          style={{
            maxWidth: 220,
            color:
              listening
                ? "#475569"
                : "#64748b",
            fontSize: 10,
            lineHeight: 1.4,
          }}
        >
          {status}
        </span>
      )}
    </div>
  );
}
