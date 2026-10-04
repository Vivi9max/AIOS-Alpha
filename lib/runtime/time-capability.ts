import type { Locale } from "@/lib/i18n";

export type TimeCapabilitySource =
  | "explicit-timezone"
  | "system-timezone"
  | "utc";

export type TimeCapabilityCode =
  | "TIME_CAPABILITY_COMPLETED"
  | "TIME_CAPABILITY_TIMEZONE_INVALID"
  | "TIME_CAPABILITY_FAILED";

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
  code: TimeCapabilityCode;
}

interface TimeZoneAlias {
  zone: string;
  aliases: string[];
}

const TIME_ZONE_ALIASES: TimeZoneAlias[] = [
  {
    zone: "UTC",
    aliases: [
      "utc",
      "gmt",
      "universal time",
      "coordinated universal time",
      "世界协调时间",
      "协调世界时",
      "格林尼治时间",
      "世界標準時",
      "協定世界時",
    ],
  },
  {
    zone: "Asia/Shanghai",
    aliases: [
      "beijing",
      "beijing time",
      "shanghai",
      "shanghai time",
      "china",
      "china time",
      "中国",
      "中国时间",
      "北京时间",
      "上海",
      "上海时间",
      "北京",
      "北京時間",
      "中国時間",
    ],
  },
  {
    zone: "Asia/Hong_Kong",
    aliases: [
      "hong kong",
      "hong kong time",
      "hongkong",
      "香港",
      "香港时间",
      "香港時間",
    ],
  },
  {
    zone: "Asia/Macau",
    aliases: [
      "macau",
      "macau time",
      "macao",
      "macao time",
      "澳门",
      "澳门时间",
      "澳門",
      "澳門時間",
    ],
  },
  {
    zone: "Asia/Taipei",
    aliases: [
      "taipei",
      "taipei time",
      "taiwan",
      "taiwan time",
      "台北",
      "台北时间",
      "台湾",
      "台湾时间",
      "臺北",
      "臺灣",
      "臺灣時間",
    ],
  },
  {
    zone: "Asia/Tokyo",
    aliases: [
      "tokyo",
      "tokyo time",
      "japan",
      "japan time",
      "日本",
      "日本时间",
      "日本時間",
      "东京",
      "東京",
      "东京时间",
      "東京時間",
    ],
  },
  {
    zone: "Asia/Seoul",
    aliases: [
      "seoul",
      "seoul time",
      "south korea",
      "korea",
      "korea time",
      "韩国",
      "韩国时间",
      "韓国",
      "韓国時間",
      "首尔",
      "首尔时间",
      "ソウル",
      "韓国時間",
    ],
  },
  {
    zone: "Asia/Singapore",
    aliases: [
      "singapore",
      "singapore time",
      "新加坡",
      "新加坡时间",
      "シンガポール",
      "シンガポール時間",
    ],
  },
  {
    zone: "Asia/Bangkok",
    aliases: [
      "bangkok",
      "bangkok time",
      "thailand",
      "thailand time",
      "泰国",
      "泰国时间",
      "曼谷",
      "曼谷时间",
      "タイ",
      "バンコク",
      "タイ時間",
    ],
  },
  {
    zone: "Asia/Jakarta",
    aliases: [
      "jakarta",
      "jakarta time",
      "indonesia",
      "indonesia time",
      "印度尼西亚",
      "印度尼西亚时间",
      "雅加达",
      "雅加达时间",
      "インドネシア",
      "ジャカルタ",
    ],
  },
  {
    zone: "Asia/Kolkata",
    aliases: [
      "mumbai",
      "mumbai time",
      "india",
      "india time",
      "new delhi",
      "delhi",
      "孟买",
      "印度",
      "印度时间",
      "孟买时间",
      "ムンバイ",
      "インド",
    ],
  },
  {
    zone: "Asia/Dubai",
    aliases: [
      "dubai",
      "dubai time",
      "uae",
      "united arab emirates",
      "阿联酋",
      "迪拜",
      "迪拜时间",
      "アラブ首長国連邦",
      "ドバイ",
    ],
  },
  {
    zone: "Asia/Riyadh",
    aliases: [
      "riyadh",
      "riyadh time",
      "saudi arabia",
      "saudi",
      "沙特",
      "沙特阿拉伯",
      "利雅得",
      "利雅得时间",
      "サウジアラビア",
      "リヤド",
    ],
  },
  {
    zone: "Europe/Moscow",
    aliases: [
      "moscow",
      "moscow time",
      "russia",
      "russia time",
      "俄罗斯",
      "俄罗斯时间",
      "莫斯科",
      "莫斯科时间",
      "ロシア",
      "モスクワ",
    ],
  },
  {
    zone: "Europe/Istanbul",
    aliases: [
      "istanbul",
      "istanbul time",
      "turkey",
      "turkiye",
      "turkey time",
      "土耳其",
      "土耳其时间",
      "伊斯坦布尔",
      "伊斯坦布尔时间",
      "トルコ",
      "イスタンブール",
    ],
  },
  {
    zone: "Europe/London",
    aliases: [
      "london",
      "london time",
      "uk",
      "united kingdom",
      "britain",
      "british time",
      "英国",
      "英国时间",
      "伦敦",
      "伦敦时间",
      "イギリス",
      "ロンドン",
    ],
  },
  {
    zone: "Europe/Paris",
    aliases: [
      "paris",
      "paris time",
      "france",
      "france time",
      "法国",
      "法国时间",
      "巴黎",
      "巴黎时间",
      "フランス",
      "パリ",
    ],
  },
  {
    zone: "Europe/Berlin",
    aliases: [
      "berlin",
      "berlin time",
      "germany",
      "germany time",
      "德国",
      "德国时间",
      "柏林",
      "柏林时间",
      "ドイツ",
      "ベルリン",
    ],
  },
  {
    zone: "Europe/Rome",
    aliases: [
      "rome",
      "rome time",
      "italy",
      "italy time",
      "意大利",
      "意大利时间",
      "罗马",
      "罗马时间",
      "イタリア",
      "ローマ",
    ],
  },
  {
    zone: "Europe/Madrid",
    aliases: [
      "madrid",
      "madrid time",
      "spain",
      "spain time",
      "西班牙",
      "西班牙时间",
      "马德里",
      "马德里时间",
      "スペイン",
      "マドリード",
    ],
  },
  {
    zone: "Europe/Amsterdam",
    aliases: [
      "amsterdam",
      "amsterdam time",
      "netherlands",
      "netherlands time",
      "荷兰",
      "荷兰时间",
      "阿姆斯特丹",
      "阿姆斯特丹时间",
      "オランダ",
      "アムステルダム",
    ],
  },
  {
    zone: "Europe/Zurich",
    aliases: [
      "zurich",
      "zurich time",
      "switzerland",
      "switzerland time",
      "瑞士",
      "瑞士时间",
      "苏黎世",
      "苏黎世时间",
      "スイス",
      "チューリッヒ",
    ],
  },
  {
    zone: "Africa/Cairo",
    aliases: [
      "cairo",
      "cairo time",
      "egypt",
      "egypt time",
      "埃及",
      "埃及时间",
      "开罗",
      "开罗时间",
      "エジプト",
      "カイロ",
    ],
  },
  {
    zone: "Africa/Johannesburg",
    aliases: [
      "johannesburg",
      "johannesburg time",
      "south africa",
      "south africa time",
      "南非",
      "南非时间",
      "约翰内斯堡",
      "约翰内斯堡时间",
      "南アフリカ",
      "ヨハネスブルグ",
    ],
  },
  {
    zone: "Africa/Lagos",
    aliases: [
      "lagos",
      "lagos time",
      "nigeria",
      "nigeria time",
      "尼日利亚",
      "尼日利亚时间",
      "拉各斯",
      "拉各斯时间",
      "ナイジェリア",
      "ラゴス",
    ],
  },
  {
    zone: "Africa/Nairobi",
    aliases: [
      "nairobi",
      "nairobi time",
      "kenya",
      "kenya time",
      "肯尼亚",
      "肯尼亚时间",
      "内罗毕",
      "内罗毕时间",
      "ケニア",
      "ナイロビ",
    ],
  },
  {
    zone: "America/New_York",
    aliases: [
      "new york",
      "new york time",
      "nyc",
      "eastern time",
      "eastern timezone",
      "est",
      "edt",
      "eastern",
      "washington dc",
      "washington",
      "boston",
      "miami",
      "纽约",
      "纽约时间",
      "华盛顿",
      "华盛顿时间",
      "东部时间",
      "ニューヨーク",
      "ニューヨーク時間",
      "東部時間",
    ],
  },
  {
    zone: "America/Chicago",
    aliases: [
      "chicago",
      "chicago time",
      "central time",
      "central timezone",
      "cst",
      "cdt",
      "central",
      "达拉斯",
      "芝加哥",
      "芝加哥时间",
      "美国中部时间",
      "シカゴ",
      "中部時間",
    ],
  },
  {
    zone: "America/Denver",
    aliases: [
      "denver",
      "denver time",
      "mountain time",
      "mountain timezone",
      "mst",
      "mdt",
      "mountain",
      "丹佛",
      "丹佛时间",
      "美国山地时间",
      "デンバー",
      "山岳部時間",
    ],
  },
  {
    zone: "America/Los_Angeles",
    aliases: [
      "los angeles",
      "los angeles time",
      "la time",
      "pacific time",
      "pacific timezone",
      "pst",
      "pdt",
      "pacific",
      "san francisco",
      "san francisco time",
      "西雅图",
      "洛杉矶",
      "洛杉矶时间",
      "旧金山",
      "美国太平洋时间",
      "ロサンゼルス",
      "サンフランシスコ",
      "太平洋時間",
    ],
  },
  {
    zone: "America/Vancouver",
    aliases: [
      "vancouver",
      "vancouver time",
      "canada pacific",
      "温哥华",
      "温哥华时间",
      "バンクーバー",
    ],
  },
  {
    zone: "America/Toronto",
    aliases: [
      "toronto",
      "toronto time",
      "canada eastern",
      "多伦多",
      "多伦多时间",
      "トロント",
    ],
  },
  {
    zone: "America/Mexico_City",
    aliases: [
      "mexico city",
      "mexico city time",
      "mexico",
      "mexico time",
      "墨西哥",
      "墨西哥城",
      "墨西哥城时间",
      "メキシコ",
      "メキシコシティ",
    ],
  },
  {
    zone: "America/Sao_Paulo",
    aliases: [
      "sao paulo",
      "sao paulo time",
      "brazil",
      "brazil time",
      "巴西",
      "巴西时间",
      "圣保罗",
      "圣保罗时间",
      "ブラジル",
      "サンパウロ",
    ],
  },
  {
    zone: "America/Argentina/Buenos_Aires",
    aliases: [
      "buenos aires",
      "buenos aires time",
      "argentina",
      "argentina time",
      "阿根廷",
      "阿根廷时间",
      "布宜诺斯艾利斯",
      "布宜诺斯艾利斯时间",
      "アルゼンチン",
      "ブエノスアイレス",
    ],
  },
  {
    zone: "Pacific/Honolulu",
    aliases: [
      "honolulu",
      "honolulu time",
      "hawaii",
      "hawaii time",
      "夏威夷",
      "夏威夷时间",
      "檀香山",
      "檀香山时间",
      "ハワイ",
      "ホノルル",
    ],
  },
  {
    zone: "Australia/Sydney",
    aliases: [
      "sydney",
      "sydney time",
      "australia eastern",
      "australia eastern time",
      "澳大利亚",
      "澳大利亚东部时间",
      "悉尼",
      "悉尼时间",
      "オーストラリア",
      "シドニー",
    ],
  },
  {
    zone: "Australia/Melbourne",
    aliases: [
      "melbourne",
      "melbourne time",
      "墨尔本",
      "墨尔本时间",
      "メルボルン",
    ],
  },
  {
    zone: "Australia/Perth",
    aliases: [
      "perth",
      "perth time",
      "western australia",
      "西澳大利亚",
      "珀斯",
      "珀斯时间",
      "パース",
    ],
  },
  {
    zone: "Pacific/Auckland",
    aliases: [
      "auckland",
      "auckland time",
      "new zealand",
      "new zealand time",
      "新西兰",
      "新西兰时间",
      "奥克兰",
      "奥克兰时间",
      "ニュージーランド",
      "オークランド",
    ],
  },
];

const TIME_QUERY_PATTERNS: RegExp[] = [
  /\bwhat(?:'s| is)?\s+(?:the\s+)?(?:current\s+)?time\b/i,
  /\bwhat\s+time\s+is\s+it\b/i,
  /\bcurrent\s+time\b/i,
  /\btime\s+now\b/i,
  /\bcurrent\s+date\b/i,
  /\btoday(?:'s)?\s+date\b/i,
  /\bdate\s+today\b/i,
  /现在几点/u,
  /现在时间/u,
  /当前时间/u,
  /现在的时间/u,
  /今天几号/u,
  /今天日期/u,
  /现在日期/u,
  /現在何時/u,
  /今何時/u,
  /現在の時間/u,
  /今日の日付/u,
  /今の時間/u,
];

const IANA_TIME_ZONE_PATTERN =
  /\b(?:Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific|Etc)\/[A-Za-z0-9_+.-]+(?:\/[A-Za-z0-9_+.-]+)*\b/;

function normalizePrompt(
  prompt: string,
): string {
  return prompt
    .trim()
    .toLocaleLowerCase();
}

function normalizeAlias(
  value: string,
): string {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, " ");
}

function findExplicitIanaTimeZone(
  prompt: string,
): string | null {
  const match =
    prompt.match(
      IANA_TIME_ZONE_PATTERN,
    );

  return match?.[0] ?? null;
}

function findTimeZoneAlias(
  prompt: string,
): string | null {
  const normalized =
    normalizePrompt(prompt);

  const orderedAliases =
    TIME_ZONE_ALIASES.flatMap(
      (entry) =>
        entry.aliases.map(
          (alias) => ({
            zone: entry.zone,
            alias:
              normalizeAlias(alias),
          }),
        ),
    ).sort(
      (a, b) =>
        b.alias.length -
        a.alias.length,
    );

  for (const entry of orderedAliases) {
    if (
      normalized.includes(
        entry.alias,
      )
    ) {
      return entry.zone;
    }
  }

  return null;
}

function resolveTimeZone(
  prompt: string,
): {
  timeZone: string;
  source: TimeCapabilitySource;
} {
  const explicitIana =
    findExplicitIanaTimeZone(
      prompt,
    );

  if (explicitIana) {
    return {
      timeZone:
        explicitIana,
      source:
        "explicit-timezone",
    };
  }

  const explicitAlias =
    findTimeZoneAlias(
      prompt,
    );

  if (explicitAlias) {
    return {
      timeZone:
        explicitAlias,
      source:
        "explicit-timezone",
    };
  }

  try {
    const systemTimeZone =
      new Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone;

    if (
      typeof systemTimeZone ===
        "string" &&
      systemTimeZone.length > 0
    ) {
      return {
        timeZone:
          systemTimeZone,
        source:
          "system-timezone",
      };
    }
  } catch {
    // Fall through to UTC.
  }

  return {
    timeZone: "UTC",
    source: "utc",
  };
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
    ).format(new Date());

    return true;
  } catch {
    return false;
  }
}

function resolveFormatterLocale(
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

function createFormatters(
  locale: Locale,
  timeZone: string,
) {
  const formatterLocale =
    resolveFormatterLocale(
      locale,
    );

  return {
    dateTime:
      new Intl.DateTimeFormat(
        formatterLocale,
        {
          timeZone,
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
          timeZoneName: "long",
        },
      ),
    time:
      new Intl.DateTimeFormat(
        formatterLocale,
        {
          timeZone,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        },
      ),
    date:
      new Intl.DateTimeFormat(
        formatterLocale,
        {
          timeZone,
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "long",
        },
      ),
    timeZoneName:
      new Intl.DateTimeFormat(
        formatterLocale,
        {
          timeZone,
          timeZoneName: "long",
        },
      ),
    utcOffset:
      new Intl.DateTimeFormat(
        "en-US",
        {
          timeZone,
          timeZoneName:
            "longOffset",
          hour: "2-digit",
          minute: "2-digit",
        },
      ),
  };
}

function extractTimeZoneName(
  formatted: string,
): string {
  const parts =
    formatted.split(",");

  if (parts.length > 1) {
    return parts[
      parts.length - 1
    ].trim();
  }

  return formatted.trim();
}

function extractUtcOffset(
  formatted: string,
): string {
  const match =
    formatted.match(
      /GMT[+-]\d{2}:\d{2}|GMT/,
    );

  return match?.[0] ?? "GMT";
}

function buildContent(
  locale: Locale,
  timeZone: string,
  formattedDateTime: string,
  formattedTime: string,
  formattedDate: string,
  timeZoneName: string,
  utcOffset: string,
): string {
  if (locale === "zh-CN") {
    return [
      `当前时间：${formattedTime}`,
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

export function isTimeCapabilityPrompt(
  prompt: string,
): boolean {
  if (
    typeof prompt !==
      "string" ||
    prompt.trim().length === 0
  ) {
    return false;
  }

  return TIME_QUERY_PATTERNS.some(
    (pattern) =>
      pattern.test(prompt),
  );
}

export function executeTimeCapability(
  prompt: string,
  locale: Locale = "en",
): TimeCapabilityResult {
  const detected =
    isTimeCapabilityPrompt(
      prompt,
    );

  if (!detected) {
    const timestamp =
      Date.now();

    return {
      detected: false,
      success: false,
      source: "utc",
      timeZone: "UTC",
      locale,
      timestamp,
      isoTimestamp:
        new Date(
          timestamp,
        ).toISOString(),
      formattedDateTime: "",
      formattedTime: "",
      formattedDate: "",
      timeZoneName: "",
      utcOffset: "GMT",
      content: "",
      code:
        "TIME_CAPABILITY_FAILED",
    };
  }

  const timestamp =
    Date.now();

  const isoTimestamp =
    new Date(
      timestamp,
    ).toISOString();

  const resolved =
    resolveTimeZone(
      prompt,
    );

  if (
    !isValidTimeZone(
      resolved.timeZone,
    )
  ) {
    return {
      detected: true,
      success: false,
      source:
        resolved.source,
      timeZone:
        resolved.timeZone,
      locale,
      timestamp,
      isoTimestamp,
      formattedDateTime: "",
      formattedTime: "",
      formattedDate: "",
      timeZoneName: "",
      utcOffset: "GMT",
      content:
        locale === "zh-CN"
          ? `无法识别或使用时区：${resolved.timeZone}`
          : locale === "ja"
            ? `タイムゾーンを認識または使用できません：${resolved.timeZone}`
            : `The requested time zone could not be recognized or used: ${resolved.timeZone}`,
      code:
        "TIME_CAPABILITY_TIMEZONE_INVALID",
    };
  }

  try {
    const formatters =
      createFormatters(
        locale,
        resolved.timeZone,
      );

    const date =
      new Date(
        timestamp,
      );

    const formattedDateTime =
      formatters.dateTime.format(
        date,
      );

    const formattedTime =
      formatters.time.format(
        date,
      );

    const formattedDate =
      formatters.date.format(
        date,
      );

    const timeZoneName =
      extractTimeZoneName(
        formatters.timeZoneName.format(
          date,
        ),
      );

    const utcOffset =
      extractUtcOffset(
        formatters.utcOffset.format(
          date,
        ),
      );

    const content =
      buildContent(
        locale,
        resolved.timeZone,
        formattedDateTime,
        formattedTime,
        formattedDate,
        timeZoneName,
        utcOffset,
      );

    return {
      detected: true,
      success: true,
      source:
        resolved.source,
      timeZone:
        resolved.timeZone,
      locale,
      timestamp,
      isoTimestamp,
      formattedDateTime,
      formattedTime,
      formattedDate,
      timeZoneName,
      utcOffset,
      content,
      code:
        "TIME_CAPABILITY_COMPLETED",
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "TIME_CAPABILITY_FAILED";

    return {
      detected: true,
      success: false,
      source:
        resolved.source,
      timeZone:
        resolved.timeZone,
      locale,
      timestamp,
      isoTimestamp,
      formattedDateTime: "",
      formattedTime: "",
      formattedDate: "",
      timeZoneName: "",
      utcOffset: "GMT",
      content:
        locale === "zh-CN"
          ? `时间能力执行失败：${message}`
          : locale === "ja"
            ? `時間機能の実行に失敗しました：${message}`
            : `Time capability execution failed: ${message}`,
      code:
        "TIME_CAPABILITY_FAILED",
    };
  }
}
