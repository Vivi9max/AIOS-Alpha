export type MediaLanguage =
  | "zh-CN"
  | "en-US"
  | "ja-JP";

export type MediaAspectRatio =
  | "9:16"
  | "16:9"
  | "1:1"
  | "4:5"
  | "4:3"
  | "3:2";

export type MediaDuration =
  | 30
  | 60
  | 90
  | 120;

export interface MediaVideoPreset {
  id: string;
  durationSeconds: MediaDuration;
  durationLabel: string;
  language: MediaLanguage;
  languageLabel: string;
  aspectRatio: MediaAspectRatio;
  aspectRatioLabel: string;
  orientation:
    | "portrait"
    | "landscape"
    | "square";
  width: number;
  height: number;
}

export const MEDIA_LANGUAGE_OPTIONS = [
  {
    value: "zh-CN",
    label: "\u4e2d\u6587",
  },
  {
    value: "en-US",
    label: "English",
  },
  {
    value: "ja-JP",
    label: "\u65e5\u672c\u8a9e",
  },
] as const;

export const MEDIA_DURATION_OPTIONS = [
  {
    value: 30,
    label: "30\u79d2",
  },
  {
    value: 60,
    label: "1\u5206\u949f",
  },
  {
    value: 90,
    label: "1\u5206\u002030\u79d2",
  },
  {
    value: 120,
    label: "2\u5206\u949f",
  },
] as const;

export const MEDIA_ASPECT_RATIO_OPTIONS = [
  {
    value: "9:16",
    label: "9:16 \u7ad6\u5c4f",
    orientation: "portrait",
    width: 1080,
    height: 1920,
  },
  {
    value: "16:9",
    label: "16:9 \u6a2a\u5c4f",
    orientation: "landscape",
    width: 1920,
    height: 1080,
  },
  {
    value: "1:1",
    label: "1:1 \u65b9\u5f62",
    orientation: "square",
    width: 1080,
    height: 1080,
  },
  {
    value: "4:5",
    label: "4:5 \u793e\u4ea4\u5a92\u4f53",
    orientation: "portrait",
    width: 1080,
    height: 1350,
  },
  {
    value: "4:3",
    label: "4:3 \u6807\u51c6",
    orientation: "landscape",
    width: 1440,
    height: 1080,
  },
  {
    value: "3:2",
    label: "3:2 \u6807\u51c6",
    orientation: "landscape",
    width: 1440,
    height: 960,
  },
] as const;

function normalizeLanguage(
  value: unknown,
): MediaLanguage {
  if (
    value === "en" ||
    value === "en-US" ||
    value === "en-GB"
  ) {
    return "en-US";
  }

  if (
    value === "ja" ||
    value === "ja-JP"
  ) {
    return "ja-JP";
  }

  return "zh-CN";
}

function normalizeDuration(
  value: unknown,
): MediaDuration {
  const numeric =
    typeof value === "number"
      ? value
      : Number(value);

  if (numeric === 60) {
    return 60;
  }

  if (numeric === 90) {
    return 90;
  }

  if (numeric === 120) {
    return 120;
  }

  return 30;
}

function normalizeAspectRatio(
  value: unknown,
): MediaAspectRatio {
  const ratio =
    typeof value === "string"
      ? value.trim()
      : "";

  switch (ratio) {
    case "16:9":
      return "16:9";

    case "1:1":
      return "1:1";

    case "4:5":
      return "4:5";

    case "4:3":
      return "4:3";

    case "3:2":
      return "3:2";

    case "9:16":
    default:
      return "9:16";
  }
}

export function getMediaDimensions(
  aspectRatio: MediaAspectRatio,
): {
  width: number;
  height: number;
} {
  const option =
    MEDIA_ASPECT_RATIO_OPTIONS.find(
      (item) =>
        item.value === aspectRatio,
    );

  if (option) {
    return {
      width: option.width,
      height: option.height,
    };
  }

  return {
    width: 1080,
    height: 1920,
  };
}

export function normalizeMediaOptions(
  input: {
    language?: unknown;
    aspectRatio?: unknown;
    durationSeconds?: unknown;
  },
) {
  const language =
    normalizeLanguage(
      input.language,
    );

  const aspectRatio =
    normalizeAspectRatio(
      input.aspectRatio,
    );

  const durationSeconds =
    normalizeDuration(
      input.durationSeconds,
    );

  const dimensions =
    getMediaDimensions(
      aspectRatio,
    );

  const ratioOption =
    MEDIA_ASPECT_RATIO_OPTIONS.find(
      (item) =>
        item.value === aspectRatio,
    );

  const languageOption =
    MEDIA_LANGUAGE_OPTIONS.find(
      (item) =>
        item.value === language,
    );

  const durationOption =
    MEDIA_DURATION_OPTIONS.find(
      (item) =>
        item.value === durationSeconds,
    );

  return {
    language,

    languageLabel:
      languageOption?.label ||
      language,

    aspectRatio,

    aspectRatioLabel:
      ratioOption?.label ||
      aspectRatio,

    orientation:
      ratioOption?.orientation ||
      "portrait",

    durationSeconds,

    durationLabel:
      durationOption?.label ||
      `${durationSeconds}\u79d2`,

    width:
      dimensions.width,

    height:
      dimensions.height,
  };
}

export function createMediaPreset(
  input: {
    language?: unknown;
    aspectRatio?: unknown;
    durationSeconds?: unknown;
  },
): MediaVideoPreset {
  const normalized =
    normalizeMediaOptions(
      input,
    );

  return {
    id:
      `video-${normalized.durationSeconds}-${normalized.aspectRatio}-${normalized.language}`,

    durationSeconds:
      normalized.durationSeconds,

    durationLabel:
      normalized.durationLabel,

    language:
      normalized.language,

    languageLabel:
      normalized.languageLabel,

    aspectRatio:
      normalized.aspectRatio,

    aspectRatioLabel:
      normalized.aspectRatioLabel,

    orientation:
      normalized.orientation,

    width:
      normalized.width,

    height:
      normalized.height,
  };
}

export function listMediaPresets():
  MediaVideoPreset[] {
  const presets:
    MediaVideoPreset[] = [];

  for (
    const language
    of MEDIA_LANGUAGE_OPTIONS
  ) {
    for (
      const duration
      of MEDIA_DURATION_OPTIONS
    ) {
      for (
        const aspectRatio
        of MEDIA_ASPECT_RATIO_OPTIONS
      ) {
        presets.push(
          createMediaPreset({
            language:
              language.value,
            durationSeconds:
              duration.value,
            aspectRatio:
              aspectRatio.value,
          }),
        );
      }
    }
  }

  return presets;
}
