// app/api/media/route.ts

import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  AIOS_USER_COOKIE,
  resolveAlphaIdentity,
} from "@/lib/auth/identity";

import {
  runWithUserContext,
} from "@/lib/runtime/request-context";

import {
  APP_CONFIG,
} from "@/lib/config/app";

import {
  generateStoryboard,
} from "@/lib/runtime/media/storyboard";

import {
  createOneClickVideoProject,
  type VideoCompositionOptions,
} from "@/lib/runtime/media/composer";

import {
  renderMedia,
} from "@/lib/runtime/media/render";

import type {
  MediaAsset,
  MediaCapabilityContext,
} from "@/lib/runtime/media/types";

export const dynamic =
  "force-dynamic";

export const runtime =
  "nodejs";

type MediaOperation =
  | "plan"
  | "render";

interface MediaRequestBody {
  operation?: unknown;

  prompt?: unknown;

  title?: unknown;

  description?: unknown;

  language?: unknown;

  aspectRatio?: unknown;

  targetPlatform?: unknown;

  durationSeconds?: unknown;

  sceneCount?: unknown;

  style?: unknown;

  width?: unknown;

  height?: unknown;

  frameRate?: unknown;

  outputFormat?: unknown;

  quality?: unknown;

  includeSubtitles?: unknown;

  musicPrompt?: unknown;

  musicProvider?: unknown;

  musicModel?: unknown;

  musicVolume?: unknown;

  voiceVolume?: unknown;

  assets?: unknown;
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
        60 * 60 * 24 * 365,
    },
  );

  return response;
}

function asString(
  value: unknown,
): string | undefined {
  if (
    typeof value !==
    "string"
  ) {
    return undefined;
  }

  const normalized =
    value
      .replace(/\s+/g, " ")
      .trim();

  return normalized ||
    undefined;
}

function asPositiveNumber(
  value: unknown,
): number | undefined {
  if (
    typeof value !==
    "number" ||
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return undefined;
  }

  return value;
}

function asBoolean(
  value: unknown,
): boolean | undefined {
  if (
    typeof value !==
    "boolean"
  ) {
    return undefined;
  }

  return value;
}

function resolveOperation(
  value: unknown,
): MediaOperation {
  return value ===
    "render"
    ? "render"
    : "plan";
}

function normalizeAssets(
  value: unknown,
): MediaAsset[] {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .slice(0, 40)
    .filter(
      (
        item,
      ): item is MediaAsset =>
        Boolean(
          item &&
          typeof item ===
            "object",
        ),
    )
    .map(
      (
        item,
      ) => {
        const source =
          item as Partial<MediaAsset>;

        return {
          ...source,

          id:
            typeof source.id ===
            "string"
              ? source.id
              : `media-asset-${Date.now()}-${Math.random()
                  .toString(36)
                  .slice(2, 8)}`,

          type:
            source.type ||
            "video",

          status:
            source.status ||
            "pending",

          provider:
            source.provider ||
            "uploaded",

          createdAt:
            typeof source.createdAt ===
            "number"
              ? source.createdAt
              : Date.now(),

          updatedAt:
            typeof source.updatedAt ===
            "number"
              ? source.updatedAt
              : Date.now(),
        } as MediaAsset;
      },
    );
}

function buildCompositionOptions(
  body: MediaRequestBody,
): VideoCompositionOptions {
  return {
    title:
      asString(
        body.title,
      ),

    description:
      asString(
        body.description,
      ),

    width:
      asPositiveNumber(
        body.width,
      ),

    height:
      asPositiveNumber(
        body.height,
      ),

    frameRate:
      asPositiveNumber(
        body.frameRate,
      ),

    outputFormat:
      body.outputFormat ===
        "webm"
        ? "webm"
        : "mp4",

    quality:
      body.quality ===
        "draft"
        ? "draft"
        : body.quality ===
            "high"
          ? "high"
          : "standard",

    language:
      asString(
        body.language,
      ),

    includeSubtitles:
      asBoolean(
        body.includeSubtitles,
      ),

    musicPrompt:
      asString(
        body.musicPrompt,
      ),

    musicProvider:
      asString(
        body.musicProvider,
      ),

    musicModel:
      asString(
        body.musicModel,
      ),

    musicVolume:
      asPositiveNumber(
        body.musicVolume,
      ),

    voiceVolume:
      asPositiveNumber(
        body.voiceVolume,
      ),
  };
}

function buildStoryboardOptions(
  body: MediaRequestBody,
  assets: MediaAsset[],
) {
  return {
    title:
      asString(
        body.title,
      ),

    description:
      asString(
        body.description,
      ),

    language:
      asString(
        body.language,
      ) ||
      "zh-CN",

    aspectRatio:
      asString(
        body.aspectRatio,
      ) ||
      "9:16",

    targetPlatform:
      asString(
        body.targetPlatform,
      ) ||
      "short-video",

    durationSeconds:
      asPositiveNumber(
        body.durationSeconds,
      ),

    sceneCount:
      asPositiveNumber(
        body.sceneCount,
      ),

    style:
      asString(
        body.style,
      ),

    inputAssets:
      assets,
  };
}

function buildContext(
  userId: string,
  locale: string | undefined,
  assets: MediaAsset[],
): MediaCapabilityContext {
  const now =
    Date.now();

  return {
    requestId:
      `media-${now}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

    userId,

    projectId:
      `media-project-${now}`,

    locale:
      locale ||
      "en",

    inputAssets:
      assets,

    metadata: {
      runtime:
        APP_CONFIG.runtimeId,

      runtimeVersion:
        APP_CONFIG.version,

      runtimeRelease:
        APP_CONFIG.release,

      capability:
        "media.one-click-video",
    },
  };
}

function localizedMessage(
  locale: string | undefined,
  key:
    | "prompt"
    | "invalid"
    | "renderNotReady",
): string {
  if (
    locale ===
    "zh-CN"
  ) {
    if (key === "prompt") {
      return "请输入视频需求。";
    }

    if (
      key ===
      "renderNotReady"
    ) {
      return "当前素材尚未全部就绪，AIOS 已停止实际渲染，避免生成虚假的成片结果。";
    }

    return "AIOS Media Runtime 请求无效。";
  }

  if (
    locale ===
    "ja"
  ) {
    if (key === "prompt") {
      return "動画の要件を入力してください。";
    }

    if (
      key ===
      "renderNotReady"
    ) {
      return "素材がすべて準備できていないため、AIOSは実際のレンダリングを停止しました。";
    }

    return "AIOS Media Runtime のリクエストが無効です。";
  }

  if (key === "prompt") {
    return "Please provide a video request.";
  }

  if (
    key ===
    "renderNotReady"
  ) {
    return "Media assets are not fully ready. AIOS stopped rendering instead of claiming a completed video.";
  }

  return "Invalid AIOS Media Runtime request.";
}

async function executeMediaRequest(
  body: MediaRequestBody,
  userId: string,
  locale: string,
) {
  const prompt =
    asString(
      body.prompt,
    );

  if (!prompt) {
    return {
      success: false,

      code:
        "MEDIA_PROMPT_REQUIRED",

      content:
        localizedMessage(
          locale,
          "prompt",
        ),
    };
  }

  const operation =
    resolveOperation(
      body.operation,
    );

  const assets =
    normalizeAssets(
      body.assets,
    );

  const storyboardOptions =
    buildStoryboardOptions(
      body,
      assets,
    );

  const compositionOptions =
    buildCompositionOptions(
      body,
    );

  const context =
    buildContext(
      userId,
      locale,
      assets,
    );

  /*
   * C146.8
   *
   * Runtime pipeline:
   *
   * Prompt
   *   ↓
   * Storyboard
   *   ↓
   * One-Click Composition
   *   ↓
   * Asset Readiness Gate
   *   ↓
   * FFmpeg Render
   *
   * The Runtime never reports generated
   * assets unless a concrete provider or
   * uploaded asset actually exists.
   */

  const storyboardResult =
    generateStoryboard(
      prompt,
      storyboardOptions,
      context,
    );

  if (
    !storyboardResult.success ||
    !storyboardResult.storyboard
  ) {
    return {
      success: false,

      code:
        storyboardResult.code,

      error:
        storyboardResult.error,

      content:
        storyboardResult.error ||
        "Storyboard generation failed.",

      runtime:
        APP_CONFIG.runtimeId,

      runtimeVersion:
        APP_CONFIG.version,
    };
  }

  const projectResult =
    createOneClickVideoProject(
      storyboardResult.storyboard,
      compositionOptions,
      {
        ...context,

        projectId:
          context.projectId,

        inputAssets:
          assets,
      },
    );

  if (
    !projectResult.success
  ) {
    return {
      success: false,

      code:
        projectResult.code,

      content:
        localizedMessage(
          locale,
          "invalid",
        ),

      errors:
        projectResult.errors,

      warnings:
        projectResult.warnings,

      storyboard:
        storyboardResult.storyboard,

      project:
        projectResult.project,

      plan:
        projectResult.plan,

      runtime:
        APP_CONFIG.runtimeId,

      runtimeVersion:
        APP_CONFIG.version,
    };
  }

  if (
    operation ===
    "plan"
  ) {
    return {
      success: true,

      code:
        projectResult.code,

      content:
        projectResult.plan.status ===
        "ready_for_render"
          ? "AIOS Media Runtime prepared the video pipeline and the supplied assets are ready for rendering."
          : "AIOS Media Runtime prepared the complete video pipeline. Concrete media assets are still required before final rendering.",

      operation,

      storyboard:
        storyboardResult.storyboard,

      project:
        projectResult.project,

      plan:
        projectResult.plan,

      errors:
        projectResult.errors,

      warnings:
        projectResult.warnings,

      runtime:
        APP_CONFIG.runtimeId,

      runtimeStage:
        APP_CONFIG.stage,

      runtimeVersion:
        APP_CONFIG.version,

      runtimeRelease:
        APP_CONFIG.release,
    };
  }

  if (
    projectResult.plan.status !==
    "ready_for_render"
  ) {
    return {
      success: false,

      code:
        "C146_8_RENDER_BLOCKED_ASSETS_NOT_READY",

      content:
        localizedMessage(
          locale,
          "renderNotReady",
        ),

      operation,

      storyboard:
        storyboardResult.storyboard,

      project:
        projectResult.project,

      plan:
        projectResult.plan,

      errors:
        projectResult.errors,

      warnings:
        projectResult.warnings,

      runtime:
        APP_CONFIG.runtimeId,

      runtimeStage:
        APP_CONFIG.stage,

      runtimeVersion:
        APP_CONFIG.version,

      runtimeRelease:
        APP_CONFIG.release,
    };
  }

  const renderResult =
    await renderMedia(
      projectResult.plan.render.request,
      {
        outputDirectory:
          process.env.AIOS_MEDIA_OUTPUT_DIR ||
          undefined,

        outputFileName:
          `${projectResult.plan.projectId}.${projectResult.plan.render.outputFormat}`,

        overwrite:
          true,
      },
    );

  return {
    success:
      renderResult.success,

    code:
      renderResult.result.code,

    content:
      renderResult.success
        ? "AIOS Media Runtime completed the server-side media render."
        : renderResult.result.error ||
          "AIOS Media Runtime render failed.",

    operation,

    storyboard:
      storyboardResult.storyboard,

    project:
      projectResult.project,

    plan:
      projectResult.plan,

    render:
      renderResult.result,

    outputPath:
      renderResult.outputPath,

    command:
      renderResult.command,

    warnings:
      [
        ...projectResult.warnings,

        ...(renderResult.command
          ?.warnings ||
          []),
      ],

    runtime:
      APP_CONFIG.runtimeId,

    runtimeStage:
      APP_CONFIG.stage,

    runtimeVersion:
      APP_CONFIG.version,

    runtimeRelease:
      APP_CONFIG.release,
  };
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
          "AIOS Media Runtime API",

        status:
          "online",

        runtime:
          APP_CONFIG.runtimeId,

        runtimeStage:
          APP_CONFIG.stage,

        runtimeVersion:
          APP_CONFIG.version,

        runtimeRelease:
          APP_CONFIG.release,

        capabilities: {
          storyboard:
            true,

          composition:
            true,

          render:
            true,

          ffmpeg:
            true,

          remoteMediaGeneration:
            false,

          oneClickVideo:
            true,
        },

        pipeline: [
          "prompt",
          "storyboard",
          "media-assets",
          "composition",
          "asset-readiness-gate",
          "ffmpeg-render",
          "export",
        ],

        notes: [
          "Remote AI media providers are not falsely reported as configured.",
          "Final rendering requires concrete ready media assets.",
        ],

        identity: {
          userId:
            identity.userId,

          isolated:
            true,

          mode:
            "anonymous-alpha",
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
    request.headers.get(
      "x-aios-locale",
    ) ||
    "en";

  try {
    const contentType =
      request.headers.get(
        "content-type",
      ) ||
      "";

    if (
      !contentType.includes(
        "application/json",
      )
    ) {
      const response =
        NextResponse.json(
          {
            success: false,

            code:
              "MEDIA_INVALID_CONTENT_TYPE",

            content:
              "Content-Type must be application/json.",

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

    const body =
      (await request.json()) as
        MediaRequestBody;

    const result =
      await runWithUserContext(
        identity.userId,
        () =>
          executeMediaRequest(
            body,
            identity.userId,
            locale,
          ),
      );

    const status =
      result.success
        ? 200
        : result.code ===
            "MEDIA_PROMPT_REQUIRED"
          ? 400
          : result.code ===
              "C146_8_RENDER_BLOCKED_ASSETS_NOT_READY"
            ? 409
            : 500;

    const response =
      NextResponse.json(
        {
          ...result,

          userId:
            identity.userId,

          identityMode:
            "anonymous-alpha",

          dataIsolated:
            true,

          locale,

          runtime:
            APP_CONFIG.runtimeId,

          runtimeStage:
            APP_CONFIG.stage,

          runtimeVersion:
            APP_CONFIG.version,

          runtimeRelease:
            APP_CONFIG.release,

          latencyMs:
            Date.now() -
            startedAt,

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

    return applyIdentityCookie(
      response,
      identity.userId,
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "AIOS Media Runtime failed.";

    console.error(
      "[AIOS Media Runtime]",
      error,
    );

    const response =
      NextResponse.json(
        {
          success: false,

          code:
            "MEDIA_RUNTIME_FAILED",

          content:
            message,

          runtime:
            APP_CONFIG.runtimeId,

          runtimeStage:
            APP_CONFIG.stage,

          runtimeVersion:
            APP_CONFIG.version,

          runtimeRelease:
            APP_CONFIG.release,

          userId:
            identity.userId,

          locale,

          latencyMs:
            Date.now() -
            startedAt,

          timestamp:
            Date.now(),
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
