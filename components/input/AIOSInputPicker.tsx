"use client";

import {
  useEffect,
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

interface AIOSNativeInputBridge {
  isAvailable: () => boolean;
  pickPhotos: () => Promise<File[]>;
}

interface NativeInputWindow extends Window {
  AIOSNativeInput?: {
    pickPhotos?: () => Promise<unknown>;
  };
}

const MAX_INPUTS = 8;

const MAX_IMAGE_BYTES =
  20 * 1024 * 1024;

const MAX_FILE_BYTES =
  25 * 1024 * 1024;

const PHOTO_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif";

const CAMERA_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif";

const SUPPORTED_IMAGE_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ]);

const SUPPORTED_FILE_TYPES =
  new Set([
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

const SUPPORTED_IMAGE_EXTENSIONS =
  new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".heic",
    ".heif",
  ]);

const SUPPORTED_FILE_EXTENSIONS =
  new Set([
    ".pdf",
    ".txt",
    ".csv",
    ".json",
    ".doc",
    ".docx",
    ".xls",
    ".xlsx",
  ]);

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

  return SUPPORTED_IMAGE_EXTENSIONS.has(
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

  const extension =
    getFileExtension(file);

  return (
    SUPPORTED_IMAGE_EXTENSIONS.has(
      extension,
    ) ||
    SUPPORTED_FILE_EXTENSIONS.has(
      extension,
    )
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
    return "IMG";
  }

  if (
    item.metadata.mimeType ===
    "application/pdf"
  ) {
    return "PDF";
  }

  if (
    item.metadata.mimeType.includes(
      "spreadsheet",
    ) ||
    item.metadata.mimeType ===
      "text/csv"
  ) {
    return "CSV";
  }

  if (
    item.metadata.mimeType.includes(
      "word",
    ) ||
    item.metadata.mimeType ===
      "text/plain"
  ) {
    return "TXT";
  }

  return "FILE";
}

function getNativePhotoBridge(): AIOSNativeInputBridge {
  return {
    isAvailable() {
      if (
        typeof window ===
        "undefined"
      ) {
        return false;
      }

      const runtimeWindow =
        window as NativeInputWindow;

      return (
        typeof runtimeWindow
          .AIOSNativeInput
          ?.pickPhotos ===
        "function"
      );
    },

    async pickPhotos() {
      if (
        !this.isAvailable()
      ) {
        return [];
      }

      const runtimeWindow =
        window as NativeInputWindow;

      const picker =
        runtimeWindow
          .AIOSNativeInput
          ?.pickPhotos;

      if (!picker) {
        return [];
      }

      const result =
        await picker();

      if (
        !Array.isArray(result)
      ) {
        return [];
      }

      return result.filter(
        (
          value,
        ): value is File =>
          typeof File !==
            "undefined" &&
          value instanceof File,
      );
    },
  };
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

  const [
    nativePhotoLoading,
    setNativePhotoLoading,
  ] = useState(false);

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

  useEffect(() => {
    getNativePhotoBridge().isAvailable();
  }, []);

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
        "暂不支持该文件类型。",
        "This file type is not supported yet.",
        "このファイル形式にはまだ対応していません。",
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
        "该文件无法读取。",
        "This file cannot be read.",
        "このファイルを読み取れません。",
      );
    }

    if (
      isImageFile(file) &&
      file.size >
        MAX_IMAGE_BYTES
    ) {
      return localized(
        locale,
        "图片超过 20 MB 限制。",
        "Image exceeds the 20 MB limit.",
        "画像が 20 MB の上限を超えています。",
      );
    }

    if (
      !isImageFile(file) &&
      file.size >
        MAX_FILE_BYTES
    ) {
      return localized(
        locale,
        "文件超过 25 MB 限制。",
        "File exceeds the 25 MB limit.",
        "ファイルが 25 MB の上限を超えています。",
      );
    }

    return null;
  }

  function addFiles(
    files: FileList | File[],
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
          `最多同时添加 ${MAX_INPUTS} 个输入。`,
          `Up to ${MAX_INPUTS} inputs can be attached at once.`,
          `同時に追加できる入力は最大 ${MAX_INPUTS} 件です。`,
        ),
      );
      return;
    }

    const selectedFiles =
      Array.from(files).slice(
        0,
        availableSlots,
      );

    const acceptedItems:
      AIOSInputItem[] =
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
            "该文件已经添加。",
            "This file is already attached.",
            "このファイルはすでに追加されています。",
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
          `最多同时添加 ${MAX_INPUTS} 个输入。`,
          `Only ${MAX_INPUTS} inputs can be attached at once.`,
          `同時に追加できる入力は最大 ${MAX_INPUTS} 件です。`,
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

  async function handlePhotoPicker() {
    if (
      disabled ||
      nativePhotoLoading
    ) {
      return;
    }

    const bridge =
      getNativePhotoBridge();

    if (
      !bridge.isAvailable()
    ) {
      photoRef.current?.click();
      return;
    }

    setInputError("");
    setNativePhotoLoading(true);

    try {
      const files =
        await bridge.pickPhotos();

      if (
        files.length > 0
      ) {
        addFiles(
          files,
          "photo-library",
        );
      }
    } catch (
      error
    ) {
      setInputError(
        error instanceof Error
          ? error.message
          : localized(
              locale,
              "照片选择失败，请重试。",
              "Photo selection failed. Please try again.",
              "写真の選択に失敗しました。もう一度お試しください。",
            ),
      );
    } finally {
      setNativePhotoLoading(
        false,
      );
    }
  }

  function handleCameraChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    addFiles(
      event.target.files
        ? Array.from(
            event.target.files,
          )
        : [],
      "camera",
    );

    event.target.value =
      "";
  }

  function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    addFiles(
      event.target.files
        ? Array.from(
            event.target.files,
          )
        : [],
      "photo-library",
    );

    event.target.value =
      "";
  }

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    addFiles(
      event.target.files
        ? Array.from(
            event.target.files,
          )
        : [],
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
      className="aios-input-dock"
      style={{
        width: "100%",
      }}
    >
      <input
        ref={cameraRef}
        type="file"
        accept={CAMERA_ACCEPT}
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
        accept={PHOTO_ACCEPT}
        multiple
        onChange={
          handlePhotoChange
        }
        disabled={
          disabled ||
          nativePhotoLoading
        }
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
          "application/octet-stream",
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
        className="aios-input-actions"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 7,
        }}
      >
        <button
          type="button"
          className="aios-input-action"
          disabled={
            disabled ||
            nativePhotoLoading
          }
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
        >
          <span className="aios-input-action-icon">
            C
          </span>
          <span className="aios-input-action-label">
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
          className="aios-input-action"
          disabled={
            disabled ||
            nativePhotoLoading
          }
          onClick={() =>
            void handlePhotoPicker()
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
            "Choose from photos",
            "写真から選択",
          )}
        >
          <span className="aios-input-action-icon">
            P
          </span>
          <span className="aios-input-action-label">
            {nativePhotoLoading
              ? localized(
                  locale,
                  "处理中",
                  "Loading",
                  "処理中",
                )
              : localized(
                  locale,
                  "相册",
                  "Photos",
                  "写真",
                )}
          </span>
        </button>

        <button
          type="button"
          className="aios-input-action"
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
            "选择文档文件",
            "Choose document files",
            "ドキュメントを選択",
          )}
        >
          <span className="aios-input-action-icon">
            F
          </span>
          <span className="aios-input-action-label">
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
          className="aios-input-error"
        >
          {inputError}
        </div>
      )}

      {inputs.length > 0 && (
        <div className="aios-input-files">
          {inputs.map(
            (item) => (
              <div
                key={item.id}
                className="aios-input-file"
              >
                <span
                  className="aios-input-file-type"
                  aria-hidden="true"
                >
                  {getFileIcon(
                    item,
                  )}
                </span>

                <div
                  className="aios-input-file-info"
                >
                  <div className="aios-input-file-name">
                    {item.metadata
                      .name ??
                      localized(
                        locale,
                        "未命名文件",
                        "Unnamed file",
                        "名前なしファイル",
                      )}
                  </div>

                  <div className="aios-input-file-meta">
                    {item.metadata
                      .sizeBytes !==
                    null
                      ? formatFileSize(
                          item
                            .metadata
                            .sizeBytes,
                        )
                      : "—"}

                    <span aria-hidden="true">
                      {" · "}
                    </span>

                    {item.processingStatus ===
                    "ready"
                      ? localized(
                          locale,
                          "已处理",
                          "Ready",
                          "処理済み",
                        )
                      : item.processingStatus ===
                        "failed"
                        ? localized(
                            locale,
                            "处理失败",
                            "Failed",
                            "失敗",
                          )
                        : item.kind ===
                          "image"
                          ? localized(
                              locale,
                              "等待视觉理解",
                              "Waiting for vision understanding",
                              "画像理解待ち",
                            )
                          : localized(
                              locale,
                              "等待文件解析",
                              "Waiting for file parsing",
                              "ファイル解析待ち",
                            )}
                  </div>
                </div>

                <button
                  type="button"
                  className="aios-input-remove"
                  onClick={() =>
                    removeInput(
                      item.id,
                    )
                  }
                  disabled={disabled}
                  aria-label={localized(
                    locale,
                    "移除输入",
                    "Remove input",
                    "入力を削除",
                  )}
                >
                  x
                </button>
              </div>
            ),
          )}
        </div>
      )}

      {inputs.length > 0 && (
        <div className="aios-input-count">
          {localized(
            locale,
            `已选择 ${inputs.length}/${MAX_INPUTS}`,
            `${inputs.length}/${MAX_INPUTS} inputs`,
            `${inputs.length}/${MAX_INPUTS} 件`,
          )}
        </div>
      )}

      <style jsx>{`
        .aios-input-actions {
          width: 100%;
        }

        .aios-input-action {
          min-width: 72px;
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 10px;
          border: 1px solid #e2e8f0;
          border-radius: 11px;
          background: #ffffff;
          color: #475569;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          transition:
            border-color 120ms ease,
            background 120ms ease,
            transform 120ms ease;
          -webkit-tap-highlight-color: transparent;
        }

        .aios-input-action:hover:not(:disabled) {
          border-color: #cbd5e1;
          background: #f8fafc;
        }

        .aios-input-action:active:not(:disabled) {
          transform: translateY(1px);
        }

        .aios-input-action:disabled {
          opacity: 0.48;
          cursor: not-allowed;
        }

        .aios-input-action-icon {
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          background: #f1f5f9;
          color: #334155;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 0.02em;
        }

        .aios-input-action-label {
          white-space: nowrap;
        }

        .aios-input-error {
          margin-top: 7px;
          padding: 7px 9px;
          border: 1px solid #fecaca;
          border-radius: 9px;
          background: #fff7f7;
          color: #b91c1c;
          font-size: 10px;
          line-height: 1.45;
        }

        .aios-input-files {
          display: grid;
          gap: 6px;
          margin-top: 7px;
        }

        .aios-input-file {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 7px 8px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: #f8fafc;
        }

        .aios-input-file-type {
          width: 28px;
          height: 28px;
          flex: 0 0 28px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: #eef2f7;
          color: #64748b;
          font-size: 7px;
          font-weight: 900;
        }

        .aios-input-file-info {
          min-width: 0;
          flex: 1;
        }

        .aios-input-file-name {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #1e293b;
          font-size: 11px;
          font-weight: 800;
        }

        .aios-input-file-meta {
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #94a3b8;
          font-size: 9px;
        }

        .aios-input-remove {
          width: 27px;
          height: 27px;
          flex: 0 0 27px;
          border: 0;
          border-radius: 8px;
          background: #e2e8f0;
          color: #475569;
          font-size: 12px;
          font-weight: 900;
          cursor: pointer;
        }

        .aios-input-remove:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .aios-input-count {
          margin-top: 5px;
          color: #94a3b8;
          font-size: 9px;
          line-height: 1.4;
        }

        @media (max-width: 520px) {
          .aios-input-actions {
            gap: 6px;
          }

          .aios-input-action {
            min-width: 0;
            flex: 1;
            height: 35px;
            padding: 0 7px;
          }

          .aios-input-action-icon {
            width: 21px;
            height: 21px;
          }

          .aios-input-action-label {
            font-size: 10px;
          }
        }
      `}</style>
    </div>
  );
}
