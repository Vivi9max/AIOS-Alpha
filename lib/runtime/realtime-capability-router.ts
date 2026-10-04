import {
  executeTimeCapability,
  isTimeCapabilityPrompt,
  type TimeCapabilityResult,
} from "@/lib/runtime/time-capability";

export type RealtimeCapabilityType =
  | "time"
  | "weather"
  | "news"
  | "exchange-rate"
  | "market"
  | "unknown";

export type RealtimeCapabilityExecution =
  | "runtime"
  | "external-evidence-required"
  | "none";

export type RealtimeCapabilityCode =
  | "REALTIME_CAPABILITY_COMPLETED"
  | "REALTIME_CAPABILITY_EXTERNAL_EVIDENCE_REQUIRED"
  | "REALTIME_CAPABILITY_NOT_DETECTED"
  | "REALTIME_CAPABILITY_FAILED";

export interface RealtimeCapabilityRoute {
  detected: boolean;
  capability: RealtimeCapabilityType;
  execution:
    RealtimeCapabilityExecution;
  requiresExternalEvidence: boolean;
  reason: string;
  code: RealtimeCapabilityCode;
}

export interface RealtimeCapabilityResult {
  route: RealtimeCapabilityRoute;
  success: boolean;
  content: string;
  code:
    | RealtimeCapabilityCode
    | "TIME_CAPABILITY_COMPLETED"
    | "TIME_CAPABILITY_TIMEZONE_INVALID"
    | "TIME_CAPABILITY_FAILED";
  timeResult?: TimeCapabilityResult;
}

const WEATHER_PATTERNS: RegExp[] = [
  /\bweather\b/i,
  /\btemperature\b/i,
  /\bforecast\b/i,
  /\bwind\b/i,
  /\brain\b/i,
  /\bsnow\b/i,
  /天气/u,
  /气温/u,
  /温度/u,
  /天气预报/u,
  /下雨/u,
  /下雪/u,
  /天気/u,
  /気温/u,
  /天気予報/u,
  /雨/u,
  /雪/u,
];

const NEWS_PATTERNS: RegExp[] = [
  /\bnews\b/i,
  /\blatest news\b/i,
  /\bbreaking news\b/i,
  /\bheadlines\b/i,
  /\bwhat happened today\b/i,
  /新闻/u,
  /最新消息/u,
  /最新新闻/u,
  /今日新闻/u,
  /实时新闻/u,
  /ニュース/u,
  /最新ニュース/u,
  /今日のニュース/u,
];

const EXCHANGE_RATE_PATTERNS: RegExp[] = [
  /\bexchange rate\b/i,
  /\bexchange rates\b/i,
  /\bcurrency rate\b/i,
  /\bfx rate\b/i,
  /\bforex\b/i,
  /\bhow much is\b.*\b(?:usd|eur|jpy|cny|hkd|gbp)\b/i,
  /汇率/u,
  /货币汇率/u,
  /美元兑/u,
  /人民币兑/u,
  /日元兑/u,
  /港币兑/u,
  /為替/u,
  /為替レート/u,
  /通貨レート/u,
];

const MARKET_PATTERNS: RegExp[] = [
  /\bstock price\b/i,
  /\bstock prices\b/i,
  /\bshare price\b/i,
  /\bshare prices\b/i,
  /\bmarket price\b/i,
  /\bmarket prices\b/i,
  /\blive quote\b/i,
  /\brealtime quote\b/i,
  /\breal-time quote\b/i,
  /\bticker\b/i,
  /\bstock market\b/i,
  /\bcrypto price\b/i,
  /\bbitcoin price\b/i,
  /\bethereum price\b/i,
  /股价/u,
  /股票价格/u,
  /股票行情/u,
  /实时行情/u,
  /实时价格/u,
  /市场行情/u,
  /股票市场/u,
  /加密货币价格/u,
  /株価/u,
  /株価情報/u,
  /市場価格/u,
  /リアルタイム/u,
  /暗号資産/u,
];

const REALTIME_GENERIC_PATTERNS: RegExp[] = [
  /\brealtime\b/i,
  /\breal-time\b/i,
  /\blive\b/i,
  /\bcurrent\b/i,
  /\bnow\b/i,
  /实时/u,
  /实时数据/u,
  /即时/u,
  /当前/u,
  /现在/u,
  /即時/u,
  /リアルタイム/u,
  /現在/u,
];

function matchesAny(
  prompt: string,
  patterns: RegExp[],
): boolean {
  return patterns.some(
    (pattern) =>
      pattern.test(prompt),
  );
}

function normalizePrompt(
  prompt: string,
): string {
  return prompt
    .trim()
    .replace(/\s+/g, " ");
}

function detectCapability(
  prompt: string,
): RealtimeCapabilityType {
  if (
    isTimeCapabilityPrompt(
      prompt,
    )
  ) {
    return "time";
  }

  if (
    matchesAny(
      prompt,
      WEATHER_PATTERNS,
    )
  ) {
    return "weather";
  }

  if (
    matchesAny(
      prompt,
      NEWS_PATTERNS,
    )
  ) {
    return "news";
  }

  if (
    matchesAny(
      prompt,
      EXCHANGE_RATE_PATTERNS,
    )
  ) {
    return "exchange-rate";
  }

  if (
    matchesAny(
      prompt,
      MARKET_PATTERNS,
    )
  ) {
    return "market";
  }

  if (
    matchesAny(
      prompt,
      REALTIME_GENERIC_PATTERNS,
    )
  ) {
    return "unknown";
  }

  return "unknown";
}

function buildExternalReason(
  capability: RealtimeCapabilityType,
): string {
  switch (capability) {
    case "weather":
      return "Weather requires current external data and must not be generated from model memory.";

    case "news":
      return "News requires current external evidence and must not be generated from model memory.";

    case "exchange-rate":
      return "Exchange rates require current external market data and must not be generated from model memory.";

    case "market":
      return "Market prices require current external market data and verified timestamps.";

    case "unknown":
      return "The request appears to require realtime information, but no executable realtime provider has been selected.";

    default:
      return "External realtime evidence is required.";
  }
}

function buildLocalizedExternalReason(
  locale: "en" | "zh-CN" | "ja",
  capability: RealtimeCapabilityType,
): string {
  if (locale === "zh-CN") {
    switch (capability) {
      case "weather":
        return "天气属于实时外部数据，必须获取当前外部证据，不能使用模型记忆代替。";

      case "news":
        return "新闻属于实时外部信息，必须获取当前外部证据，不能使用模型记忆代替。";

      case "exchange-rate":
        return "汇率属于实时市场数据，必须获取当前外部数据，不能使用模型记忆代替。";

      case "market":
        return "市场价格属于实时市场数据，必须使用当前外部行情数据，并验证数据时间。";

      default:
        return "该请求需要实时外部信息，但当前没有选择可执行的实时数据提供方。";
    }
  }

  if (locale === "ja") {
    switch (capability) {
      case "weather":
        return "天気はリアルタイムの外部データが必要であり、モデルの記憶で代用してはいけません。";

      case "news":
        return "ニュースは最新の外部証拠が必要であり、モデルの記憶で代用してはいけません。";

      case "exchange-rate":
        return "為替レートは現在の外部市場データが必要であり、モデルの記憶で代用してはいけません。";

      case "market":
        return "市場価格は現在の外部市場データが必要であり、データ時刻を確認する必要があります。";

      default:
        return "このリクエストにはリアルタイムの外部情報が必要ですが、現在実行可能なリアルタイムプロバイダーが選択されていません。";
    }
  }

  return buildExternalReason(
    capability,
  );
}

function buildCompletedRoute(): RealtimeCapabilityRoute {
  return {
    detected: true,
    capability: "time",
    execution: "runtime",
    requiresExternalEvidence: false,
    reason:
      "Current time can be resolved directly from the runtime clock and IANA timezone rules.",
    code:
      "REALTIME_CAPABILITY_COMPLETED",
  };
}

function buildExternalRoute(
  capability: RealtimeCapabilityType,
): RealtimeCapabilityRoute {
  return {
    detected: true,
    capability,
    execution:
      "external-evidence-required",
    requiresExternalEvidence: true,
    reason:
      buildExternalReason(
        capability,
      ),
    code:
      "REALTIME_CAPABILITY_EXTERNAL_EVIDENCE_REQUIRED",
  };
}

function buildNotDetectedRoute(): RealtimeCapabilityRoute {
  return {
    detected: false,
    capability: "unknown",
    execution: "none",
    requiresExternalEvidence: false,
    reason:
      "No realtime capability was detected.",
    code:
      "REALTIME_CAPABILITY_NOT_DETECTED",
  };
}

export function routeRealtimeCapability(
  prompt: string,
): RealtimeCapabilityRoute {
  const normalized =
    normalizePrompt(prompt);

  if (
    normalized.length === 0
  ) {
    return buildNotDetectedRoute();
  }

  const capability =
    detectCapability(
      normalized,
    );

  if (
    capability === "time"
  ) {
    return buildCompletedRoute();
  }

  if (
    capability === "weather" ||
    capability === "news" ||
    capability ===
      "exchange-rate" ||
    capability === "market" ||
    capability === "unknown"
  ) {
    if (
      matchesAny(
        normalized,
        REALTIME_GENERIC_PATTERNS,
      ) ||
      capability !== "unknown"
    ) {
      return buildExternalRoute(
        capability,
      );
    }
  }

  return buildNotDetectedRoute();
}

export function isRealtimeCapabilityPrompt(
  prompt: string,
): boolean {
  return routeRealtimeCapability(
    prompt,
  ).detected;
}

export function isExternalRealtimeCapabilityPrompt(
  prompt: string,
): boolean {
  const route =
    routeRealtimeCapability(
      prompt,
    );

  return (
    route.detected &&
    route.requiresExternalEvidence
  );
}

export function executeRealtimeCapability(
  prompt: string,
  locale:
    | "en"
    | "zh-CN"
    | "ja" = "en",
): RealtimeCapabilityResult {
  const route =
    routeRealtimeCapability(
      prompt,
    );

  if (!route.detected) {
    return {
      route,
      success: false,
      content: "",
      code:
        "REALTIME_CAPABILITY_NOT_DETECTED",
    };
  }

  if (
    route.capability === "time"
  ) {
    const timeResult =
      executeTimeCapability(
        prompt,
        locale,
      );

    if (
      timeResult.success
    ) {
      return {
        route,
        success: true,
        content:
          timeResult.content,
        code:
          timeResult.code,
        timeResult,
      };
    }

    return {
      route: {
        ...route,
        code:
          "REALTIME_CAPABILITY_FAILED",
      },
      success: false,
      content:
        timeResult.content,
      code:
        timeResult.code,
      timeResult,
    };
  }

  return {
    route,
    success: false,
    content:
      buildLocalizedExternalReason(
        locale,
        route.capability,
      ),
    code:
      "REALTIME_CAPABILITY_EXTERNAL_EVIDENCE_REQUIRED",
  };
}

export function getRealtimeCapabilityDescription(
  capability: RealtimeCapabilityType,
): string {
  switch (capability) {
    case "time":
      return "Runtime clock and IANA timezone capability.";

    case "weather":
      return "External weather evidence capability.";

    case "news":
      return "External current-news evidence capability.";

    case "exchange-rate":
      return "External foreign-exchange evidence capability.";

    case "market":
      return "External realtime market-data capability.";

    default:
      return "Unresolved realtime capability.";
  }
}

export function getRealtimeCapabilityExecutionMode(
  capability: RealtimeCapabilityType,
): RealtimeCapabilityExecution {
  if (
    capability === "time"
  ) {
    return "runtime";
  }

  if (
    capability === "weather" ||
    capability === "news" ||
    capability ===
      "exchange-rate" ||
    capability === "market"
  ) {
    return "external-evidence-required";
  }

  return "none";
}
