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

import {
  generateOpenAIMedia,
} from "@/lib/runtime/media/openai";

import {
  MEDIA_ASPECT_RATIO_OPTIONS,
  MEDIA_DURATION_OPTIONS,
  MEDIA_LANGUAGE_OPTIONS,
  normalizeMediaOptions,
} from "@/lib/runtime/media/options";

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
  | "generate"
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
  return typeof value ===
    "boolean"
    ? value
    : undefined;
}

function resolveOperation(
  value: unknown,
): MediaOperation {
  if (
    value === "generate" ||
    value === "render"
  ) {
    return value;
  }

  return "plan";
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
              : `media-asset-${Date.now()}`,

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
  mediaOptions: ReturnType<
    typeof normalizeMediaOptions
  >,
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
      mediaOptions.width,

    height:
      mediaOptions.height,

    frameRate:
      asPositiveNumber(
        body.frameRate,
      ) || 30,

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
      mediaOptions.language,

    includeSubtitles:
      asBoolean(
        body.includeSubtitles,
      ),

    /*
     * Music remains disabled until
     * a real music provider is connected.
     */
    musicPrompt:
      undefined,

    musicProvider:
      undefined,

    musicModel:
      undefined,

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
  mediaOptions: ReturnType<
    typeof normalizeMediaOptions
  >,
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
      mediaOptions.language,

    aspectRatio:
      mediaOptions.aspectRatio,

    targetPlatform:
      asString(
        body.targetPlatform,
      ) ||
      (
        mediaOptions.orientation ===
        "landscape"
          ? "video"
          : "short-video"
      ),

    durationSeconds:
      mediaOptions.durationSeconds,

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
  locale: string,
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

    locale,

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
        locale === "zh-CN"
          ? "请输入视频需求。"
          : locale === "ja"
            ? "動画の要件を入力してください。"
            : "Please provide a video request.",
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

  /*
   * C146.10:
   *
   * Normalize all user-selectable
   * media options before they enter
   * storyboard/composition/generation.
   */
  const mediaOptions =
    normalizeMediaOptions({
      language:
        body.language,

      aspectRatio:
        body.aspectRatio,

      durationSeconds:
        body.durationSeconds,
    });

  const storyboardResult =
    generateStoryboard(
      prompt,
      buildStoryboardOptions(
        body,
        assets,
        mediaOptions,
      ),
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
    };
  }

  const storyboard =
    storyboardResult.storyboard;

  const context =
    buildContext(
      userId,
      locale,
      assets,
    );

  const compositionOptions =
    buildCompositionOptions(
      body,
      mediaOptions,
    );

  const initialProject =
    createOneClickVideoProject(
      storyboard,
      compositionOptions,
      context,
    );

  if (
    !initialProject.success
  ) {
    return {
      success: false,

      code:
        initialProject.code,

      content:
        "AIOS Media composition failed.",

      errors:
        initialProject.errors,

      warnings:
        initialProject.warnings,

      storyboard,

      project:
        initialProject.project,

      plan:
        initialProject.plan,
    };
  }

  if (
    operation === "plan"
  ) {
    return {
      success: true,

      code:
        "C146_10_MEDIA_PLAN_READY",

      content:
        "AIOS Media Runtime prepared the video generation plan.",

      operation,

      mediaOptions,

      storyboard,

      project:
        initialProject.project,

      plan:
        initialProject.plan,

      runtime:
        APP_CONFIG.runtimeId,

      runtimeVersion:
        APP_CONFIG.version,

      runtimeRelease:
        APP_CONFIG.release,
    };
  }

  const generation =
    await generateOpenAIMedia(
      storyboard,
      {
        width:
          mediaOptions.width,

        height:
          mediaOptions.height,

        frameRate:
          asPositiveNumber(
            body.frameRate,
          ) || 30,

        imageQuality:
          "auto",
      },
      context,
    );

  if (
    !generation.success
  ) {
    return {
      success: false,

      code:
        generation.code,

      content:
        generation.errors.join(
          "\n",
        ) ||
        "OpenAI media generation failed.",

      operation,

      mediaOptions,

      storyboard,

      generation,

      project:
        initialProject.project,

      plan:
        initialProject.plan,

      runtime:
        APP_CONFIG.runtimeId,

      runtimeVersion:
        APP_CONFIG.version,
    };
  }

  const generatedVideos =
    generation.videoAssets;

  const generatedVoices =
    generation.voiceAssets;

  const finalPlan =
    initialProject.plan;

  finalPlan.timeline =
    {
      ...finalPlan.timeline,

      visualTracks:
        finalPlan.timeline.visualTracks.map(
          (
            track,
          ) => {
            const sceneId =
              track.metadata
                ?.sceneId;

            const generated =
              generatedVideos.find(
                (
                  asset,
                ) =>
                  asset.metadata
                    ?.sceneId ===
                  sceneId,
              );

            if (!generated) {
              return track;
            }

            return {
              ...track,

              asset:
                generated,

              metadata: {
                ...track.metadata,

                pending:
                  false,

                provider:
                  "openai+ffmpeg",
              },
            };
          },
        ),

      voiceTracks:
        finalPlan.timeline.voiceTracks.map(
          (
            track,
          ) => {
            const sceneId =
              track.asset.metadata
                ?.sceneId;

            const generated =
              generatedVoices.find(
                (
                  asset,
                ) =>
                  asset.metadata
                    ?.sceneId ===
                  sceneId,
              );

            if (!generated) {
              return track;
            }

            return {
              ...track,

              asset:
                generated,
            };
          },
        ),

      musicTracks: [],
    };

  finalPlan.assets = [
    ...generation.assets,
  ];

  finalPlan.status =
    generatedVideos.length ===
      storyboard.scenes.length &&
    generatedVoices.length ===
      storyboard.scenes.filter(
        (
          scene,
        ) =>
          Boolean(
            scene.narration,
          ),
      ).length
      ? "ready_for_render"
      : "ready_for_generation";

  if (
    operation === "generate"
  ) {
    return {
      success:
        finalPlan.status ===
        "ready_for_render",

      code:
        finalPlan.status ===
        "ready_for_render"
          ? "C146_10_REAL_MEDIA_GENERATION_READY"
          : "C146_10_REAL_MEDIA_GENERATION_PARTIAL",

      content:
        finalPlan.status ===
        "ready_for_render"
          ? "AIOS generated the real scene videos and narration. The project is ready for final FFmpeg composition."
          : "AIOS generated media assets, but some assets are still incomplete.",

      operation,

      mediaOptions,

      storyboard,

      generation,

      project:
        initialProject.project,

      plan:
        finalPlan,

      runtime:
        APP_CONFIG.runtimeId,

      runtimeVersion:
        APP_CONFIG.version,
    };
  }

  if (
    finalPlan.status !==
    "ready_for_render"
  ) {
    return {
      success: false,

      code:
        "C146_10_RENDER_BLOCKED_INCOMPLETE_GENERATION",

      content:
        "AIOS did not render the video because the generated media assets are incomplete.",

      operation,

      mediaOptions,

      storyboard,

      generation,

      project:
        initialProject.project,

      plan:
        finalPlan,

      runtime:
        APP_CONFIG.runtimeId,

      runtimeVersion:
        APP_CONFIG.version,
    };
  }

  const render =
    await renderMedia(
      finalPlan.render.request,
      {
        outputDirectory:
          process.env.AIOS_MEDIA_OUTPUT_DIR ||
          undefined,

        outputFileName:
          `${finalPlan.projectId}.mp4`,

        overwrite:
          true,
      },
    );

  return {
    success:
      render.success,

    code:
      render.result.code,

    content:
      render.success
        ? "AIOS generated and rendered the video successfully."
        : render.result.error ||
          "AIOS video rendering failed.",

    operation,

    mediaOptions,

    storyboard,

    generation,

    project:
      initialProject.project,

    plan:
      finalPlan,

    render:
      render.result,

    outputPath:
      render.outputPath,

    runtime:
      APP_CONFIG.runtimeId,

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
          storyboard: true,

          openaiImage:
            Boolean(
              process.env.OPENAI_API_KEY,
            ),

          openaiVoice:
            Boolean(
              process.env.OPENAI_API_KEY,
            ),

          sceneVideo:
            Boolean(
              process.env.OPENAI_API_KEY,
            ),

          ffmpeg: true,

          oneClickVideo: true,

          directProviderVideo:
            false,
        },

        options: {
          languages:
            MEDIA_LANGUAGE_OPTIONS,

          durations:
            MEDIA_DURATION_OPTIONS,

          aspectRatios:
            MEDIA_ASPECT_RATIO_OPTIONS,

          defaults: {
            language:
              "zh-CN",

            durationSeconds:
              30,

            aspectRatio:
              "9:16",

            width:
              1080,

            height:
              1920,
          },
        },

        pipeline: [
          "prompt",

          "normalized-options",

          "storyboard",

          "openai-image",

          "openai-tts",

          "ffmpeg-scene-video",

          "timeline",

          "ffmpeg-final-render",
        ],

        identity: {
          userId:
            identity.userId,

          isolated: true,

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

  try {
    const contentType =
      request.headers.get(
        "content-type",
      ) || "";

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

    const locale =
      asString(
        request.headers.get(
          "x-aios-locale",
        ),
      ) ||
      "en";

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
          status:
            result.success
              ? 200
              : result.code ===
                  "MEDIA_PROMPT_REQUIRED"
                ? 400
                : 500,

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
