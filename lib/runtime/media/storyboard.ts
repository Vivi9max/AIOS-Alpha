import type {
  MediaAsset,
  MediaCapabilityContext,
  Storyboard,
  StoryboardScene,
} from "./types";

export interface StoryboardGenerationOptions {
  title?: string;

  description?: string;

  language?: string;

  aspectRatio?: string;

  targetPlatform?: string;

  durationSeconds?: number;

  sceneCount?: number;

  style?: string;

  includeNarration?: boolean;

  includeImagePrompt?: boolean;

  includeVideoPrompt?: boolean;

  inputAssets?: MediaAsset[];

  metadata?: Record<
    string,
    unknown
  >;
}

export interface StoryboardGenerationResult {
  success: boolean;

  storyboard?: Storyboard;

  requestId: string;

  code: string;

  error?: string;

  createdAt: number;
}

const DEFAULT_DURATION_SECONDS =
  30;

const DEFAULT_SCENE_COUNT =
  6;

const MIN_SCENE_DURATION =
  2;

const MAX_SCENE_DURATION =
  12;

function normalizeText(
  value: string
): string {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.min(
    max,
    Math.max(
      min,
      value
    )
  );
}

function inferSceneCount(
  prompt: string,
  requested?: number,
  durationSeconds?: number
): number {
  if (
    requested &&
    Number.isFinite(requested)
  ) {
    return clamp(
      Math.round(requested),
      1,
      20
    );
  }

  const duration =
    durationSeconds ??
    DEFAULT_DURATION_SECONDS;

  if (
    duration <= 15
  ) {
    return 4;
  }

  if (
    duration <= 30
  ) {
    return 6;
  }

  if (
    duration <= 60
  ) {
    return 8;
  }

  if (
    duration <= 120
  ) {
    return 10;
  }

  return DEFAULT_SCENE_COUNT;
}

function distributeDuration(
  totalDuration: number,
  sceneCount: number
): number[] {
  const safeTotal =
    Math.max(
      sceneCount *
        MIN_SCENE_DURATION,
      totalDuration
    );

  const base =
    safeTotal /
    sceneCount;

  return Array.from(
    {
      length:
        sceneCount,
    },
    (_, index) => {
      const remaining =
        safeTotal -
        base *
          index;

      const remainingScenes =
        sceneCount -
        index;

      const duration =
        remaining /
        remainingScenes;

      return Number(
        clamp(
          duration,
          MIN_SCENE_DURATION,
          MAX_SCENE_DURATION
        ).toFixed(2)
      );
    }
  );
}

function splitPromptIntoConcepts(
  prompt: string
): string[] {
  const normalized =
    normalizeText(
      prompt
    );

  if (
    normalized.length === 0
  ) {
    return [];
  }

  const sentences =
    normalized
      .split(
        /[。！？!?；;\n]+/
      )
      .map(
        normalizeText
      )
      .filter(
        Boolean
      );

  if (
    sentences.length > 1
  ) {
    return sentences;
  }

  const clauses =
    normalized
      .split(
        /[，,、]+/
      )
      .map(
        normalizeText
      )
      .filter(
        Boolean
      );

  if (
    clauses.length > 1
  ) {
    return clauses;
  }

  return [
    normalized,
  ];
}

function buildSceneDescription(
  prompt: string,
  index: number,
  sceneCount: number,
  concepts: string[]
): string {
  const concept =
    concepts[
      index %
        Math.max(
          concepts.length,
          1
        )
    ] ??
    prompt;

  const roles = [
    "建立场景与主题",
    "展示核心问题或冲突",
    "展开主要信息",
    "展示关键细节",
    "形成情绪或价值转折",
    "完成总结与行动引导",
  ];

  const role =
    roles[
      index %
        roles.length
    ];

  return [
    `第 ${index + 1} 个场景：${role}。`,
    `核心内容：${concept}。`,
    `该场景服务于整支视频的第 ${index + 1}/${sceneCount} 段内容。`,
  ].join(" ");
}

function buildNarration(
  description: string,
  language: string
): string {
  if (
    language
      .toLowerCase()
      .startsWith("ja")
  ) {
    return `ここでは${description}`;
  }

  if (
    language
      .toLowerCase()
      .startsWith("en")
  ) {
    return `In this scene, ${description}`;
  }

  return description;
}

function buildVisualPrompt(
  prompt: string,
  description: string,
  style?: string,
  aspectRatio?: string
): string {
  const styleText =
    style
      ? `风格：${style}。`
      : "风格：自然、清晰、适合商业内容。";

  const ratioText =
    aspectRatio
      ? `画幅：${aspectRatio}。`
      : "画幅：适合短视频平台。";

  return [
    `主题：${prompt}`,
    `场景：${description}`,
    styleText,
    ratioText,
    "主体明确，视觉层次清晰，避免无关元素。",
  ].join(" ");
}

function buildImagePrompt(
  visualPrompt: string
): string {
  return [
    visualPrompt,
    "高质量静态画面。",
    "构图稳定。",
    "主体突出。",
  ].join(" ");
}

function buildVideoPrompt(
  visualPrompt: string
): string {
  return [
    visualPrompt,
    "具有自然镜头运动。",
    "主体动作连贯。",
    "保持角色、环境与视觉风格一致。",
  ].join(" ");
}

function buildTransition(
  index: number,
  sceneCount: number
): string {
  if (
    index === 0
  ) {
    return "fade-in";
  }

  if (
    index ===
    sceneCount - 1
  ) {
    return "fade-out";
  }

  const transitions = [
    "cut",
    "crossfade",
    "dissolve",
  ];

  return transitions[
    index %
      transitions.length
  ];
}

function buildSceneTitle(
  index: number
): string {
  const titles = [
    "开场",
    "问题",
    "展开",
    "核心",
    "转折",
    "总结",
    "行动",
    "结尾",
  ];

  return (
    titles[
      index %
        titles.length
    ] ??
    `场景 ${index + 1}`
  );
}

function createScenes(
  prompt: string,
  options: StoryboardGenerationOptions
): StoryboardScene[] {
  const sceneCount =
    inferSceneCount(
      prompt,
      options.sceneCount,
      options.durationSeconds
    );

  const duration =
    options.durationSeconds ??
    DEFAULT_DURATION_SECONDS;

  const durations =
    distributeDuration(
      duration,
      sceneCount
    );

  const concepts =
    splitPromptIntoConcepts(
      prompt
    );

  const language =
    options.language ??
    "zh-CN";

  return Array.from(
    {
      length:
        sceneCount,
    },
    (_, index) => {
      const sceneDuration =
        durations[index] ??
        MIN_SCENE_DURATION;

      const description =
        buildSceneDescription(
          prompt,
          index,
          sceneCount,
          concepts
        );

      const visualPrompt =
        buildVisualPrompt(
          prompt,
          description,
          options.style,
          options.aspectRatio
        );

      const scene: StoryboardScene =
        {
          id:
            `scene-${String(
              index + 1
            ).padStart(
              3,
              "0"
            )}`,

          index:
            index + 1,

          title:
            buildSceneTitle(
              index
            ),

          description,

          narration:
            options.includeNarration ===
              false
              ? undefined
              : buildNarration(
                  description,
                  language
                ),

          visualPrompt,

          imagePrompt:
            options.includeImagePrompt ===
              false
              ? undefined
              : buildImagePrompt(
                  visualPrompt
                ),

          videoPrompt:
            options.includeVideoPrompt ===
              false
              ? undefined
              : buildVideoPrompt(
                  visualPrompt
                ),

          durationSeconds:
            sceneDuration,

          transition:
            buildTransition(
              index,
              sceneCount
            ),

          assets:
            options.inputAssets ??
            [],

          metadata: {
            generatedBy:
              "aios-storyboard-engine",
            language,
            sceneRole:
              description,
          },
        };

      return scene;
    }
  );
}

function normalizeSceneDurations(
  scenes: StoryboardScene[],
  totalDuration: number
): StoryboardScene[] {
  const actualTotal =
    scenes.reduce(
      (
        sum,
        scene
      ) =>
        sum +
        scene.durationSeconds,
      0
    );

  if (
    actualTotal <= 0
  ) {
    return scenes;
  }

  const ratio =
    totalDuration /
    actualTotal;

  let elapsed =
    0;

  return scenes.map(
    (
      scene,
      index
    ) => {
      const isLast =
        index ===
        scenes.length - 1;

      const duration =
        isLast
          ? Math.max(
              MIN_SCENE_DURATION,
              Number(
                (
                  totalDuration -
                  elapsed
                ).toFixed(2)
              )
            )
          : Number(
              Math.max(
                MIN_SCENE_DURATION,
                scene.durationSeconds *
                  ratio
              ).toFixed(2)
            );

      elapsed +=
        duration;

      return {
        ...scene,
        durationSeconds:
          duration,
      };
    }
  );
}

export function generateStoryboard(
  prompt: string,
  options: StoryboardGenerationOptions = {},
  context?: Partial<MediaCapabilityContext>
): StoryboardGenerationResult {
  const createdAt =
    Date.now();

  const requestId =
    context?.requestId ??
    `storyboard-${createdAt}`;

  const normalized =
    normalizeText(
      prompt
    );

  if (
    normalized.length === 0
  ) {
    return {
      success: false,
      requestId,
      code:
        "MEDIA_STORYBOARD_PROMPT_REQUIRED",
      error:
        "Storyboard generation requires a non-empty prompt.",
      createdAt,
    };
  }

  const duration =
    clamp(
      Math.round(
        options.durationSeconds ??
          DEFAULT_DURATION_SECONDS
      ),
      4,
      3600
    );

  const scenes =
    createScenes(
      normalized,
      {
        ...options,
        durationSeconds:
          duration,
      }
    );

  const normalizedScenes =
    normalizeSceneDurations(
      scenes,
      duration
    );

  const storyboardId =
    `storyboard-${createdAt}`;

  const storyboard: Storyboard =
    {
      id:
        storyboardId,

      title:
        options.title ??
        "AIOS Generated Storyboard",

      description:
        options.description ??
        normalized,

      totalDurationSeconds:
        duration,

      scenes:
        normalizedScenes,

      language:
        options.language ??
        "zh-CN",

      aspectRatio:
        options.aspectRatio ??
        "9:16",

      targetPlatform:
        options.targetPlatform ??
        "short-video",

      createdAt,

      updatedAt:
        createdAt,
    };

  return {
    success: true,

    storyboard,

    requestId,

    code:
      "MEDIA_STORYBOARD_GENERATED",

    createdAt,
  };
}

export function generateStoryboardFromContext(
  prompt: string,
  context: MediaCapabilityContext,
  options: StoryboardGenerationOptions = {}
): StoryboardGenerationResult {
  return generateStoryboard(
    prompt,
    {
      ...options,
      inputAssets:
        options.inputAssets ??
        context.inputAssets,
      language:
        options.language ??
        context.locale,
    },
    context
  );
}

export function storyboardToScenePrompts(
  storyboard: Storyboard
): Array<{
  sceneId: string;
  index: number;
  durationSeconds: number;
  imagePrompt?: string;
  videoPrompt?: string;
  narration?: string;
}> {
  return storyboard.scenes.map(
    (scene) => ({
      sceneId:
        scene.id,

      index:
        scene.index,

      durationSeconds:
        scene.durationSeconds,

      imagePrompt:
        scene.imagePrompt,

      videoPrompt:
        scene.videoPrompt,

      narration:
        scene.narration,
    })
  );
}

export function validateStoryboard(
  storyboard: Storyboard
): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (
    !storyboard.id
  ) {
    errors.push(
      "Storyboard id is required."
    );
  }

  if (
    !storyboard.title
  ) {
    errors.push(
      "Storyboard title is required."
    );
  }

  if (
    !Array.isArray(
      storyboard.scenes
    ) ||
    storyboard.scenes.length === 0
  ) {
    errors.push(
      "Storyboard must contain at least one scene."
    );
  }

  if (
    storyboard.totalDurationSeconds <=
    0
  ) {
    errors.push(
      "Storyboard duration must be greater than zero."
    );
  }

  storyboard.scenes.forEach(
    (
      scene,
      index
    ) => {
      if (
        scene.index !==
        index + 1
      ) {
        errors.push(
          `Scene index mismatch at position ${index + 1}.`
        );
      }

      if (
        !scene.description
      ) {
        errors.push(
          `Scene ${index + 1} description is required.`
        );
      }

      if (
        scene.durationSeconds <=
        0
      ) {
        errors.push(
          `Scene ${index + 1} duration must be greater than zero.`
        );
      }
    }
  );

  const durationTotal =
    storyboard.scenes.reduce(
      (
        sum,
        scene
      ) =>
        sum +
        scene.durationSeconds,
      0
    );

  if (
    Math.abs(
      durationTotal -
        storyboard.totalDurationSeconds
    ) > 0.1
  ) {
    errors.push(
      "Scene durations do not match storyboard total duration."
    );
  }

  return {
    valid:
      errors.length ===
      0,

    errors,
  };
}
