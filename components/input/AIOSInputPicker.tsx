"use client";
import {
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";
import type {
  AIOSInputItem,
  AIOSInputKind,
  AIOSInputSource,
} from "@/lib/runtime/input/aios-input-types";
interface Props {
  disabled?: boolean;
  onInputsChange?: (
    inputs: AIOSInputItem[],
  ) => void;
}
function createInputId(): string {
  return `aios-input-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
function getInputKind(
  file: File,
): AIOSInputKind {
  if (
    file.type.startsWith(
      "image/",
    )
  ) {
    return "image";
  }
  return "file";
}
function getSource(
  kind: AIOSInputKind,
): AIOSInputSource {
  if (kind === "image") {
    return "photo-library";
  }
  return "file-picker";
}
function formatFileSize(
  bytes: number,
): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }
  if (
    bytes <
    1024 * 1024 * 1024
  ) {
    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }
  return `${(
    bytes /
    (1024 * 1024 * 1024)
  ).toFixed(1)} GB`;
}
function getFileIcon(
  item: AIOSInputItem,
): string {
  if (item.kind === "image") {
    return "🖼️";
  }
  if (
    item.metadata.mimeType ===
    "application/pdf"
  ) {
    return "📕";
  }
  if (
    item.metadata.mimeType.includes(
      "spreadsheet",
    ) ||
    item.metadata.mimeType ===
      "text/csv"
  ) {
    return "📊";
  }
  if (
    item.metadata.mimeType.includes(
      "word",
    ) ||
    item.metadata.mimeType ===
      "text/plain"
  ) {
    return "📄";
  }
  return "📎";
}
function getInputItem(
  file: File,
  source: AIOSInputSource,
): AIOSInputItem {
  const kind =
    getInputKind(file);
  return {
    id: createInputId(),
    kind,
    metadata: {
      name:
        file.name ||
        null,
      mimeType:
        file.type ||
        "application/octet-stream",
      sizeBytes:
        Number.isFinite(
          file.size,
        )
          ? file.size
          : null,
      lastModifiedAt:
        file.lastModified
          ? new Date(
              file.lastModified,
            ).toISOString()
          : null,
      source,
    },
    localReference:
      null,
    extractedText:
      null,
    processingStatus:
      "ready",
    processingError:
      null,
  };
}
function localized(
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
export default function AIOSInputPicker({
  disabled = false,
  onInputsChange,
}: Props) {
  const { locale } =
    useLanguage();
  const [
    inputs,
    setInputs,
  ] = useState<
    AIOSInputItem[]
  >([]);
  const cameraRef =
    useRef<HTMLInputElement | null>(
      null,
    );
  const photoRef =
    useRef<HTMLInputElement | null>(
      null,
    );
  const fileRef =
    useRef<HTMLInputElement | null>(
      null,
    );
  function updateInputs(
    nextInputs: AIOSInputItem[],
  ) {
    setInputs(nextInputs);
    onInputsChange?.(
      nextInputs,
    );
  }
  function addFiles(
    files: FileList | null,
    source: AIOSInputSource,
  ) {
    if (
      disabled ||
      !files ||
      files.length === 0
    ) {
      return;
    }
    const nextItems =
      Array.from(files).map(
        (file) =>
          getInputItem(
            file,
            source,
          ),
      );
    updateInputs([
      ...inputs,
      ...nextItems,
    ]);
  }
  function handleCameraChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    addFiles(
      event.target.files,
      "camera",
    );
    event.target.value = "";
  }
  function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    addFiles(
      event.target.files,
      "photo-library",
    );
    event.target.value = "";
  }
  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    addFiles(
      event.target.files,
      "file-picker",
    );
    event.target.value = "";
  }
  function removeInput(
    id: string,
  ) {
    updateInputs(
      inputs.filter(
        (item) =>
          item.id !== id,
      ),
    );
  }
  return (
    <div
      style={{
        width: "100%",
      }}
    >
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={
          handleCameraChange
        }
        disabled={disabled}
        style={{
          display: "none",
        }}
      />
      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        multiple
        onChange={
          handlePhotoChange
        }
        disabled={disabled}
        style={{
          display: "none",
        }}
      />
      <input
        ref={fileRef}
        type="file"
        accept={[
          "application/pdf",
          "text/plain",
          "text/csv",
          "application/json",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "image/*",
          ".pdf",
          ".txt",
          ".csv",
          ".json",
          ".doc",
          ".docx",
          ".xls",
          ".xlsx",
        ].join(",")}
        multiple
        onChange={
          handleFileChange
        }
        disabled={disabled}
        style={{
          display: "none",
        }}
      />
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            cameraRef.current?.click()
          }
          aria-label={localized(
            locale,
            "打开相机",
            "Open camera",
            "カメラを開く",
          )}
          title={localized(
            locale,
            "拍照",
            "Take photo",
            "写真を撮る",
          )}
          style={{
            minWidth: 44,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "0 11px",
            border:
              "1px solid #d1d5db",
            borderRadius: 12,
            background:
              disabled
                ? "#f3f4f6"
                : "#ffffff",
            color: "#334155",
            fontSize: 13,
            fontWeight: 800,
            cursor: disabled
              ? "not-allowed"
              : "pointer",
            WebkitTapHighlightColor:
              "transparent",
          }}
        >
          <span
            aria-hidden="true"
          >
            📷
          </span>
          <span>
            {localized(
              locale,
              "拍照",
              "Camera",
              "カメラ",
            )}
          </span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            photoRef.current?.click()
          }
          aria-label={localized(
            locale,
            "选择照片",
            "Choose photos",
            "写真を選択",
          )}
          title={localized(
            locale,
            "从相册选择",
            "Choose from photo library",
            "写真ライブラリから選択",
          )}
          style={{
            minWidth: 44,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "0 11px",
            border:
              "1px solid #d1d5db",
            borderRadius: 12,
            background:
              disabled
                ? "#f3f4f6"
                : "#ffffff",
            color: "#334155",
            fontSize: 13,
            fontWeight: 800,
            cursor: disabled
              ? "not-allowed"
              : "pointer",
            WebkitTapHighlightColor:
              "transparent",
          }}
        >
          <span
            aria-hidden="true"
          >
            🖼️
          </span>
          <span>
            {localized(
              locale,
              "相册",
              "Photos",
              "写真",
            )}
          </span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            fileRef.current?.click()
          }
          aria-label={localized(
            locale,
            "选择文件",
            "Choose files",
            "ファイルを選択",
          )}
          title={localized(
            locale,
            "选择文件",
            "Choose files",
            "ファイルを選択",
          )}
          style={{
            minWidth: 44,
            height: 40,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "0 11px",
            border:
              "1px solid #d1d5db",
            borderRadius: 12,
            background:
              disabled
                ? "#f3f4f6"
                : "#ffffff",
            color: "#334155",
            fontSize: 13,
            fontWeight: 800,
            cursor: disabled
              ? "not-allowed"
              : "pointer",
            WebkitTapHighlightColor:
              "transparent",
          }}
        >
          <span
            aria-hidden="true"
          >
            📎
          </span>
          <span>
            {localized(
              locale,
              "文件",
              "Files",
              "ファイル",
            )}
          </span>
        </button>
      </div>
      {inputs.length > 0 && (
        <div
          style={{
            display: "grid",
            gap: 7,
            marginTop: 9,
          }}
        >
          {inputs.map(
            (item) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 9,
                  minWidth: 0,
                  padding:
                    "8px 10px",
                  border:
                    "1px solid #e2e8f0",
                  borderRadius: 12,
                  background:
                    "#f8fafc",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    flexShrink: 0,
                    fontSize: 18,
                  }}
                >
                  {getFileIcon(
                    item,
                  )}
                </span>
                <div
                  style={{
                    minWidth: 0,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      overflow:
                        "hidden",
                      textOverflow:
                        "ellipsis",
                      whiteSpace:
                        "nowrap",
                      color:
                        "#1e293b",
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    {
                      item.metadata
                        .name ??
                      localized(
                        locale,
                        "未命名文件",
                        "Unnamed file",
                        "名前なしファイル",
                      )
                    }
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      color:
                        "#94a3b8",
                      fontSize: 10,
                    }}
                  >
                    {item.metadata
                      .sizeBytes !==
                    null
                      ? formatFileSize(
                          item
                            .metadata
                            .sizeBytes,
                        )
                      : "—"}
                    {" · "}
                    {
                      item.metadata
                        .mimeType
                    }
                  </div>
                </div>
                <button
                  type="button"
                  disabled={
                    disabled
                  }
                  onClick={() =>
                    removeInput(
                      item.id,
                    )
                  }
                  aria-label={localized(
                    locale,
                    "删除输入",
                    "Remove input",
                    "入力を削除",
                  )}
                  style={{
                    width: 30,
                    height: 30,
                    flexShrink: 0,
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    border: 0,
                    borderRadius: 9,
                    background:
                      "#ffffff",
                    color:
                      "#64748b",
                    fontSize: 16,
                    cursor:
                      disabled
                        ? "not-allowed"
                        : "pointer",
                  }}
                >
                  ×
                </button>
              </div>
            ),
          )}
        </div>
      )}
      {inputs.length > 0 && (
        <div
          style={{
            marginTop: 7,
            color: "#94a3b8",
            fontSize: 10,
            lineHeight: 1.45,
          }}
        >
          {localized(
            locale,
            "当前文件仅在浏览器本地完成输入登记，尚未上传到 AIOS Runtime。",
            "Files are currently registered locally in the browser and are not yet uploaded to the AIOS Runtime.",
            "現在のファイルはブラウザ内でのみ登録され、まだ AIOS Runtime にはアップロードされていません。",
          )}
        </div>
      )}
    </div>
  );
}
