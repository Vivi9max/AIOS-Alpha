import type {
  Locale,
} from "@/lib/i18n";

export type TimeCapabilitySource =
  | "explicit-timezone"
  | "system-timezone"
  | "utc";

export interface TimeCapabilityResult {
  detected: boolean;
  success: boolean;
  source: TimeCapabilitySource;
  timeZone: string;
  locale: Locale;
  timestamp: number;
  isoTimestamp: string;
  formattedDateTime: string;
  formattedTime: string;
  formattedDate: string;
  timeZoneName: string;
  utcOffset: string;
  content: string;
  code:
    | "TIME_CAPABILITY_COMPLETED"
    | "TIME_CAPABILITY_TIMEZONE_INVALID"
    | "TIME_CAPABILITY_FAILED";
}

const TIME_REQUEST_PATTERNS: RegExp[] = [
  /现在几点/,
  /现在时间/,
  /当前时间/,
  /当前几点/,
  /现在的时间/,
  /本地时间/,
  /当地时间/,
  /北京时间/,
  /东京时间/,
  /香港时间/,
  /深圳时间/,
  /上海时间/,
  /澳门时间/,
  /纽约时间/,
  /伦敦时间/,
  /洛杉矶时间/,
  /time now/i,
  /current time/i,
  /what time is it/i,
  /what's the time/i,
  /whats the time/i,
  /local time/i,
  /time in /i,
  /current date and time/i,
  /what date is it/i,
  /今何時/,
  /現在何時/,
  /現在の時間/,
  /現地時間/,
  /東京の時間/,
  /香港の時間/,
];

const TIMEZONE_ALIASES: Record<
  string,
  string
> = {
  "北京时间": "Asia/Shanghai",
  "中国时间": "Asia/Shanghai",
  "中国标准时间": "Asia/Shanghai",
  "上海时间": "Asia/Shanghai",
  "深圳时间": "Asia/Shanghai",
  "香港时间": "Asia/Hong_Kong",
  "香港": "Asia/Hong_Kong",
  "澳门时间": "Asia/Macau",
  "澳门": "Asia/Macau",
  "东京时间": "Asia/Tokyo",
  "日本时间": "Asia/Tokyo",
  "东京": "Asia/Tokyo",
  "纽约时间": "America/New_York",
  "纽约": "America/New_York",
  "美国东部时间": "America/New_York",
  "洛杉矶时间": "America/Los_Angeles",
  "洛杉矶": "America/Los_Angeles",
  "美国西部时间": "America/Los_Angeles",
  "伦敦时间": "Europe/London",
  "伦敦": "Europe/London",
  "英国时间": "Europe/London",
  "巴黎时间": "Europe/Paris",
  "巴黎": "Europe/Paris",
  "新加坡时间": "Asia/Singapore",
  "新加坡": "Asia/Singapore",
  "首尔时间": "Asia/Seoul",
  "韩国时间": "Asia/Seoul",
  "首尔": "Asia/Seoul",
  "悉尼时间": "Australia/Sydney",
  "悉尼": "Australia/Sydney",
  "台北时间": "Asia/Taipei",
  "台北": "Asia/Taipei",
  "taipei": "Asia/Taipei",
  "tokyo": "Asia/Tokyo",
  "japan": "Asia/Tokyo",
  "hong kong": "Asia/Hong_Kong",
  "shenzhen": "Asia/Shanghai",
  "shanghai": "Asia/Shanghai",
  "beijing": "Asia/Shanghai",
  "china": "Asia/Shanghai",
  "new york": "America/New_York",
  "los angeles": "America/Los_Angeles",
  "london": "Europe/London",
  "paris": "Europe/Paris",
  "singapore": "Asia/Singapore",
  "seoul": "Asia/Seoul",
  "sydney": "Australia/Sydney",
};

function normalizePrompt(
  prompt: string,
): string {
  return prompt
    .replace(/\s+/g, " ")
    .trim();
}

export function isTimeCapabilityRequest(
  prompt: string,
): boolean {
  const normalized =
    normalizePrompt(prompt);

  if (!normalized) {
    return false;
  }

  return TIME_REQUEST_PATTERNS.some(
    (pattern) =>
      pattern.test(normalized),
  );
}

function resolveExplicitTimeZone(
  prompt: string,
): string | undefined {
  const normalized =
    normalizePrompt(prompt)
      .toLowerCase();

  const aliases =
    Object.entries(
      TIMEZONE_ALIASES,
    ).sort(
      (
        left,
        right,
      ) =>
        right[0].length -
        left[0].length,
    );

  for (const [
    alias,
    timeZone,
  ] of aliases) {
    if (
      normalized.includes(
        alias.toLowerCase(),
      )
    ) {
      return timeZone;
    }
  }

  const ianaMatch =
    normalized.match(
      /\b(?:africa|america|antarctica|arctic|asia|atlantic|australia|europe|indian|pacific)\/[a-z_]+(?:\/[a-z_]+)?\b/i,
    );

  if (ianaMatch?.[0]) {
    return ianaMatch[0];
  }

  return undefined;
}

function resolveSystemTimeZone():
  | string
  | undefined {
  try {
    const resolved =
      new Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone;

    if (
      typeof resolved ===
        "string" &&
      resolved.trim()
    ) {
      return resolved;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

function isValidTimeZone(
  timeZone: string,
): boolean {
  try {
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
      },
    ).format(
      new Date(),
    );

    return true;
  } catch {
    return false;
  }
}

function resolveLocale(
  locale: Locale,
): string {
  if (locale === "zh-CN") {
    return "zh-CN";
  }

  if (locale === "ja") {
    return "ja-JP";
  }

  return "en-US";
}

function getPart(
  parts: Intl.DateTimeFormatPart[],
  type:
    | "year"
    | "month"
    | "day"
    | "hour"
    | "minute"
    | "second"
    | "timeZoneName",
): string {
  return (
    parts.find(
      (part) =>
        part.type === type,
    )?.value ?? ""
  );
}

function formatUtcOffset(
  timestamp: number,
  timeZone: string,
): string {
  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone,
        timeZoneName:
          "longOffset",
        hour: "2-digit",
      },
    ).formatToParts(
      new Date(timestamp),
    );

  const value =
    getPart(
      parts,
      "timeZoneName",
    );

  if (
    value &&
    value !== "GMT"
  ) {
    return value;
  }

  return "GMT+00:00";
}

function buildContent(
  locale: Locale,
  formattedDateTime: string,
  formattedTime: string,
  formattedDate: string,
  timeZone: string,
  timeZoneName: string,
  utcOffset: string,
): string {
  if (locale === "zh-CN") {
    return [
      `现在时间：${formattedTime}`,
      `日期：${formattedDate}`,
      `时区：${timeZone}`,
      `时区名称：${timeZoneName}`,
      `UTC 偏移：${utcOffset}`,
      `完整时间：${formattedDateTime}`,
    ].join("\n");
  }

  if (locale === "ja") {
    return [
      `現在時刻：${formattedTime}`,
      `日付：${formattedDate}`,
      `タイムゾーン：${timeZone}`,
      `タイムゾーン名：${timeZoneName}`,
      `UTC オフセット：${utcOffset}`,
      `完全な日時：${formattedDateTime}`,
    ].join("\n");
  }

  return [
    `Current time: ${formattedTime}`,
    `Date: ${formattedDate}`,
    `Time zone: ${timeZone}`,
    `Time zone name: ${timeZoneName}`,
    `UTC offset: ${utcOffset}`,
    `Full date and time: ${formattedDateTime}`,
  ].join("\n");
}

export function executeTimeCapability(
  prompt: string,
  locale: Locale = "en",
): TimeCapabilityResult {
  const normalized =
    normalizePrompt(prompt);

  if (
    !isTimeCapabilityRequest(
      normalized,
    )
  ) {
    return {
      detected: false,
      success: false,
      source: "utc",
      timeZone: "UTC",
      locale,
      timestamp: Date.now(),
      isoTimestamp:
        new Date().toISOString(),
      formattedDateTime: "",
      formattedTime: "",
      formattedDate: "",
      timeZoneName: "",
      utcOffset: "GMT+00:00",
      content: "",
      code:
        "TIME_CAPABILITY_FAILED",
    };
  }

  const explicitTimeZone =
    resolveExplicitTimeZone(
      normalized,
    );

  const systemTimeZone =
    resolveSystemTimeZone();

  const timeZone =
    explicitTimeZone ??
    systemTimeZone ??
    "UTC";

  const source: TimeCapabilitySource =
    explicitTimeZone
      ? "explicit-timezone"
      : systemTimeZone
        ? "system-timezone"
        : "utc";

  if (
    !isValidTimeZone(
      timeZone,
    )
  ) {
    return {
      detected: true,
      success: false,
      source,
      timeZone,
      locale,
      timestamp: Date.now(),
      isoTimestamp:
        new Date().toISOString(),
      formattedDateTime: "",
      formattedTime: "",
      formattedDate: "",
      timeZoneName: "",
      utcOffset: "",
      content:
        locale === "zh-CN"
          ? "无法确认请求的时区，因此没有猜测当前时间。"
          : locale === "ja"
            ? "指定されたタイムゾーンを確認できないため、現在時刻を推測していません。"
            : "The requested time zone could not be verified, so AIOS did not guess the current time.",
      code:
        "TIME_CAPABILITY_TIMEZONE_INVALID",
    };
  }

  const timestamp =
    Date.now();

  const date =
    new Date(timestamp);

  const localized =
    resolveLocale(locale);

  const fullFormatter =
    new Intl.DateTimeFormat(
      localized,
      {
        timeZone,
        dateStyle: "full",
        timeStyle: "long",
      },
    );

  const timeFormatter =
    new Intl.DateTimeFormat(
      localized,
      {
        timeZone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      },
    );

  const dateFormatter =
    new Intl.DateTimeFormat(
      localized,
      {
        timeZone,
        dateStyle: "long",
      },
    );

  const zoneFormatter =
    new Intl.DateTimeFormat(
      localized,
      {
        timeZone,
        timeZoneName: "long",
        hour: "2-digit",
      },
    );

  const fullParts =
    fullFormatter.formatToParts(
      date,
    );

  const zoneParts =
    zoneFormatter.formatToParts(
      date,
    );

  const formattedDateTime =
    fullFormatter.format(date);

  const formattedTime =
    timeFormatter.format(date);

  const formattedDate =
    dateFormatter.format(date);

  const timeZoneName =
    getPart(
      zoneParts,
      "timeZoneName",
    ) || timeZone;

  const utcOffset =
    formatUtcOffset(
      timestamp,
      timeZone,
    );

  const content =
    buildContent(
      locale,
      formattedDateTime,
      formattedTime,
      formattedDate,
      timeZone,
      timeZoneName,
      utcOffset,
    );

  void fullParts;

  return {
    detected: true,
    success: true,
    source,
    timeZone,
    locale,
    timestamp,
    isoTimestamp:
      date.toISOString(),
    formattedDateTime,
    formattedTime,
    formattedDate,
    timeZoneName,
    utcOffset,
    content,
    code:
      "TIME_CAPABILITY_COMPLETED",
  };
}
