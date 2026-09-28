import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  resolveAlphaIdentity,
  AIOS_USER_COOKIE,
} from "@/lib/auth/identity";

import {
  transcribeAIOSCNAudio,
  type AIOSCNAudioMode,
} from "@/lib/runtime/cn/aios-cn-audio-runtime";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

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

function normalizeMode(
  value: FormDataEntryValue | null,
): AIOSCNAudioMode {
  return value ===
    "summary"
    ? "summary"
    : "transcription";
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
    const formData =
      await request.formData();

    const file =
      formData.get(
        "file",
      );

    const mode =
      normalizeMode(
        formData.get(
          "mode",
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

    if (
      !(file instanceof File)
    ) {
      const response =
        NextResponse.json(
          {
            success: false,
            code:
              "AIOS_CN_AUDIO_TRANSCRIPTION_FAILED",
            error:
              "No audio file was supplied.",
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

    const result =
      await transcribeAIOSCNAudio(
        file,
        mode,
        prompt,
      );

    const status =
      result.success
        ? 200
        : result.code ===
            "AIOS_CN_AUDIO_TRANSCRIPTION_UNAVAILABLE"
          ? 503
          : 500;

    const response =
      NextResponse.json(
        {
          ...result,
          runtime:
            "aios-cn-audio-understanding",
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
          fileName:
            file.name,
          transient: true,
          latencyMs:
            Date.now() -
            startedAt,
        },
        {
          status,
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
          code:
            "AIOS_CN_AUDIO_TRANSCRIPTION_FAILED",
          error:
            error instanceof Error
              ? error.message
              : "AIOS CN audio transcription failed.",
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
