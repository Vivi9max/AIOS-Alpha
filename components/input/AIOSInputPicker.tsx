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
  registerAIOSInputProcessingFile,
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

interface NativeInputWindow
  extends Window {
  AIOSNativeInput?: {
    pickPhotos?: () => Promise<unknown>;
  };
}

const MAX_INPUTS = 8;

const MAX_IMAGE_BYTES =
  20 * 1024 * 1024;

const MAX_VIDEO_BYTES =
  100 * 1024 * 1024;

const MAX_FILE_BYTES =
  25 * 1024 * 1024;

const PHOTO_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif";

const CAMERA_ACCEPT =
  "image/jpeg,image/png,image/webp,image/heic,image/heif";

const VIDEO_ACCEPT =
  "video/mp4,video/webm,video/quicktime,video/x-m4v";

const SUPPORTED_IMAGE_TYPES =
  new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
  ]);

const SUPPORTED_VIDEO_TYPES =
  new Set([
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-m4v",
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

const SUPPORTED_VIDEO_EXTENSIONS =
  new Set([
    ".mp4",
    ".webm",
    ".mov",
    ".m4v",
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

function createInputId(): string {
  return [
    "aios-input",
    Date.now(),
    Math.random()
      .toString(36)
      .slice(2, 10),
  ].join("-");
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

  if (
    index < 0
  ) {
    return "";
  }

  return name.slice(
    index,
  );
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

function isVideoFile(
  file: File,
): boolean {
  const mime =
    file.type
      .trim()
      .toLowerCase();

  if (
    SUPPORTED_VIDEO_TYPES.has(
      mime,
    )
  ) {
    return true;
  }

  return SUPPORTED_VIDEO_EXTENSIONS.has(
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
    SUPPORTED_VIDEO_TYPES.has(
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
    SUPPORTED_VIDEO_EXTENSIONS.has(
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
  if (
    isImageFile(file)
  ) {
    return "image";
  }

  if (
    isVideoFile(file)
  ) {
    return "video";
  }

  return "file";
}

function formatFileSize(
  bytes: number,
): string {
  if (
    bytes <
    1024
  ) {
    return `${bytes} B`;
  }

  if (
    bytes <
    1024 *
      1024
  ) {
    return `${(
      bytes /
      1024
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
    item.kind ===
    "video"
  ) {
    return "VID";
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
        !Array.isArray(
          result,
        )
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

function waitForVideoMetadata(
  video: HTMLVideoElement,
): Promise<void> {
  if (
    video.readyState >=
    1
  ) {
    return Promise.resolve();
  }

  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const onLoaded =
        () => {
          cleanup();
          resolve();
        };

      const onError =
        () => {
          cleanup();
          reject(
            new Error(
              "Video metadata could not be loaded.",
            ),
          );
        };

      const cleanup =
        () => {
          video.removeEventListener(
            "loadedmetadata",
            onLoaded,
          );

          video.removeEventListener(
            "error",
            onError,
          );
        };

      video.addEventListener(
        "loadedmetadata",
        onLoaded,
      );

      video.addEventListener(
        "error",
        onError,
      );

      video.load();
    },
  );
}

function seekVideo(
  video: HTMLVideoElement,
  time: number,
): Promise<void> {
  return new Promise(
    (
      resolve,
      reject,
    ) => {
      const onSeeked =
        () => {
          cleanup();
          resolve();
        };

      const onError =
        () => {
          cleanup();
          reject(
            new Error(
              "Video frame could not be sampled.",
            ),
          );
        };

      const cleanup =
        () => {
          video.removeEventListener(
            "seeked",
            onSeeked,
          );

          video.removeEventListener(
            "error",
            onError,
          );
        };

      video.addEventListener(
        "seeked",
        onSeeked,
      );

      video.addEventListener(
        "error",
        onError,
      );

      try {
        video.currentTime =
          time;
      } catch {
        cleanup();

        reject(
          new Error(
            "Video seek is not supported.",
          ),
        );
      }
    },
  );
}

async function buildVideoFrameSheet(
  file: File,
): Promise<File | null> {
  if (
    typeof document ===
      "undefined" ||
    typeof URL ===
      "undefined"
  ) {
    return null;
  }

  const sourceUrl =
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
    sourceUrl;

  try {
    await waitForVideoMetadata(
      video,
    );

    const duration =
      Number.isFinite(
        video.duration,
      )
        ? video.duration
        : 0;

    if (
      duration <= 0 ||
      !Number.isFinite(
        duration,
      )
    ) {
      return null;
    }

    const ratios = [
      0,
      0.25,
      0.5,
      0.75,
      0.95,
    ];

    const sourceWidth =
      video.videoWidth ||
      640;

    const sourceHeight =
      video.videoHeight ||
      360;

    const maxWidth =
      640;

    const scale =
      Math.min(
        1,
        maxWidth /
          sourceWidth,
      );

    const width =
      Math.max(
        320,
        Math.round(
          sourceWidth *
            scale,
        ),
      );

    const height =
      Math.max(
        180,
        Math.round(
          sourceHeight *
            scale,
        ),
      );

    const gap = 8;

    const columns = 2;

    const rows =
      Math.ceil(
        ratios.length /
          columns,
      );

    const sheet =
      document.createElement(
        "canvas",
      );

    sheet.width =
      columns *
        width +
      (columns + 1) *
        gap;

    sheet.height =
      rows *
        height +
      (rows + 1) *
        gap;

    const context =
      sheet.getContext(
        "2d",
      );

    if (!context) {
      return null;
    }

    context.fillStyle =
      "#ffffff";

    context.fillRect(
      0,
      0,
      sheet.width,
      sheet.height,
    );

    for (
      let index = 0;
      index <
      ratios.length;
      index += 1
    ) {
      const ratio =
        ratios[index];

      const time =
        Math.min(
          duration *
            ratio,
          Math.max(
            0,
            duration -
              0.05,
          ),
        );

      await seekVideo(
        video,
        time,
      );

      const column =
        index %
        columns;

      const row =
        Math.floor(
          index /
            columns,
        );

      const x =
        gap +
        column *
          (width +
            gap);

      const y =
        gap +
        row *
          (height +
            gap);

      context.drawImage(
        video,
        x,
        y,
        width,
        height,
      );

      context.fillStyle =
        "rgba(0,0,0,0.62)";

      context.fillRect(
        x,
        y,
        76,
        24,
      );

      context.fillStyle =
        "#ffffff";

      context.font =
        "12px sans-serif";

      context.fillText(
        `${Math.round(
          time,
        )}s`,
        x + 8,
        y + 16,
      );
    }

    const blob =
      await new Promise<Blob | null>(
        (resolve) => {
          sheet.toBlob(
            resolve,
            "image/jpeg",
            0.82,
          );
        },
      );

    if (!blob) {
      return null;
    }

    return new File(
      [blob],
      `${file.name}.frames.jpg`,
      {
        type:
          "image/jpeg",
        lastModified:
          Date.now(),
      },
    );
  } finally {
    video.pause();
    video.removeAttribute(
      "src",
    );
    video.load();

    URL.revokeObjectURL(
      sourceUrl,
    );
  }
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

  const [
    videoProcessing,
    setVideoProcessing,
  ] = useState(false);

  const cameraRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const photoRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const videoRef =
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
      isVideoFile(file) &&
      file.size >
        MAX_VIDEO_BYTES
    ) {
      return localized(
        locale,
        "视频超过 100 MB 限制。",
        "Video exceeds the 100 MB limit.",
        "動画が 100 MB の上限を超えています。",
      );
    }

    if (
      !isImageFile(file) &&
      !isVideoFile(file) &&
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

  async function addFiles(
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

      const item =
        getInputItem(
          file,
          source,
        );

      if (
        isVideoFile(file)
      ) {
        setVideoProcessing(
          true,
        );

        try {
          const frameSheet =
            await buildVideoFrameSheet(
              file,
            );

          if (
            frameSheet
          ) {
            registerAIOSInputProcessingFile(
              item.id,
              frameSheet,
            );
          } else {
            setInputError(
              localized(
                locale,
                "视频已添加，但关键帧提取未完成。",
                "The video was attached, but frame extraction did not complete.",
                "動画は追加されましたが、キーフレーム抽出を完了できませんでした。",
              ),
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
                  "视频关键帧提取失败。",
                  "Video frame extraction failed.",
                  "動画のキーフレーム抽出に失敗しました。",
                ),
          );
        } finally {
          setVideoProcessing(
            false,
          );
        }
      }

      acceptedItems.push(
        item,
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
    setNativePhotoLoading(
      true,
    );

    try {
      const files =
        await bridge.pickPhotos();

      if (
        files.length > 0
      ) {
        await addFiles(
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
    void addFiles(
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
    void addFiles(
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

  function handleVideoChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    void addFiles(
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

  function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    void addFiles(
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
        accept={
          CAMERA_ACCEPT
        }
        capture="environment"
        onChange={
          handleCameraChange
        }
        disabled={
          disabled
        }
        style={{
          display:
            "none",
        }}
      />

      <input
        ref={photoRef}
        type="file"
        accept={
          PHOTO_ACCEPT
        }
        multiple
        onChange={
          handlePhotoChange
        }
        disabled={
          disabled ||
          nativePhotoLoading
        }
        style={{
          display:
            "none",
        }}
      />

      <input
        ref={videoRef}
        type="file"
        accept={
          VIDEO_ACCEPT
        }
        multiple
        onChange={
          handleVideoChange
        }
        disabled={
          disabled ||
          videoProcessing
        }
        style={{
          display:
            "none",
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
        disabled={
          disabled
        }
        style={{
          display:
            "none",
        }}
      />

      <div
        className="aios-input-actions"
        style={{
          display:
            "flex",
          flexWrap:
            "wrap",
          alignItems:
            "center",
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
          disabled={
            disabled ||
            videoProcessing
          }
          onClick={() =>
            videoRef.current?.click()
          }
          aria-label={localized(
            locale,
            "选择视频",
            "Choose videos",
            "動画を選択",
          )}
          title={localized(
            locale,
            "上传视频",
            "Upload video",
            "動画をアップロード",
          )}
        >
          <span className="aios-input-action-icon">
            V
          </span>

          <span className="aios-input-action-label">
            {videoProcessing
              ? localized(
                  locale,
                  "解析中",
                  "Processing",
                  "解析中",
                )
              : localized(
                  locale,
                  "视频",
                  "Video",
                  "動画",
                )}
          </span>
        </button>

        <button
          type="button"
          className="aios-input-action"
          disabled={
            disabled
          }
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
        <div
          className="aios-input-files"
          style={{
            display:
              "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 8,
            marginTop: 10,
          }}
        >
          {inputs.map(
            (item) => (
              <div
                key={
                  item.id
                }
                className="aios-input-file"
                style={{
                  position:
                    "relative",
                  overflow:
                    "hidden",
                  border:
                    "1px solid #e5e7eb",
                  borderRadius:
                    12,
                  background:
                    "#f8fafc",
                }}
              >
                {(
                  item.kind ===
                    "image" ||
                  item.kind ===
                    "video"
                ) && (
                  <InputMediaPreview
                    item={
                      item
                    }
                  />
                )}

                <div
                  style={{
                    display:
                      "flex",
                    alignItems:
                      "center",
                    gap: 8,
                    padding:
                      "8px 10px",
                  }}
                >
                  <span
                    className="aios-input-file-type"
                    aria-hidden="true"
                    style={{
                      fontSize:
                        10,
                      fontWeight:
                        800,
                      color:
                        "#475569",
                    }}
                  >
                    {getFileIcon(
                      item,
                    )}
                  </span>

                  <div
                    className="aios-input-file-info"
                    style={{
                      minWidth:
                        0,
                      flex: 1,
                    }}
                  >
                    <div
                      className="aios-input-file-name"
                      style={{
                        overflow:
                          "hidden",
                        textOverflow:
                          "ellipsis",
                        whiteSpace:
                          "nowrap",
                        color:
                          "#0f172a",
                        fontSize:
                          12,
                        fontWeight:
                          700,
                      }}
                    >
                      {item.metadata
                        .name ??
                        localized(
                          locale,
                          "未命名输入",
                          "Untitled input",
                          "名称なし",
                        )}
                    </div>

                    <div
                      style={{
                        marginTop:
                          2,
                        color:
                          "#94a3b8",
                        fontSize:
                          10,
                      }}
                    >
                      {item.metadata
                        .sizeBytes
                        ? formatFileSize(
                            item.metadata
                              .sizeBytes,
                          )
                        : ""}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeInput(
                        item.id,
                      )
                    }
                    disabled={
                      disabled
                    }
                    aria-label={localized(
                      locale,
                      "删除输入",
                      "Remove input",
                      "入力を削除",
                    )}
                    style={{
                      border:
                        "none",
                      background:
                        "transparent",
                      color:
                        "#94a3b8",
                      cursor:
                        "pointer",
                      fontSize:
                        16,
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function InputMediaPreview({
  item,
}: {
  item: AIOSInputItem;
}) {
  const [
    url,
    setUrl,
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    const file =
      item.localReference
        ? null
        : null;

    void file;

    return undefined;
  }, [
    item,
  ]);

  return (
    <div
      style={{
        width:
          "100%",
        aspectRatio:
          "16 / 9",
        background:
          "#e2e8f0",
        overflow:
          "hidden",
      }}
    >
      {item.kind ===
        "image" && (
        <div
          style={{
            width:
              "100%",
            height:
              "100%",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            color:
              "#64748b",
            fontSize:
              11,
          }}
        >
          IMAGE
        </div>
      )}

      {item.kind ===
        "video" && (
        <div
          style={{
            width:
              "100%",
            height:
              "100%",
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "center",
            color:
              "#64748b",
            fontSize:
              11,
          }}
        >
          VIDEO
        </div>
      )}

      {url && (
        <span
          style={{
            display:
              "none",
          }}
        >
          {url}
        </span>
      )}
    </div>
  );
}
