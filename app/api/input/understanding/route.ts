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
      item !== null,
  );
}
function parseStringArray(
  value: FormDataEntryValue | null,
): string[] {
  if (
    typeof value !==
    "string"
  ) {
    return [];
  }
  try {
    const parsed =
      JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (
        item,
      ): item is string =>
        typeof item ===
          "string" &&
        item.trim().length >
          0,
    );
  } catch {
    return [];
  }
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
      const isImage =
        file.type
          .toLowerCase()
          .startsWith(
            "image/",
          );
      return {
        id:
          inputId,
        kind:
          original?.kind ===
            "image" ||
          isImage
            ? "image"
            : "file",
        metadata: {
          name:
            file.name ||
            original?.metadata
              .name ||
            null,
          mimeType:
            file.type ||
            "application/octet-stream",
          sizeBytes:
            file.size,
          lastModifiedAt:
            file.lastModified
              ? new Date(
                  file.lastModified,
                ).toISOString()
              : null,
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
  if (locale === "zh-CN") {
    return [
      "AIOS 输入理解完成。",
      "",
      `已理解：${understoodCount} 项`,
      `待处理：${pendingCount} 项`,
      `失败：${failedCount} 项`,
      "",
      "图片可以进入 Vision 理解并读取可见文字。",
      "PDF、DOC、DOCX、XLS、XLSX 仍处于文档解析待接入状态。",
    ].join("\n");
  }
  if (locale === "ja") {
    return [
      "AIOS 入力理解が完了しました。",
      "",
      `理解済み：${understoodCount} 件`,
      `保留：${pendingCount} 件`,
      `失敗：${failedCount} 件`,
      "",
      "画像は Vision 理解および可視テキストの読み取りに対応しています。",
      "PDF、DOC、DOCX、XLS、XLSX の文書解析はまだ接続されていません。",
    ].join("\n");
  }
  return [
    "AIOS input understanding completed.",
    "",
    `Understood: ${understoodCount}`,
    `Pending: ${pendingCount}`,
    `Failed: ${failedCount}`,
    "",
    "Images can enter Vision understanding and visible-text extraction.",
    "PDF, DOC, DOCX, XLS, and XLSX parsing are not connected yet.",
  ].join("\n");
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
            20 *
            1024 *
            1024,
          maxFileBytes:
            25 *
            1024 *
            1024,
        },
        identity: {
          userId:
            identity.userId,
          mode:
            "anonymous-alpha",
          isolated:
            true,
        },
        timestamp:
          Date.now(),
      },
      {
        status: 200,
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
      const response =
        NextResponse.json(
          {
            success: false,
            content:
              "AIOS Input Understanding requires multipart/form-data with real uploaded files.",
            error:
              "AIOS_INPUT_UNDERSTANDING_MULTIPART_REQUIRED",
            userId:
              identity.userId,
            timestamp:
              Date.now(),
          },
          {
            status: 415,
          },
        );
      return applyIdentityCookie(
        response,
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
            JSON.parse(
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
      const response =
        NextResponse.json(
          {
            success: false,
            content:
              locale === "zh-CN"
                ? "没有收到有效的 AIOS 输入文件。"
                : locale === "ja"
                  ? "有効な AIOS 入力ファイルを受信できませんでした。"
                  : "No valid AIOS input files were received.",
            error:
              "AIOS_INPUT_UNDERSTANDING_INPUT_REQUIRED",
            userId:
              identity.userId,
            locale,
            timestamp:
              Date.now(),
          },
          {
            status: 400,
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
      const response =
        NextResponse.json(
          {
            success: false,
            content:
              "Too many AIOS input files.",
            error:
              "AIOS_INPUT_TOO_MANY_FILES",
            limit:
              MAX_INPUTS,
            userId:
              identity.userId,
            timestamp:
              Date.now(),
          },
          {
            status: 400,
          },
        );
      return applyIdentityCookie(
        response,
        identity.userId,
      );
    }
    if (
      fileInputIds.length !==
      uploadedFiles.length
    ) {
      const response =
        NextResponse.json(
          {
            success: false,
            content:
              "Uploaded file references do not match uploaded files.",
            error:
              "AIOS_INPUT_FILE_MAPPING_INVALID",
            userId:
              identity.userId,
            timestamp:
              Date.now(),
          },
          {
            status: 400,
          },
        );
      return applyIdentityCookie(
        response,
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
            success: false,
            content:
              locale === "zh-CN"
                ? "输入文件未通过 AIOS Input Foundation 验证。"
                : locale === "ja"
                  ? "入力ファイルは AIOS Input Foundation の検証に失敗しました。"
                  : "The uploaded inputs failed AIOS Input Foundation validation.",
            code:
              "AIOS_INPUT_REJECTED",
            inputResult:
              foundationResult,
            userId:
              identity.userId,
            locale,
            latencyMs:
              Date.now() -
              startedAt,
          },
          {
            status: 400,
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
            fileInputIds[index],
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
              understandingResult.understoodCount,
              understandingResult.pendingCount,
              understandingResult.failedCount,
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
            understandingResult.safetyBoundary,
          runtime: {
            capability:
              "input-understanding",
            vision:
              understandingResult.inputs.some(
                (input) =>
                  input.kind ===
                    "image" &&
                  input.processingStatus ===
                    "ready",
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
          success: false,
          content:
            locale === "zh-CN"
              ? "AIOS 输入理解暂时不可用。"
              : locale === "ja"
                ? "AIOS 入力理解は一時的に利用できません。"
                : "AIOS input understanding is temporarily unavailable.",
          error:
            error instanceof Error
              ? error.message
              : "AIOS_INPUT_UNDERSTANDING_FAILED",
          userId:
            identity.userId,
          locale,
          timestamp:
            Date.now(),
          latencyMs:
            Date.now() -
            startedAt,
        },
        {
          status: 500,
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
