import type { Locale } from "@/lib/i18n";

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

interface TimeZoneAlias {
  aliases: string[];
  timeZone: string;
}

const TIME_QUERY_PATTERNS = [
  /what(?:'s| is)?\s+(?:the\s+)?(?:current\s+)?time\b/i,
  /current\s+time/i,
  /time\s+now/i,
  /what\s+time\s+is\s+it/i,
  /current\s+date/i,
  /today(?:'s)?\s+date/i,
  /现在几点/,
  /现在时间/,
  /当前时间/,
  /现在的时间/,
  /今天几号/,
  /現在何時/,
  /今何時/,
  /現在の時間/,
  /今日の日付/,
];

const TIME_ZONE_ALIASES: TimeZoneAlias[] = [
  {
    aliases: [
      "utc",
      "gmt",
      "universal time",
      "coordinated universal time",
    ],
    timeZone: "UTC",
  },
  {
    aliases: [
      "beijing",
      "beijing time",
      "china time",
      "中国时间",
      "北京时间",
    ],
    timeZone: "Asia/Shanghai",
  },
  {
    aliases: [
      "shanghai",
      "shanghai time",
      "上海",
      "上海时间",
    ],
    timeZone: "Asia/Shanghai",
  },
  {
    aliases: [
      "shenzhen",
      "shenzhen time",
      "深圳",
      "深圳时间",
    ],
    timeZone: "Asia/Shanghai",
  },
  {
    aliases: [
      "hong kong",
      "hong kong time",
      "香港",
      "香港时间",
    ],
    timeZone: "Asia/Hong_Kong",
  },
  {
    aliases: [
      "macau",
      "macau time",
      "macao",
      "澳门",
      "澳门时间",
    ],
    timeZone: "Asia/Macau",
  },
  {
    aliases: [
      "taipei",
      "taipei time",
      "台北",
      "台北时间",
    ],
    timeZone: "Asia/Taipei",
  },
  {
    aliases: [
      "tokyo",
      "tokyo time",
      "japan",
      "japan time",
      "日本",
      "日本时间",
      "东京",
      "东京时间",
    ],
    timeZone: "Asia/Tokyo",
  },
  {
    aliases: [
      "seoul",
      "seoul time",
      "korea",
      "korea time",
      "韩国",
      "韩国时间",
      "首尔",
      "首尔时间",
    ],
    timeZone: "Asia/Seoul",
  },
  {
    aliases: [
      "singapore",
      "singapore time",
      "新加坡",
      "新加坡时间",
    ],
    timeZone: "Asia/Singapore",
  },
  {
    aliases: [
      "bangkok",
      "bangkok time",
      "thailand",
      "泰国",
      "曼谷",
    ],
    timeZone: "Asia/Bangkok",
  },
  {
    aliases: [
      "jakarta",
      "jakarta time",
      "indonesia",
      "印度尼西亚",
      "雅加达",
    ],
    timeZone: "Asia/Jakarta",
  },
  {
    aliases: [
      "mumbai",
      "mumbai time",
      "india",
      "india time",
      "印度",
      "印度时间",
      "孟买",
    ],
    timeZone: "Asia/Kolkata",
  },
  {
    aliases: [
      "dubai",
      "dubai time",
      "uae",
      "united arab emirates",
      "阿联酋",
      "迪拜",
    ],
    timeZone: "Asia/Dubai",
  },
  {
    aliases: [
      "riyadh",
      "riyadh time",
      "saudi arabia",
      "沙特",
      "利雅得",
    ],
    timeZone: "Asia/Riyadh",
  },
  {
    aliases: [
      "moscow",
      "moscow time",
      "russia",
      "俄罗斯",
      "莫斯科",
    ],
    timeZone: "Europe/Moscow",
  },
  {
    aliases: [
      "istanbul",
      "istanbul time",
      "turkey",
      "土耳其",
      "伊斯坦布尔",
    ],
    timeZone: "Europe/Istanbul",
  },
  {
    aliases: [
      "london",
      "london time",
      "uk",
      "united kingdom",
      "britain",
      "英国",
      "伦敦",
    ],
    timeZone: "Europe/London",
  },
  {
    aliases: [
      "paris",
      "paris time",
      "france",
      "法国",
      "巴黎",
    ],
    timeZone: "Europe/Paris",
  },
  {
    aliases: [
      "berlin",
      "berlin time",
      "germany",
      "德国",
      "柏林",
    ],
    timeZone: "Europe/Berlin",
  },
  {
    aliases: [
      "rome",
      "rome time",
      "italy",
      "意大利",
      "罗马",
    ],
    timeZone: "Europe/Rome",
  },
  {
    aliases: [
      "madrid",
      "madrid time",
      "spain",
      "西班牙",
      "马德里",
    ],
    timeZone: "Europe/Madrid",
  },
  {
    aliases: [
      "amsterdam",
      "amsterdam time",
      "netherlands",
      "荷兰",
      "阿姆斯特丹",
    ],
    timeZone: "Europe/Amsterdam",
  },
  {
    aliases: [
      "zurich",
      "zurich time",
      "switzerland",
      "瑞士",
      "苏黎世",
    ],
    timeZone: "Europe/Zurich",
  },
  {
    aliases: [
      "cairo",
      "cairo time",
      "egypt",
      "埃及",
      "开罗",
    ],
    timeZone: "Africa/Cairo",
  },
  {
    aliases: [
      "johannesburg",
      "johannesburg time",
      "south africa",
      "南非",
      "约翰内斯堡",
    ],
    timeZone: "Africa/Johannesburg",
  },
  {
    aliases: [
      "lagos",
      "lagos time",
      "nigeria",
      "尼日利亚",
      "拉各斯",
    ],
    timeZone: "Africa/Lagos",
  },
  {
    aliases: [
      "nairobi",
      "nairobi time",
      "kenya",
      "肯尼亚",
      "内罗毕",
    ],
    timeZone: "Africa/Nairobi",
  },
  {
    aliases: [
      "new york",
      "new york time",
      "nyc",
      "eastern time",
      "est",
      "edt",
      "美国东部",
      "纽约",
      "纽约时间",
    ],
    timeZone: "America/New_York",
  },
  {
    aliases: [
      "washington",
      "washington dc",
      "washington, dc",
      "华盛顿",
    ],
    timeZone: "America/New_York",
  },
  {
    aliases: [
      "chicago",
      "chicago time",
      "central time",
      "cst",
      "cdt",
      "美国中部",
      "芝加哥",
    ],
    timeZone: "America/Chicago",
  },
  {
    aliases: [
      "denver",
      "denver time",
      "mountain time",
      "mst",
      "mdt",
      "美国山地",
      "丹佛",
    ],
    timeZone: "America/Denver",
  },
  {
    aliases: [
      "los angeles",
      "los angeles time",
      "la time",
      "pacific time",
      "pst",
      "pdt",
      "美国太平洋",
      "洛杉矶",
      "洛杉矶时间",
    ],
    timeZone: "America/Los_Angeles",
  },
  {
    aliases: [
      "san francisco",
      "san francisco time",
      "旧金山",
      "旧金山时间",
    ],
    timeZone: "America/Los_Angeles",
  },
  {
    aliases: [
      "vancouver",
      "vancouver time",
      "温哥华",
      "温哥华时间",
    ],
    timeZone: "America/Vancouver",
  },
  {
    aliases: [
      "toronto",
      "toronto time",
      "多伦多",
      "多伦多时间",
    ],
    timeZone: "America/Toronto",
  },
  {
    aliases: [
      "mexico city",
      "mexico city time",
      "墨西哥城",
      "墨西哥城时间",
    ],
    timeZone: "America/Mexico_City",
  },
  {
    aliases: [
      "sao paulo",
      "são paulo",
      "sao paulo time",
      "brazil",
      "巴西",
      "圣保罗",
    ],
    timeZone: "America/Sao_Paulo",
  },
  {
    aliases: [
      "buenos aires",
      "buenos aires time",
      "argentina",
      "阿根廷",
      "布宜诺斯艾利斯",
    ],
    timeZone: "America/Argentina/Buenos_Aires",
  },
  {
    aliases: [
      "honolulu",
      "honolulu time",
      "hawaii",
      "夏威夷",
      "檀香山",
    ],
    timeZone: "Pacific/Honolulu",
  },
  {
    aliases: [
      "sydney",
      "sydney time",
      "australia",
      "澳大利亚",
      "悉尼",
    ],
    timeZone: "Australia/Sydney",
  },
  {
    aliases: [
      "melbourne",
      "melbourne time",
      "墨尔本",
    ],
    timeZone: "Australia/Melbourne",
  },
  {
    aliases: [
      "perth",
      "perth time",
      "珀斯",
    ],
    timeZone: "Australia/Perth",
  },
  {
    aliases: [
      "auckland",
      "auckland time",
      "new zealand",
      "新西兰",
      "奥克兰",
    ],
    timeZone: "Pacific/Auckland",
  },
  {
    aliases: [
      "honolulu",
      "hawaii time",
      "hawaii",
      "夏威夷",
    ],
    timeZone: "Pacific/Honolulu",
  },
];

const IANA_TIME_ZONE_PATTERN =
  /\b(?:Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific|Etc)\/[A-Za-z0-9_+.-]+(?:\/[A-Za-z0-9_+.-]+)*\b/;

function normalizePrompt(prompt: string): string {
  return prompt.trim().replace(/\s+/g, " ");
}

function containsTimeQuery(prompt: string): boolean {
  return TIME_QUERY_PATTERNS.some((pattern) =>
    pattern.test(prompt),
  );
}

function resolveAliasTimeZone(
  prompt: string,
): string | undefined {
  const normalized = prompt.toLowerCase();

  const sortedAliases = [...TIME_ZONE_ALIASES].sort(
    (left, right) => {
      const rightLength = Math.max(
        ...right.aliases.map((alias) => alias.length),
      );
      const leftLength = Math.max(
        ...left.aliases.map((alias) => alias.length),
      );

      return rightLength - leftLength;
    },
  );

  for (const entry of sortedAliases) {
    for (const alias of entry.aliases) {
      const normalizedAlias = alias.toLowerCase();

      if (normalized.includes(normalizedAlias)) {
        return entry.timeZone;
      }
    }
  }

  return undefined;
}

function resolveIanaTimeZone(
  prompt: string,
): string | undefined {
  const match = prompt.match(IANA_TIME_ZONE_PATTERN);

  if (!match) {
    return undefined;
  }

  return match[0];
}

function resolveExplicitTimeZone(
  prompt: string,
): string | undefined {
  return (
    resolveIanaTimeZone(prompt) ??
    resolveAliasTimeZone(prompt)
  );
}

function resolveSystemTimeZone(): string | undefined {
  try {
    const resolved =
      new Intl.DateTimeFormat().resolvedOptions()
        .timeZone;

    if (resolved?.trim()) {
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
    new Intl.DateTimeFormat("en-US", {
      timeZone,
    }).format(new Date());

    return true;
  } catch {
    return false;
  }
}

function resolveLocale(locale: Locale): string {
  if (locale === "zh-CN") {
    return "zh-CN";
  }

  if (locale === "ja") {
    return "ja-JP";
  }

  return "en-US";
}

function getTimeZoneName(
  date: Date,
  locale: string,
  timeZone: string,
): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      timeZoneName: "long",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")
      ?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

function getShortTimeZoneName(
  date: Date,
  locale: string,
  timeZone: string,
): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      timeZone,
      timeZoneName: "short",
    })
      .formatToParts(date)
      .find((part) => part.type === "timeZoneName")
      ?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

function getUtcOffset(
  date: Date,
  timeZone: string,
): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "longOffset",
      hour: "2-digit",
    }).formatToParts(date);

    const value = parts.find(
      (part) => part.type === "timeZoneName",
    )?.value;

    if (value) {
      return value.replace(/^GMT/, "UTC");
    }
  } catch {
    return "UTC";
  }

  return "UTC";
}

function formatDateTime(
  date: Date,
  locale: string,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    dateStyle: "full",
    timeStyle: "long",
  }).format(date);
}

function formatTime(
  date: Date,
  locale: string,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function formatDate(
  date: Date,
  locale: string,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    dateStyle: "full",
  }).format(date);
}

function buildContent(
  locale: Locale,
  date: Date,
  timeZone: string,
  formattedDateTime: string,
  formattedTime: string,
  formattedDate: string,
  timeZoneName: string,
  utcOffset: string,
): string {
  const shortTimeZoneName = getShortTimeZoneName(
    date,
    resolveLocale(locale),
    timeZone,
  );

  if (locale === "zh-CN") {
    return [
      `当前时间：${formattedDateTime}`,
      `时区：${timeZone}`,
      `时区名称：${timeZoneName}`,
      `UTC 偏移：${utcOffset}`,
      `当前时间：${formattedTime}`,
      `日期：${formattedDate}`,
      `时区缩写：${shortTimeZoneName}`,
      `时间戳：${date.getTime()}`,
    ].join("\n");
  }

  if (locale === "ja") {
    return [
      `現在時刻：${formattedDateTime}`,
      `タイムゾーン：${timeZone}`,
      `タイムゾーン名：${timeZoneName}`,
      `UTC オフセット：${utcOffset}`,
      `現在時刻：${formattedTime}`,
      `日付：${formattedDate}`,
      `タイムゾーン略称：${shortTimeZoneName}`,
      `タイムスタンプ：${date.getTime()}`,
    ].join("\n");
  }

  return [
    `Current time: ${formattedDateTime}`,
    `Time zone: ${timeZone}`,
    `Time zone name: ${timeZoneName}`,
    `UTC offset: ${utcOffset}`,
    `Current time: ${formattedTime}`,
    `Date: ${formattedDate}`,
    `Time zone abbreviation: ${shortTimeZoneName}`,
    `Timestamp: ${date.getTime()}`,
  ].join("\n");
}

export function isTimeCapabilityPrompt(
  prompt: string,
): boolean {
  const normalizedPrompt = normalizePrompt(prompt);

  if (!normalizedPrompt) {
    return false;
  }

  return containsTimeQuery(normalizedPrompt);
}

export function executeTimeCapability(
  prompt: string,
  locale: Locale = "en",
): TimeCapabilityResult {
  const normalizedPrompt = normalizePrompt(prompt);

  if (!containsTimeQuery(normalizedPrompt)) {
    return {
      detected: false,
      success: false,
      source: "utc",
      timeZone: "UTC",
      locale,
      timestamp: Date.now(),
      isoTimestamp: new Date().toISOString(),
      formattedDateTime: "",
      formattedTime: "",
      formattedDate: "",
      timeZoneName: "UTC",
      utcOffset: "UTC",
      content: "",
      code: "TIME_CAPABILITY_FAILED",
    };
  }

  const explicitTimeZone =
    resolveExplicitTimeZone(normalizedPrompt);

  let timeZone = explicitTimeZone;
  let source: TimeCapabilitySource =
    "explicit-timezone";

  if (!timeZone) {
    timeZone = resolveSystemTimeZone();
    source = "system-timezone";
  }

  if (!timeZone || !isValidTimeZone(timeZone)) {
    timeZone = "UTC";
    source = "utc";
  }

  const timestamp = Date.now();
  const date = new Date(timestamp);
  const resolvedLocale = resolveLocale(locale);

  try {
    const formattedDateTime =
      formatDateTime(
        date,
        resolvedLocale,
        timeZone,
      );

    const formattedTime =
      formatTime(
        date,
        resolvedLocale,
        timeZone,
      );

    const formattedDate =
      formatDate(
        date,
        resolvedLocale,
        timeZone,
      );

    const timeZoneName =
      getTimeZoneName(
        date,
        resolvedLocale,
        timeZone,
      );

    const utcOffset =
      getUtcOffset(
        date,
        timeZone,
      );

    const content =
      buildContent(
        locale,
        date,
        timeZone,
        formattedDateTime,
        formattedTime,
        formattedDate,
        timeZoneName,
        utcOffset,
      );

    return {
      detected: true,
      success: true,
      source,
      timeZone,
      locale,
      timestamp,
      isoTimestamp: date.toISOString(),
      formattedDateTime,
      formattedTime,
      formattedDate,
      timeZoneName,
      utcOffset,
      content,
      code: "TIME_CAPABILITY_COMPLETED",
    };
  } catch {
    return {
      detected: true,
      success: false,
      source,
      timeZone,
      locale,
      timestamp,
      isoTimestamp: date.toISOString(),
      formattedDateTime: "",
      formattedTime: "",
      formattedDate: "",
      timeZoneName: timeZone,
      utcOffset: "UTC",
      content: "",
      code: "TIME_CAPABILITY_FAILED",
    };
  }
}
