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
  createGoogleVideoJob,
  retrieveGoogleVideoJob,
  downloadGoogleVideo,
  isGoogleVideoConfigured,
  type GoogleVideoModel,
  type GoogleVideoResolution,
} from "@/lib/runtime/media/google-video";

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

export const maxDuration =
  300;

type MediaOperation =
  | "plan"
  | "generate"
  | "render"
  | "video-create"
  | "video-status";

type ComposerResolution =
  | "720p"
  | "1080p"
  | "4k";

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

  videoId?: unknown;

  videoModel?: unknown;

  videoSeconds?: unknown;

  videoProvider?: unknown;

  videoResolution?: unknown;

  resolution?: unknown;
}

function jsonResponse(
  body: unknown,
  status = 200,
): NextResponse {
  return NextResponse.json(
    body,
    {
      status,
      headers: {
        "Cache-Control":
          "no-store",
        "Content-Type":
          "application/json; charset=utf-8",
      },
    },
  );
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

  return (
    normalized ||
    undefined
  );
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
    value === "render" ||
    value === "video-create" ||
    value === "video-status"
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

function resolveComposerResolution(
  value: unknown,
): ComposerResolution {
  if (
    value === "4k" ||
    value === "4K"
  ) {
    return "4k";
  }

  if (
    value === "1080p"
  ) {
    return "1080p";
  }

  return "720p";
}

function getResolutionDimensions(
  resolution: ComposerResolution,
  aspectRatio: string,
) {
  const portrait =
    aspectRatio === "9:16" ||
    aspectRatio === "4:5";

  const square =
    aspectRatio === "1:1";

  if (resolution === "4k") {
    if (portrait) {
      if (aspectRatio === "4:5") {
        return {
          width: 2160,
          height: 2700,
        };
      }

      return {
        width: 2160,
        height: 3840,
      };
    }

    if (square) {
      return {
        width: 2160,
        height: 2160,
      };
    }

    if (aspectRatio === "4:3") {
      return {
        width: 3840,
        height: 2880,
      };
    }

    if (aspectRatio === "3:2") {
      return {
        width: 3840,
        height: 2560,
      };
    }

    return {
      width: 3840,
      height: 2160,
    };
  }

  if (
    resolution === "1080p"
  ) {
    if (portrait) {
      if (aspectRatio === "4:5") {
        return {
          width: 1080,
          height: 1350,
        };
      }

      return {
        width: 1080,
        height: 1920,
      };
    }

    if (square) {
      return {
        width: 1080,
        height: 1080,
      };
    }

    if (aspectRatio === "4:3") {
      return {
        width: 1440,
        height: 1080,
      };
    }

    if (aspectRatio === "3:2") {
      return {
        width: 1620,
        height: 1080,
      };
    }

    return {
      width: 1920,
      height: 1080,
    };
  }

  if (portrait) {
    if (aspectRatio === "4:5") {
      return {
        width: 720,
        height: 900,
      };
    }

    return {
      width: 720,
      height: 1280,
    };
  }

  if (square) {
    return {
      width: 720,
      height: 720,
    };
  }

  if (aspectRatio === "4:3") {
    return {
      width: 960,
      height: 720,
    };
  }

  if (aspectRatio === "3:2") {
    return {
      width: 1080,
      height: 720,
    };
  }

  return {
    width: 1280,
    height: 720,
  };
}

function buildCompositionOptions(
  body: MediaRequestBody,
  mediaOptions: ReturnType<
    typeof normalizeMediaOptions
  >,
): VideoCompositionOptions {
  const resolution =
    resolveComposerResolution(
      body.resolution ||
        body.videoResolution,
    );

  const dimensions =
    getResolutionDimensions(
      resolution,
      mediaOptions.aspectRatio,
    );

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
      dimensions.width,

    height:
      dimensions.height,

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

function resolveGoogleVideoModel(
  value: unknown,
): GoogleVideoModel {
  if (
    value ===
    "veo-3.1-fast-generate-preview"
  ) {
    return value;
  }

  if (
    value ===
    "veo-3.1-lite-generate-preview"
  ) {
    return value;
  }

  return (
    process.env.GOOGLE_VIDEO_MODEL ===
      "veo-3.1-fast-generate-preview" ||
    process.env.GOOGLE_VIDEO_MODEL ===
      "veo-3.1-lite-generate-preview"
      ? process.env
          .GOOGLE_VIDEO_MODEL
      : "veo-3.1-generate-preview"
  ) as GoogleVideoModel;
}

function resolveGoogleResolution(
  value: unknown,
): GoogleVideoResolution {
  if (
    value === "4k"
  ) {
    return "4k";
  }

  if (
    value === "1080p"
  ) {
    return "1080p";
  }

  return "720p";
}

async function executeDirectVideoCreate(
  body: MediaRequestBody,
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

  if (
    !isGoogleVideoConfigured()
  ) {
    return {
      success: false,

      code:
        "GEMINI_API_KEY_MISSING",

      content:
        locale === "zh-CN"
          ? "尚未配置 GEMINI_API_KEY。"
          : locale === "ja"
            ? "GEMINI_API_KEY が設定されていません。"
            : "GEMINI_API_KEY is not configured.",
    };
  }

  const mediaOptions =
    normalizeMediaOptions({
      language:
        body.language,

      aspectRatio:
        body.aspectRatio,

      durationSeconds:
        body.durationSeconds,
    });

  const model =
    resolveGoogleVideoModel(
      body.videoModel,
    );

  const resolution =
    resolveGoogleResolution(
      body.videoResolution ||
        body.resolution,
    );

  if (
    resolution === "4k" &&
    model ===
      "veo-3.1-lite-generate-preview"
  ) {
    return {
      success: false,

      code:
        "VEO_4K_NOT_SUPPORTED_BY_MODEL",

      content:
        locale === "zh-CN"
          ? "当前 Veo Lite 模型不支持 4K，请选择 Veo 3.1 或 Veo 3.1 Fast。"
          : locale === "ja"
            ? "現在の Veo Lite モデルは 4K に対応していません。Veo 3.1 または Veo 3.1 Fast を選択してください。"
            : "The current Veo Lite model does not support 4K. Choose Veo 3.1 or Veo 3.1 Fast.",
    };
  }

  const job =
    await createGoogleVideoJob({
      prompt,

      model,

      aspectRatio:
        mediaOptions.aspectRatio,

      resolution,

      durationSeconds:
        8,
    });

  return {
    success: true,

    code:
      "C146_12_VEO_TTV_JOB_CREATED",

    content:
      "AIOS created a real Google Veo text-to-video generation job.",

    provider:
      "google",

    providerName:
      "Google Veo",

    providerModel:
      job.model,

    providerJobId:
      job.operationName,

    providerStatus:
      job.status,

    providerProgress:
      job.progress,

    providerSeconds:
      8,

    requestedDurationSeconds:
      mediaOptions.durationSeconds,

    directProviderDurationSupported:
      8,

    resolution,

    mediaOptions,

    job,
  };
}

async function executeDirectVideoStatus(
  body: MediaRequestBody,
) {
  const videoId =
    asString(
      body.videoId,
    );

  if (!videoId) {
    return {
      success: false,

      code:
        "MEDIA_VIDEO_ID_REQUIRED",

      content:
        "Video ID is required.",
    };
  }

  const job =
    await retrieveGoogleVideoJob(
      videoId,
    );

  return {
    success:
      job.status !==
      "failed",

    code:
      job.status ===
        "completed"
        ? "C146_12_VEO_TTV_COMPLETED"
        : job.status ===
            "failed"
          ? "C146_12_VEO_TTV_FAILED"
          : "C146_12_VEO_TTV_IN_PROGRESS",

    content:
      job.status ===
        "completed"
        ? "Google Veo video generation completed."
        : job.status ===
            "failed"
          ? job.error?.message ||
            "Google Veo video generation failed."
          : "Google Veo video generation is still in progress.",

    provider:
      "google",

    providerName:
      "Google Veo",

    providerJobId:
      job.operationName,

    providerStatus:
      job.status,

    providerProgress:
      job.progress,

    job,

    contentUrl:
      job.status ===
      "completed"
        ? `/api/media?videoId=${encodeURIComponent(
            job.operationName,
          )}&content=1&provider=google`
        : undefined,
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

  if (
    operation ===
    "video-create"
  ) {
    return executeDirectVideoCreate(
      body,
      locale,
    );
  }

  if (
    operation ===
    "video-status"
  ) {
    return executeDirectVideoStatus(
      body,
    );
  }

  const assets =
    normalizeAssets(
      body.assets,
    );

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
    operation ===
    "plan"
  ) {
    const resolution =
      resolveComposerResolution(
        body.resolution ||
          body.videoResolution,
      );

    return {
      success: true,

      code:
        "C146_12_MEDIA_PLAN_READY",

      content:
        "AIOS Media Runtime prepared the video generation plan.",

      operation,

      mediaOptions,

      resolution,

      resolutionDimensions:
        {
          width:
            compositionOptions.width,

          height:
            compositionOptions.height,
        },

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

      runtimeRelease:
        APP_CONFIG.release,
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
    operation ===
    "generate"
  ) {
    return {
      success:
        finalPlan.status ===
        "ready_for_render",

      code:
        finalPlan.status ===
        "ready_for_render"
          ? "C146_12_REAL_MEDIA_GENERATION_READY"
          : "C146_12_REAL_MEDIA_GENERATION_PARTIAL",

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

      runtimeRelease:
        APP_CONFIG.release,
    };
  }

  if (
    finalPlan.status !==
    "ready_for_render"
  ) {
    return {
      success: false,

      code:
        "C146_12_RENDER_BLOCKED_INCOMPLETE_GENERATION",

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

      runtimeRelease:
        APP_CONFIG.release,
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

  const videoId =
    request.nextUrl.searchParams.get(
      "videoId",
    );

  const content =
    request.nextUrl.searchParams.get(
      "content",
    );

  const provider =
    request.nextUrl.searchParams.get(
      "provider",
    ) || "google";

  if (
    videoId &&
    content === "1"
  ) {
    try {
      if (
        provider === "google"
      ) {
        const job =
          await retrieveGoogleVideoJob(
            videoId,
          );

        if (
          job.status !==
            "completed" ||
          !job.videoUri
        ) {
          return jsonResponse(
            {
              success: false,

              code:
                "MEDIA_VIDEO_NOT_READY",

              content:
                "The Google Veo video is not ready.",

              providerStatus:
                job.status,
            },
            409,
          );
        }

        const mediaResponse =
          await downloadGoogleVideo(
            job.videoUri,
          );

        const body =
          await mediaResponse.arrayBuffer();

        return new NextResponse(
          body,
          {
            status: 200,

            headers: {
              "Cache-Control":
                "private, max-age=300",

              "Content-Type":
                mediaResponse.headers.get(
                  "content-type",
                ) ||
                "video/mp4",

              "Content-Disposition":
                `inline; filename="aios-${encodeURIComponent(
                  videoId.replace(
                    /[^a-zA-Z0-9_-]/g,
                    "-",
                  ),
                )}.mp4"`,
            },
          },
        );
      }

      return jsonResponse(
        {
          success: false,

          code:
            "MEDIA_PROVIDER_UNSUPPORTED",

          content:
            "Unsupported video provider.",
        },
        400,
      );
    } catch (error) {
      return jsonResponse(
        {
          success: false,

          code:
            "MEDIA_VIDEO_CONTENT_FAILED",

          content:
            error instanceof Error
              ? error.message
              : "Unable to download generated video.",

          userId:
            identity.userId,
        },
        500,
      );
    }
  }

  if (videoId) {
    try {
      if (
        provider === "google"
      ) {
        const job =
          await retrieveGoogleVideoJob(
            videoId,
          );

        return applyIdentityCookie(
          jsonResponse(
            {
              success:
                job.status !==
                "failed",

              code:
                job.status ===
                  "completed"
                  ? "C146_12_VEO_TTV_COMPLETED"
                  : job.status ===
                      "failed"
                    ? "C146_12_VEO_TTV_FAILED"
                    : "C146_12_VEO_TTV_IN_PROGRESS",

              content:
                job.status ===
                  "completed"
                  ? "Google Veo video generation completed."
                  : job.status ===
                      "failed"
                    ? job.error?.message ||
                      "Google Veo video generation failed."
                    : "Google Veo video generation is still in progress.",

              provider:
                "google",

              providerName:
                "Google Veo",

              providerJobId:
                job.operationName,

              providerStatus:
                job.status,

              providerProgress:
                job.progress,

              job,

              contentUrl:
                job.status ===
                "completed"
                  ? `/api/media?videoId=${encodeURIComponent(
                      job.operationName,
                    )}&content=1&provider=google`
                  : undefined,

              identity: {
                userId:
                  identity.userId,

                isolated:
                  true,
              },
            },
            200,
          ),
          identity.userId,
        );
      }

      return applyIdentityCookie(
        jsonResponse(
          {
            success: false,

            code:
              "MEDIA_PROVIDER_UNSUPPORTED",

            content:
              "Unsupported video provider.",

            userId:
              identity.userId,
          },
          400,
        ),
        identity.userId,
      );
    } catch (error) {
      return applyIdentityCookie(
        jsonResponse(
          {
            success: false,

            code:
              "MEDIA_VIDEO_STATUS_FAILED",

            content:
              error instanceof Error
                ? error.message
                : "Unable to retrieve video status.",

            userId:
              identity.userId,
          },
          500,
        ),
        identity.userId,
      );
    }
  }

  const googleConfigured =
    isGoogleVideoConfigured();

  const response =
    jsonResponse(
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

          ffmpeg:
            true,

          oneClickVideo:
            true,

          directProviderVideo:
            googleConfigured,

          directProvider:
            "google-veo",
        },

        directVideo: {
          provider:
            "google",

          providerName:
            "Google Veo 3.1",

          models: [
            "veo-3.1-generate-preview",
            "veo-3.1-fast-generate-preview",
            "veo-3.1-lite-generate-preview",
          ],

          createSeconds: [
            8,
          ],

          resolutions: [
            "720p",
            "1080p",
            "4k",
          ],

          aspectRatios: [
            "16:9",
            "9:16",
          ],

          nativeAudio:
            true,

          async:
            true,

          statusPolling:
            true,

          download:
            true,
        },

        composer: {
          resolutions: [
            {
              value:
                "720p",
              label:
                "720p",
            },
            {
              value:
                "1080p",
              label:
                "1080p",
            },
            {
              value:
                "4k",
              label:
                "4K",
            },
          ],

          durations:
            MEDIA_DURATION_OPTIONS,

          aspectRatios:
            MEDIA_ASPECT_RATIO_OPTIONS,
        },

        options: {
          languages:
            MEDIA_LANGUAGE_OPTIONS,

          durations:
            MEDIA_DURATION_OPTIONS,

          aspectRatios:
            MEDIA_ASPECT_RATIO_OPTIONS,

          resolutions: [
            {
              value:
                "720p",
              label:
                "720p",
            },
            {
              value:
                "1080p",
              label:
                "1080p",
            },
            {
              value:
                "4k",
              label:
                "4K",
            },
          ],

          defaults: {
            language:
              "zh-CN",

            durationSeconds:
              30,

            aspectRatio:
              "9:16",

            resolution:
              "1080p",

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

        directProviderPipeline: [
          "chat-prompt",
          "google-veo-create",
          "async-video-operation",
          "status-polling",
          "video-content-proxy",
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
      200,
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
      return applyIdentityCookie(
        jsonResponse(
          {
            success: false,

            code:
              "MEDIA_INVALID_CONTENT_TYPE",

            content:
              "Content-Type must be application/json.",

            userId:
              identity.userId,
          },
          415,
        ),
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

    return applyIdentityCookie(
      jsonResponse(
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
        result.success
          ? 200
          : result.code ===
              "MEDIA_PROMPT_REQUIRED" ||
            result.code ===
              "MEDIA_VIDEO_ID_REQUIRED" ||
            result.code ===
              "GEMINI_API_KEY_MISSING" ||
            result.code ===
              "VEO_4K_NOT_SUPPORTED_BY_MODEL"
            ? 400
            : 500,
      ),
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

    return applyIdentityCookie(
      jsonResponse(
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
        500,
      ),
      identity.userId,
    );
  }
}
