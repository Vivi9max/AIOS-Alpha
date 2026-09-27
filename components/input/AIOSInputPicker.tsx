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
import {
  registerAIOSInputFile,
  removeAIOSInputFile,
} from "@/lib/runtime/input/aios-input-browser-store";
interface Props {
  disabled?: boolean;
  onInputsChange?: (
    inputs: AIOSInputItem[],
  ) => void;
}
const MAX_INPUTS = 8;
const MAX_IMAGE_BYTES =
  20 * 1024 * 1024;
const MAX_FILE_BYTES =
  25 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);
const SUPPORTED_FILE_TYPES = new Set([
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.ms-excel",
  "application/octet-stream",
]);
const SUPPORTED_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
  ".heif",
  ".pdf",
  ".txt",
  ".csv",
  ".json",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
]);
function createInputId(): string {
  return `aios-input-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}
function getFileExtension(
  file: File,
): string {
  const name =
    file.name
      .trim()
      .toLowerCase();
  const index =
    name.lastIndexOf(".");
  if (index < 0) {
    return "";
  }
  return name.slice(index);
}
function isImageFile(
  file: File,
): boolean {
  const mime =
    file.type
      .trim()
      .toLowerCase();
  if (
    SUPPORTED_IMAGE_TYPES.has(
      mime,
    )
  ) {
    return true;
  }
  return [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".heic",
    ".heif",
  ].includes(
    getFileExtension(file),
  );
}
function isSupportedFile(
  file: File,
): boolean {
  const mime =
    file.type
      .trim()
      .toLowerCase();
  if (
    SUPPORTED_IMAGE_TYPES.has(
      mime,
    ) ||
    SUPPORTED_FILE_TYPES.has(
      mime,
    )
  ) {
    return true;
  }
  return SUPPORTED_EXTENSIONS.has(
    getFileExtension(file),
  );
}
function getInputKind(
  file: File,
): AIOSInputKind {
  return isImageFile(file)
    ? "image"
    : "file";
}
function formatFileSize(
  bytes: number,
): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (
    bytes <
    1024 * 1024
  ) {
    return `${(
      bytes / 1024
    ).toFixed(1)} KB`;
  }
  if (
    bytes <
    1024 *
      1024 *
      1024
  ) {
    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }
  return `${(
    bytes /
    (1024 *
      1024 *
      1024)
  ).toFixed(1)} GB`;
}
function getFileIcon(
  item: AIOSInputItem,
): string {
  if (
    item.kind ===
    "image"
  ) {
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
function getInputItem(
  file: File,
  source: AIOSInputSource,
): AIOSInputItem {
  const id =
    createInputId();
  registerAIOSInputFile(
    id,
    file,
  );
  return {
    id,
    kind:
      getInputKind(file),
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
      "pending",
    processingError:
      null,
  };
}
export default function AIOSInputPicker({
  disabled = false,
  onInputsChange,
}: Props) {
  const {
    locale,
  } = useLanguage();
  const [
    inputs,
    setInputs,
  ] = useState<
    AIOSInputItem[]
  >([]);
  const [
    inputError,
    setInputError,
  ] = useState("");
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
    setInputs(
      nextInputs,
    );
    onInputsChange?.(
      nextInputs,
    );
  }
  function validateFile(
    file: File,
  ): string | null {
    if (
      !isSupportedFile(file)
    ) {
      return localized(
        locale,
        `暂不支持 ${file.name || "该文件"}。`,
        `${file.name || "This file"} is not supported yet.`,
        `${file.name || "このファイル"} はまだ対応していません。`,
      );
    }
    if (
      !Number.isFinite(
        file.size,
      ) ||
      file.size <= 0
    ) {
      return localized(
        locale,
        `${file.name || "该文件"} 无法读取。`,
        `${file.name || "This file"} cannot be read.`,
        `${file.name || "このファイル"} を読み取れません。`,
      );
    }
    if (
      isImageFile(file) &&
      file.size >
        MAX_IMAGE_BYTES
    ) {
      return localized(
        locale,
        `${file.name || "图片"} 超过 20 MB 图片限制。`,
        `${file.name || "Image"} exceeds the 20 MB image limit.`,
        `${file.name || "画像"} は 20 MB の上限を超えています。`,
      );
    }
    if (
      !isImageFile(file) &&
      file.size >
        MAX_FILE_BYTES
    ) {
      return localized(
        locale,
        `${file.name || "文件"} 超过 25 MB 文件限制。`,
        `${file.name || "File"} exceeds the 25 MB file limit.`,
        `${file.name || "ファイル"} は 25 MB の上限を超えています。`,
      );
    }
    return null;
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
    setInputError("");
    const availableSlots =
      MAX_INPUTS -
      inputs.length;
    if (
      availableSlots <= 0
    ) {
      setInputError(
        localized(
          locale,
          `最多同时上传 ${MAX_INPUTS} 个输入。`,
          `You can upload up to ${MAX_INPUTS} inputs at once.`,
          `同時にアップロードできる入力は最大 ${MAX_INPUTS} 件です。`,
        ),
      );
      return;
    }
    const selectedFiles =
      Array.from(files).slice(
        0,
        availableSlots,
      );
    const acceptedItems: AIOSInputItem[] =
      [];
    for (
      const file of selectedFiles
    ) {
      const validationError =
        validateFile(file);
      if (
        validationError
      ) {
        setInputError(
          validationError,
        );
        continue;
      }
      const duplicate =
        inputs.some(
          (item) =>
            item.metadata.name ===
              file.name &&
            item.metadata.sizeBytes ===
              file.size,
        ) ||
        acceptedItems.some(
          (item) =>
            item.metadata.name ===
              file.name &&
            item.metadata.sizeBytes ===
              file.size,
        );
      if (
        duplicate
      ) {
        setInputError(
          localized(
            locale,
            `${file.name || "文件"} 已添加，未重复添加。`,
            `${file.name || "File"} is already attached.`,
            `${file.name || "ファイル"} はすでに追加されています。`,
          ),
        );
        continue;
      }
      acceptedItems.push(
        getInputItem(
          file,
          source,
        ),
      );
    }
    if (
      files.length >
      availableSlots
    ) {
      setInputError(
        localized(
          locale,
          `最多同时上传 ${MAX_INPUTS} 个输入，其余已忽略。`,
          `Only ${MAX_INPUTS} inputs can be attached at once. Extra files were ignored.`,
          `同時に追加できる入力は最大 ${MAX_INPUTS} 件です。超過分は無視されました。`,
        ),
      );
    }
    if (
      acceptedItems.length ===
      0
    ) {
      return;
    }
    updateInputs([
      ...inputs,
      ...acceptedItems,
    ]);
  }
  function handleCameraChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    addFiles(
      event.target.files,
      "camera",
    );
    event.target.value =
      "";
  }
  function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    addFiles(
      event.target.files,
      "photo-library",
    );
    event.target.value =
      "";
  }
  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    addFiles(
      event.target.files,
      "file-picker",
    );
    event.target.value =
      "";
  }
  function removeInput(
    id: string,
  ) {
    removeAIOSInputFile(
      id,
    );
    setInputError("");
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
          "application/msword",
          "application/vnd.ms-excel",
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
            justifyContent:
              "center",
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
            cursor:
              disabled
                ? "not-allowed"
                : "pointer",
            WebkitTapHighlightColor:
              "transparent",
          }}
        >
          <span aria-hidden="true">
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
            justifyContent:
              "center",
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
            cursor:
              disabled
                ? "not-allowed"
                : "pointer",
            WebkitTapHighlightColor:
              "transparent",
          }}
        >
          <span aria-hidden="true">
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
            justifyContent:
              "center",
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
            cursor:
              disabled
                ? "not-allowed"
                : "pointer",
            WebkitTapHighlightColor:
              "transparent",
          }}
        >
          <span aria-hidden="true">
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
      {inputError && (
        <div
          role="alert"
          style={{
            marginTop: 8,
            padding:
              "8px 10px",
            border:
              "1px solid #fecaca",
            borderRadius: 10,
            background:
              "#fef2f2",
            color:
              "#b91c1c",
            fontSize: 11,
            lineHeight: 1.45,
          }}
        >
          {inputError}
        </div>
      )}
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
                    {item.metadata
                      .name ??
                      localized(
                        locale,
                        "未命名文件",
                        "Unnamed file",
                        "名前なしファイル",
                      )}
                  </div>
                  <div
                    style={{
                      marginTop: 2,
                      color:
                        "#64748b",
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
                  <div
                    style={{
                      marginTop: 3,
                      color:
                        "#94a3b8",
                      fontSize: 10,
                    }}
                  >
                    {item.kind ===
                    "image"
                      ? localized(
                          locale,
                          "图片：将进入 Vision / OCR 理解",
                          "Image: sent to Vision / OCR understanding",
                          "画像：Vision / OCR 理解へ送信",
                        )
                      : localized(
                          locale,
                          "文件：按类型处理，部分格式仍可能等待解析器",
                          "File: processed by type; some formats may remain pending",
                          "ファイル：種類ごとに処理、一部形式は保留になる場合があります",
                        )}
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
                    display:
                      "flex",
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
            display: "flex",
            justifyContent:
              "space-between",
            gap: 8,
            color:
              "#94a3b8",
            fontSize: 10,
            lineHeight: 1.45,
          }}
        >
          <span>
            {localized(
              locale,
              `已选择 ${inputs.length}/${MAX_INPUTS} 个输入`,
              `${inputs.length}/${MAX_INPUTS} inputs selected`,
              `${inputs.length}/${MAX_INPUTS} 件の入力を選択中`,
            )}
          </span>
          <span>
            {localized(
              locale,
              "上传后由 AIOS Input Understanding 处理",
              "Processed by AIOS Input Understanding after upload",
              "アップロード後に AIOS Input Understanding が処理します",
            )}
          </span>
        </div>
      )}
    </div>
  );
}
