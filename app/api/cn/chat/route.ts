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

import {
  executeAIOSCNChat,
} from "@/lib/runtime/cn/aios-cn-chat-runtime";

import type {
  AIOSInputItem,
} from "@/lib/runtime/input/aios-input-types";

import type {
  AIOSCNProvider,
} from "@/lib/runtime/cn/aios-cn-runtime-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const MAX_INPUTS =
  8;

function resolveLocale(
  request: NextRequest,
): Locale {
  const header =
    request.headers.get(
      "x-aios-locale",
    );

  if (isLocale(header)) {
    return header;
  }

  return "zh-CN";
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

function parseJsonValue(
  value: FormDataEntryValue | null,
): unknown {
  if (
    typeof value !==
    "string"
  ) {
    return null;
  }

  try {
    return JSON.parse(
      value,
    );
  } catch {
    return null;
  }
}

function normalizeInputs(
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

function parseProvider(
  value: FormDataEntryValue | null,
): AIOSCNProvider | undefined {
  if (
    value ===
      "deepseek" ||
    value ===
      "qwen"
  ) {
    return value;
  }

  return undefined;
}

function parseFileInputIds(
  value: FormDataEntryValue | null,
): string[] {
  const parsed =
    parseJsonValue(
      value,
    );

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
}

function rebuildInputs(
  inputs: AIOSInputItem[],
  fileInputIds: string[],
  files: File[],
): AIOSInputItem[] {
  return fileInputIds.map(
    (
      inputId,
      index,
    ) => {
      const file =
        files[index];

      const original =
        inputs.find(
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

function buildErrorResponse(
  locale: Locale,
  error: string,
  status: number,
  userId: string,
): NextResponse {
  const content =
    locale === "zh-CN"
      ? "AIOS CN Chat 请求失败。"
      : locale === "ja"
        ? "AIOS CN Chat リクエストに失敗しました。"
        : "AIOS CN Chat request failed.";

  return NextResponse.json(
    {
      success: false,
      code:
        "AIOS_CN_CHAT_RUNTIME_FAILED",
      content,
      error,
      runtime:
        "aios-cn-chat",
      runtimeVersion:
        "C165.2",
      userId,
      locale,
      safetyBoundary: {
        plannerDispatched: false,
        tradingExecuted: false,
        commercialActualWritten: false,
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
    NextResponse.json({
      success: true,
      service:
        "AIOS CN Chat API",
      runtime:
        "aios-cn-chat",
      runtimeVersion:
        "C165.2",
      endpoint:
        "/api/cn/chat",
      capabilities: {
        chat: true,
        imageUnderstanding: true,
        textUnderstanding: true,
        csvUnderstanding: true,
        jsonUnderstanding: true,
        pdfParsing: false,
        officeParsing: false,
        voiceInputBridge: false,
        webIntelligence: false,
        plannerDispatch: false,
        tradingExecution: false,
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
      configuredProviders: {
        deepseek:
          Boolean(
            process.env.DEEPSEEK_API_KEY?.trim(),
          ),
        qwen:
          Boolean(
            process.env.QWEN_API_KEY?.trim(),
          ),
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
        plannerDispatched: false,
        tradingExecuted: false,
        commercialActualWritten: false,
      },
      timestamp:
        Date.now(),
    });

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
    resolveLocale(
      request,
    );

  try {
    const contentType =
      request.headers.get(
        "content-type",
      ) ?? "";

    if (
      contentType.includes(
        "multipart/form-data",
      )
    ) {
      const formData =
        await request.formData();

      const promptValue =
        formData.get(
          "prompt",
        );

      const prompt =
        typeof promptValue ===
        "string"
          ? promptValue
          : "";

      const systemPromptValue =
        formData.get(
          "systemPrompt",
        );

      const systemPrompt =
        typeof systemPromptValue ===
        "string"
          ? systemPromptValue
          : undefined;

      const provider =
        parseProvider(
          formData.get(
            "provider",
          ),
        );

      const inputItems =
        normalizeInputs(
          parseJsonValue(
            formData.get(
              "inputs",
            ),
          ),
        );

      const fileInputIds =
        parseFileInputIds(
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

      if (
        inputItems.length ===
          0 &&
        uploadedFiles.length ===
          0
      ) {
        const result =
          await executeAIOSCNChat(
            prompt,
            locale,
            provider,
            systemPrompt,
            [],
          );

        const response =
          NextResponse.json(
            {
              ...result,
              userId:
                identity.userId,
              locale,
              latencyMs:
                Date.now() -
                startedAt,
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

      const rebuiltInputs =
        rebuildInputs(
          inputItems,
          fileInputIds,
          uploadedFiles,
        );

      const foundationResult =
        processAIOSInputs({
          inputs:
            rebuiltInputs,
          prompt,
          sessionId:
            identity.userId,
        });

      if (
        foundationResult.code ===
        "AIOS_INPUT_REJECTED"
      ) {
        return applyIdentityCookie(
          buildErrorResponse(
            locale,
            "The uploaded inputs failed AIOS Input Foundation validation.",
            400,
            identity.userId,
          ),
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

      const usableInputs =
        understandingResult.inputs.filter(
          (input) =>
            input.processingStatus ===
              "ready" &&
            typeof input.extractedText ===
              "string" &&
            input.extractedText.trim()
              .length > 0,
        );

      if (
        usableInputs.length ===
        0
      ) {
        const result =
          await executeAIOSCNChat(
            prompt,
            locale,
            provider,
            systemPrompt,
            understandingResult.inputs,
          );

        const response =
          NextResponse.json(
            {
              ...result,
              inputFoundation:
                foundationResult,
              inputUnderstanding:
                understandingResult,
              userId:
                identity.userId,
              locale,
              latencyMs:
                Date.now() -
                startedAt,
            },
            {
              status:
                207,
            },
          );

        return applyIdentityCookie(
          response,
          identity.userId,
        );
      }

      const result =
        await executeAIOSCNChat(
          prompt,
          locale,
          provider,
          systemPrompt,
          understandingResult.inputs,
        );

      const response =
        NextResponse.json(
          {
            ...result,
            inputFoundation:
              foundationResult,
            inputUnderstanding:
              understandingResult,
            userId:
              identity.userId,
            identityMode:
              "anonymous-alpha",
            dataIsolated:
              true,
            locale,
            transient:
              true,
            latencyMs:
              Date.now() -
              startedAt,
          },
          {
            status:
              result.success
                ? 200
                : 503,
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

    const body =
      (await request.json()) as {
        prompt?: unknown;
        provider?: unknown;
        systemPrompt?: unknown;
      };

    const prompt =
      typeof body.prompt ===
      "string"
        ? body.prompt
        : "";

    const systemPrompt =
      typeof body.systemPrompt ===
      "string"
        ? body.systemPrompt
        : undefined;

    const provider =
      body.provider ===
          "deepseek" ||
        body.provider ===
          "qwen"
        ? body.provider
        : undefined;

    const result =
      await executeAIOSCNChat(
        prompt,
        locale,
        provider,
        systemPrompt,
        [],
      );

    const response =
      NextResponse.json(
        {
          ...result,
          userId:
            identity.userId,
          locale,
          transient:
            true,
          latencyMs:
            Date.now() -
            startedAt,
        },
        {
          status:
            result.success
              ? 200
              : 503,
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
      "[AIOS CN Chat API]",
      error,
    );

    return applyIdentityCookie(
      buildErrorResponse(
        locale,
        error instanceof Error
          ? error.message
          : "AIOS CN Chat request failed.",
        500,
        identity.userId,
      ),
      identity.userId,
    );
  }
}
