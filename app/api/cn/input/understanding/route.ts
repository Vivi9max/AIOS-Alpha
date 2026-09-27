import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  resolveAlphaIdentity,
  AIOS_USER_COOKIE,
} from "@/lib/auth/identity";

import {
  processAIOSCNInputUnderstanding,
  type AIOSCNInputFile,
} from "@/lib/runtime/cn/aios-cn-input-understanding-runtime";

import type {
  AIOSInputItem,
} from "@/lib/runtime/input/aios-input-types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

const MAX_INPUTS = 8;

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

function parseInputs(
  value: FormDataEntryValue | null,
): AIOSInputItem[] {
  if (
    typeof value !==
    "string"
  ) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(value);

    if (
      !Array.isArray(
        parsed,
      )
    ) {
      return [];
    }

    return parsed;
  } catch {
    return [];
  }
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

    if (
      !Array.isArray(
        parsed,
      )
    ) {
      return [];
    }

    return parsed.filter(
      (
        item,
      ): item is string =>
        typeof item ===
          "string" &&
        item.trim()
          .length > 0,
    );
  } catch {
    return [];
  }
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
          "AIOS CN Input Understanding API",
        runtime:
          "aios-cn",
        provider:
          "deepseek",
        model:
          "deepseek-flash",
        capabilities: {
          text: true,
          csv: true,
          json: true,
          imageVision: true,
          imageOCR: true,
          videoVision: true,
          pdfParsing: false,
          officeParsing: false,
          plannerDispatch: false,
          tradingExecution: false,
          commercialActualWrite: false,
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
          isolated: true,
        },
        timestamp:
          Date.now(),
      },
      {
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
            error:
              "AIOS_CN_INPUT_MULTIPART_REQUIRED",
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

    const inputs =
      parseInputs(
        formData.get(
          "inputs",
        ),
      );

    const fileInputIds =
      parseStringArray(
        formData.get(
          "fileInputIds",
        ),
      );

    const promptValue =
      formData.get(
        "prompt",
      );

    const prompt =
      typeof promptValue ===
      "string"
        ? promptValue
        : "";

    const uploadedFiles =
      formData
        .getAll("files")
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
      inputs.length === 0 ||
      inputs.length >
        MAX_INPUTS ||
      fileInputIds.length !==
        uploadedFiles.length ||
      uploadedFiles.length ===
        0
    ) {
      const response =
        NextResponse.json(
          {
            success: false,
            error:
              "AIOS_CN_INPUT_MAPPING_INVALID",
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
      inputs.map(
        (input) => {
          const index =
            fileInputIds.indexOf(
              input.id,
            );

          const file =
            index >= 0
              ? uploadedFiles[
                  index
                ]
              : undefined;

          return {
            ...input,
            metadata: {
              ...input.metadata,
              name:
                file?.name ??
                input.metadata.name,
              mimeType:
                file?.type ||
                input.metadata.mimeType,
              sizeBytes:
                file?.size ??
                input.metadata.sizeBytes,
              lastModifiedAt:
                file
                  ? new Date(
                      file.lastModified,
                    ).toISOString()
                  : input.metadata
                      .lastModifiedAt,
            },
          };
        },
      );

    const understandingFiles:
      AIOSCNInputFile[] =
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

    const result =
      await processAIOSCNInputUnderstanding(
        rebuiltInputs,
        understandingFiles,
        prompt,
      );

    const response =
      NextResponse.json(
        {
          ...result,
          runtime:
            "aios-cn-input-understanding",
          identity: {
            userId:
              identity.userId,
            isolated: true,
          },
          locale:
            request.headers.get(
              "x-aios-locale",
            ) ??
            "zh-CN",
          transient: true,
          latencyMs:
            Date.now() -
            startedAt,
        },
        {
          status:
            result.success
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
  } catch (
    error
  ) {
    const response =
      NextResponse.json(
        {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "AIOS CN input understanding failed.",
          identity: {
            userId:
              identity.userId,
            isolated: true,
          },
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
