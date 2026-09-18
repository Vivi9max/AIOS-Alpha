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
  createOpenAIVideoJob,
  retrieveOpenAIVideoJob,
  downloadOpenAIVideo,
  type OpenAIVideoModel,
  type OpenAIVideoSeconds,
} from "@/lib/runtime/media/openai-video";

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

function resolveSoraModel(
  value: unknown,
): OpenAIVideoModel {
  return value ===
    "sora-2-pro"
    ? "sora-2-pro"
    : "sora-2";
}

function resolveSoraSeconds(
  value: unknown,
): OpenAIVideoSeconds {
  if (
    value === "4" ||
    value === 4
  ) {
    return "4";
  }

  if (
    value === "8" ||
    value === 8
  ) {
    return "8";
  }

  return "12";
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

  const mediaOptions =
    normalizeMediaOptions({
      language:
        body.language,

      aspectRatio:
        body.aspectRatio,

      durationSeconds:
        body.durationSeconds,
    });

  const requestedLongDuration =
    mediaOptions.durationSeconds;

  /*
   * Sora Create Video currently supports
   * 4 / 8 / 12 second clips.
   *
   * AIOS therefore uses 12 seconds for
   * the direct provider path.
   *
   * 30 / 60 / 90 / 120 seconds remain
   * the responsibility of the AIOS
   * long-form composition pipeline.
   */
  const seconds =
    resolveSoraSeconds(
      body.videoSeconds,
    );

  const job =
    await createOpenAIVideoJob({
      prompt,

      model:
        resolveSoraModel(
          body.videoModel,
        ),

      seconds,

      aspectRatio:
        mediaOptions.aspectRatio,
    });

  return {
    success: true,

    code:
      "C146_11_SORA_TTV_JOB_CREATED",

    content:
      "AIOS created a real OpenAI text-to-video generation job.",

    provider:
      "openai",

    providerModel:
      job.model,

    providerJobId:
      job.id,

    providerStatus:
      job.status,

    providerProgress:
      job.progress,

    providerSeconds:
      job.seconds,

    requestedDurationSeconds:
      requestedLongDuration,

    directProviderDurationSupported:
      seconds,

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
    await retrieveOpenAIVideoJob(
      videoId,
    );

  return {
    success:
      job.status !==
      "failed",

    code:
      job.status ===
        "completed"
        ? "C146_11_SORA_TTV_COMPLETED"
        : job.status ===
            "failed"
          ? "C146_11_SORA_TTV_FAILED"
          : "C146_11_SORA_TTV_IN_PROGRESS",

    content:
      job.status ===
        "completed"
        ? "OpenAI text-to-video generation completed."
        : job.status ===
            "failed"
          ? job.error?.message ||
            "OpenAI text-to-video generation failed."
          : "OpenAI text-to-video generation is still in progress.",

    provider:
      "openai",

    providerJobId:
      job.id,

    providerStatus:
      job.status,

    providerProgress:
      job.progress,

    job,

    contentUrl:
      job.status ===
      "completed"
        ? `/api/media?videoId=${encodeURIComponent(
            job.id,
          )}&content=1`
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
    return {
      success: true,

      code:
        "C146_11_MEDIA_PLAN_READY",

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
          ? "C146_11_REAL_MEDIA_GENERATION_READY"
          : "C146_11_REAL_MEDIA_GENERATION_PARTIAL",

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
        "C146_11_RENDER_BLOCKED_INCOMPLETE_GENERATION",

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

  if (
    videoId &&
    content === "1"
  ) {
    try {
      const mediaResponse =
        await downloadOpenAIVideo(
          videoId,
        );

      const body =
        await mediaResponse.arrayBuffer();

      return new NextResponse(
        body,
        {
          status:
            mediaResponse.status ||
            200,

          headers: {
            "Cache-Control":
              "private, max-age=300",

            "Content-Type":
              mediaResponse.headers.get(
                "content-type",
              ) ||
              "video/mp4",

            "Content-Disposition":
              `inline; filename="aios-${videoId}.mp4"`,
          },
        },
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
      const job =
        await retrieveOpenAIVideoJob(
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
                ? "C146_11_SORA_TTV_COMPLETED"
                : job.status ===
                    "failed"
                  ? "C146_11_SORA_TTV_FAILED"
                  : "C146_11_SORA_TTV_IN_PROGRESS",

            provider:
              "openai",

            providerJobId:
              job.id,

            providerStatus:
              job.status,

            providerProgress:
              job.progress,

            job,

            contentUrl:
              job.status ===
              "completed"
                ? `/api/media?videoId=${encodeURIComponent(
                    job.id,
                  )}&content=1`
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
            Boolean(
              process.env.OPENAI_API_KEY,
            ),

          directProvider:
            "openai-sora",
        },

        directVideo: {
          provider:
            "openai",

          models: [
            "sora-2",
            "sora-2-pro",
          ],

          createSeconds: [
            4,
            8,
            12,
          ],

          async:
            true,

          statusPolling:
            true,

          download:
            true,
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

        directProviderPipeline: [
          "chat-prompt",

          "openai-sora-create",

          "async-video-job",

          "status-polling",

          "video-content-proxy",
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
              "MEDIA_VIDEO_ID_REQUIRED"
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
