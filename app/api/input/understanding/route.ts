import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  AIOS_USER_COOKIE,
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  isLocale,
  type Locale,
} from "@/lib/i18n";

import {
  processAIOSInputs,
} from "@/lib/runtime/input/aios-input-runtime";

import {
  processAIOSInputUnderstanding,
  type AIOSInputUnderstandingFile,
} from "@/lib/runtime/input/aios-input-understanding-runtime";

import type {
  AIOSInputItem,
} from "@/lib/runtime/input/aios-input-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const MAX_INPUTS =
  8;

const MAX_IMAGE_BYTES =
  20 *
  1024 *
  1024;

const MAX_FILE_BYTES =
  25 *
  1024 *
  1024;

function resolveRequestLocale(
  request: NextRequest,
): Locale {
  const header =
    request.headers.get(
      "x-aios-locale",
    );

  if (isLocale(header)) {
    return header;
  }

  return "en";
}

function applyIdentityCookie(
  response: NextResponse,
  userId: string,
): NextResponse {
  response.cookies.set(
    AIOS_USER_COOKIE,
    userId,
    {
      httpOnly: true,
      sameSite: "lax",
      secure:
        process.env.NODE_ENV ===
        "production",
      path: "/",
      maxAge:
        60 *
        60 *
        24 *
        365,
    },
  );

  return response;
}

function normalizeInputPayload(
  value: unknown,
): AIOSInputItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (
      item,
    ): item is AIOSInputItem =>
      typeof item ===
        "object" &&
      item !== null &&
      typeof (
        item as {
          id?: unknown;
        }
      ).id ===
        "string",
  );
}

function parseJsonArray(
  value: FormDataEntryValue | null,
): unknown[] {
  if (
    typeof value !==
    "string"
  ) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function parseStringArray(
  value: FormDataEntryValue | null,
): string[] {
  return parseJsonArray(
    value,
  ).filter(
    (
      item,
    ): item is string =>
      typeof item ===
        "string" &&
      item.trim().length >
        0,
  );
}

function rebuildInputsFromFiles(
  inputItems: AIOSInputItem[],
  fileInputIds: string[],
  uploadedFiles: File[],
): AIOSInputItem[] {
  return fileInputIds.map(
    (
      inputId,
      index,
    ) => {
      const file =
        uploadedFiles[index];

      const original =
        inputItems.find(
          (item) =>
            item.id ===
            inputId,
        );

      const mimeType =
        (
          file?.type ||
          original?.metadata
            .mimeType ||
          "application/octet-stream"
        ).toLowerCase();

      const isImage =
        mimeType.startsWith(
          "image/",
        );

      const isVideo =
        mimeType.startsWith(
          "video/",
        );

      const kind =
        isImage
          ? "image"
          : isVideo
            ? "video"
            : original?.kind ??
              "file";

      return {
        id:
          inputId,

        kind,

        metadata: {
          name:
            file?.name ||
            original?.metadata
              .name ||
            null,

          mimeType:
            file?.type ||
            original?.metadata
              .mimeType ||
            "application/octet-stream",

          sizeBytes:
            typeof file?.size ===
            "number"
              ? file.size
              : original?.metadata
                  .sizeBytes ??
                null,

          lastModifiedAt:
            file?.lastModified
              ? new Date(
                  file.lastModified,
                ).toISOString()
              : original?.metadata
                  .lastModifiedAt ??
                null,

          source:
            original?.metadata
              .source ??
            "runtime",
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
    },
  );
}

function localizedContent(
  locale: Locale,
  understoodCount: number,
  pendingCount: number,
  failedCount: number,
): string {
  if (
    locale ===
    "zh-CN"
  ) {
    return [
      "AIOS 输入理解完成。",
      "",
      `已理解：${understoodCount} 项`,
      `待处理：${pendingCount} 项`,
      `失败：${failedCount} 项`,
      "",
      "图片可以进入 Vision 理解并读取可见文字。",
      "视频会在提供派生关键帧证据后进入 Vision 理解。",
      "PDF、DOC、DOCX、XLS、XLSX 仍处于文档解析待接入状态。",
    ].join(
      "\n",
    );
  }

  if (
    locale ===
    "ja"
  ) {
    return [
      "AIOS 入力理解が完了しました。",
      "",
      `理解済み：${understoodCount} 件`,
      `保留：${pendingCount} 件`,
      `失敗：${failedCount} 件`,
      "",
      "画像は Vision 理解および可視テキストの読み取りに対応しています。",
      "動画は派生したキーフレーム証拠が提供された場合に Vision 理解へ進みます。",
      "PDF、DOC、DOCX、XLS、XLSX の文書解析はまだ接続されていません。",
    ].join(
      "\n",
    );
  }

  return [
    "AIOS input understanding completed.",
    "",
    `Understood: ${understoodCount}`,
    `Pending: ${pendingCount}`,
    `Failed: ${failedCount}`,
    "",
    "Images can enter Vision understanding and visible-text extraction.",
    "Videos enter Vision understanding only when derived frame evidence is provided.",
    "PDF, DOC, DOCX, XLS, and XLSX parsing are not connected yet.",
  ].join(
    "\n",
  );
}

function buildErrorResponse(
  locale: Locale,
  error: string,
  status: number,
  userId: string,
): NextResponse {
  const content =
    locale ===
    "zh-CN"
      ? "AIOS 输入理解请求失败。"
      : locale ===
          "ja"
        ? "AIOS 入力理解リクエストに失敗しました。"
        : "AIOS input understanding request failed.";

  return NextResponse.json(
    {
      success: false,

      content,

      error,

      userId,

      locale,

      safetyBoundary: {
        plannerDispatched:
          false,

        tradingExecuted:
          false,
      },

      timestamp:
        Date.now(),
    },
    {
      status,

      headers: {
        "Cache-Control":
          "no-store",
      },
    },
  );
}

export async function GET(
  request: NextRequest,
) {
  const identity =
    resolveAlphaIdentity(
      request,
    );

  const response =
    NextResponse.json(
      {
        success: true,

        service:
          "AIOS Input Understanding API",

        status:
          "online",

        capabilities: {
          text:
            true,

          csv:
            true,

          json:
            true,

          imageVision:
            true,

          imageOCR:
            true,

          videoFrameVision:
            true,

          pdfParsing:
            false,

          officeParsing:
            false,

          plannerDispatch:
            false,

          tradingExecution:
            false,
        },

        limits: {
          maxInputs:
            MAX_INPUTS,

          maxImageBytes:
            MAX_IMAGE_BYTES,

          maxFileBytes:
            MAX_FILE_BYTES,
        },

        identity: {
          userId:
            identity.userId,

          mode:
            "anonymous-alpha",

          isolated:
            true,
        },

        safetyBoundary: {
          plannerDispatched:
            false,

          tradingExecuted:
            false,
        },

        timestamp:
          Date.now(),
      },
      {
        status:
          200,

        headers: {
          "Cache-Control":
            "no-store",
        },
      },
    );

  return applyIdentityCookie(
    response,
    identity.userId,
  );
}

export async function POST(
  request: NextRequest,
) {
  const startedAt =
    Date.now();

  const identity =
    resolveAlphaIdentity(
      request,
    );

  const locale =
    resolveRequestLocale(
      request,
    );

  try {
    const contentType =
      request.headers.get(
        "content-type",
      ) ?? "";

    if (
      !contentType.includes(
        "multipart/form-data",
      )
    ) {
      return applyIdentityCookie(
        buildErrorResponse(
          locale,
          "AIOS Input Understanding requires multipart/form-data with real uploaded files.",
          415,
          identity.userId,
        ),
        identity.userId,
      );
    }

    const formData =
      await request.formData();

    const rawInputs =
      formData.get(
        "inputs",
      );

    const inputItems =
      typeof rawInputs ===
      "string"
        ? normalizeInputPayload(
            parseJsonArray(
              rawInputs,
            ),
          )
        : [];

    const fileInputIds =
      parseStringArray(
        formData.get(
          "fileInputIds",
        ),
      );

    const uploadedFiles =
      formData
        .getAll(
          "files",
        )
        .filter(
          (
            value,
          ): value is File =>
            typeof value ===
              "object" &&
            value !== null &&
            typeof File !==
              "undefined" &&
            value instanceof File,
        );

    if (
      inputItems.length ===
        0 ||
      fileInputIds.length ===
        0 ||
      uploadedFiles.length ===
        0
    ) {
      const content =
        locale ===
        "zh-CN"
          ? "没有收到有效的 AIOS 输入文件。"
          : locale ===
              "ja"
            ? "有効な AIOS 入力ファイルを受信できませんでした。"
            : "No valid AIOS input files were received.";

      const response =
        NextResponse.json(
          {
            success: false,

            content,

            error:
              "AIOS_INPUT_UNDERSTANDING_INPUT_REQUIRED",

            userId:
              identity.userId,

            locale,

            timestamp:
              Date.now(),
          },
          {
            status:
              400,
          },
        );

      return applyIdentityCookie(
        response,
        identity.userId,
      );
    }

    if (
      inputItems.length >
        MAX_INPUTS ||
      fileInputIds.length >
        MAX_INPUTS ||
      uploadedFiles.length >
        MAX_INPUTS
    ) {
      return applyIdentityCookie(
        buildErrorResponse(
          locale,
          "Too many AIOS input files.",
          400,
          identity.userId,
        ),
        identity.userId,
      );
    }

    const inputIds =
      new Set(
        inputItems.map(
          (
            input,
          ) =>
            input.id,
        ),
      );

    const uniqueFileInputIds =
      new Set(
        fileInputIds,
      );

    if (
      uniqueFileInputIds.size !==
      fileInputIds.length
    ) {
      return applyIdentityCookie(
        buildErrorResponse(
          locale,
          "Duplicate AIOS file input ids are not allowed.",
          400,
          identity.userId,
        ),
        identity.userId,
      );
    }

    const unknownFileInputId =
      fileInputIds.find(
        (
          inputId,
        ) =>
          !inputIds.has(
            inputId,
          ),
      );

    if (
      unknownFileInputId
    ) {
      return applyIdentityCookie(
        buildErrorResponse(
          locale,
          `Uploaded file input id is not declared in inputs: ${unknownFileInputId}`,
          400,
          identity.userId,
        ),
        identity.userId,
      );
    }

    if (
      fileInputIds.length !==
      uploadedFiles.length
    ) {
      return applyIdentityCookie(
        buildErrorResponse(
          locale,
          "Uploaded file references do not match uploaded files.",
          400,
          identity.userId,
        ),
        identity.userId,
      );
    }

    const oversizedImage =
      uploadedFiles.find(
        (
          file,
        ) =>
          file.type
            .toLowerCase()
            .startsWith(
              "image/",
            ) &&
          file.size >
            MAX_IMAGE_BYTES,
      );

    if (
      oversizedImage
    ) {
      return applyIdentityCookie(
        buildErrorResponse(
          locale,
          "Image exceeds the 20 MB processing limit.",
          413,
          identity.userId,
        ),
        identity.userId,
      );
    }

    const oversizedFile =
      uploadedFiles.find(
        (
          file,
        ) =>
          !file.type
            .toLowerCase()
            .startsWith(
              "image/",
            ) &&
          file.size >
            MAX_FILE_BYTES,
      );

    if (
      oversizedFile
    ) {
      return applyIdentityCookie(
        buildErrorResponse(
          locale,
          "Uploaded file exceeds the 25 MB processing limit.",
          413,
          identity.userId,
        ),
        identity.userId,
      );
    }

    const rebuiltInputs =
      rebuildInputsFromFiles(
        inputItems,
        fileInputIds,
        uploadedFiles,
      );

    const foundationResult =
      processAIOSInputs({
        inputs:
          rebuiltInputs,

        prompt:
          null,

        sessionId:
          identity.userId,
      });

    if (
      foundationResult.code ===
      "AIOS_INPUT_REJECTED"
    ) {
      const response =
        NextResponse.json(
          {
            success:
              false,

            content:
              locale ===
              "zh-CN"
                ? "输入文件未通过 AIOS Input Foundation 验证。"
                : locale ===
                    "ja"
                  ? "入力ファイルは AIOS Input Foundation の検証に失敗しました。"
                  : "The uploaded inputs failed AIOS Input Foundation validation.",

            code:
              "AIOS_INPUT_REJECTED",

            inputResult:
              foundationResult,

            userId:
              identity.userId,

            locale,

            safetyBoundary: {
              plannerDispatched:
                false,

              tradingExecuted:
                false,
            },

            latencyMs:
              Date.now() -
              startedAt,
          },
          {
            status:
              400,

            headers: {
              "Cache-Control":
                "no-store",
            },
          },
        );

      return applyIdentityCookie(
        response,
        identity.userId,
      );
    }

    const understandingFiles:
      AIOSInputUnderstandingFile[] =
      uploadedFiles.map(
        (
          file,
          index,
        ) => ({
          inputId:
            fileInputIds[
              index
            ],

          file,
        }),
      );

    const understandingResult =
      await processAIOSInputUnderstanding(
        rebuiltInputs,
        understandingFiles,
      );

    const response =
      NextResponse.json(
        {
          success:
            understandingResult.success,

          content:
            localizedContent(
              locale,

              understandingResult
                .understoodCount,

              understandingResult
                .pendingCount,

              understandingResult
                .failedCount,
            ),

          code:
            understandingResult.code,

          inputResult:
            foundationResult,

          understandingResult,

          userId:
            identity.userId,

          identityMode:
            "anonymous-alpha",

          dataIsolated:
            true,

          locale,

          safetyBoundary:
            understandingResult
              .safetyBoundary,

          runtime: {
            capability:
              "input-understanding",

            vision:
              understandingResult.inputs.some(
                (
                  input,
                ) =>
                  input.processingStatus ===
                    "ready" &&
                  (
                    input.kind ===
                      "image" ||
                    input.kind ===
                      "video"
                  ),
              ),

            transient:
              true,
          },

          latencyMs:
            Date.now() -
            startedAt,
        },
        {
          status:
            understandingResult.success
              ? 200
              : 207,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );

    return applyIdentityCookie(
      response,
      identity.userId,
    );
  } catch (error) {
    console.error(
      "[AIOS Input Understanding API]",
      error,
    );

    const response =
      NextResponse.json(
        {
          success:
            false,

          content:
            locale ===
            "zh-CN"
              ? "AIOS 输入理解暂时不可用。"
              : locale ===
                  "ja"
                ? "AIOS 入力理解は一時的に利用できません。"
                : "AIOS input understanding is temporarily unavailable.",

          error:
            error instanceof Error
              ? error.message
              : "AIOS_INPUT_UNDERSTANDING_FAILED",

          userId:
            identity.userId,

          locale,

          safetyBoundary: {
            plannerDispatched:
              false,

            tradingExecuted:
              false,
          },

          timestamp:
            Date.now(),

          latencyMs:
            Date.now() -
            startedAt,
        },
        {
          status:
            500,

          headers: {
            "Cache-Control":
              "no-store",
          },
        },
      );

    return applyIdentityCookie(
      response,
      identity.userId,
    );
  }
}
