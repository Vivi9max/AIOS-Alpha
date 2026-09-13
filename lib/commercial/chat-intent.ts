import type {
  Locale,
} from "@/lib/i18n";

export interface CommercialChatIntent {
  detected: boolean;

  title: string;
  description: string;
  successCriteria: string;

  stage:
    | "idea"
    | "validation"
    | "acquisition"
    | "conversion"
    | "delivery"
    | "retention"
    | "scaling";

  currency: string;

  revenueTarget: number;
  costTarget: number;
  customerTarget: number;

  /**
   * Number of days from objective creation
   * until the requested commercial deadline.
   *
   * null means no explicit deadline was supplied.
   */
  deadlineDays: number | null;
}

const UNSPECIFIED_CURRENCY =
  "UNSPECIFIED";

function normalize(
  value: string,
): string {
  return value
    .replace(/\s+/g, " ")
    .trim();
}

function parseNumber(
  value: string,
): number {
  const normalized =
    value
      .replace(/,/g, "")
      .trim();

  const number =
    Number.parseFloat(
      normalized,
    );

  if (!Number.isFinite(number)) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(number * 100) / 100,
  );
}

function parseMoney(
  prompt: string,
  patterns: RegExp[],
): number {
  for (const pattern of patterns) {
    const match =
      prompt.match(pattern);

    if (!match) {
      continue;
    }

    const value =
      parseNumber(match[1]);

    const unit =
      match[2]?.toLowerCase() ?? "";

    if (
      unit === "万" ||
      unit === "w"
    ) {
      return value * 10000;
    }

    if (unit === "k") {
      return value * 1000;
    }

    return value;
  }

  return 0;
}

function parseCustomers(
  prompt: string,
): number {
  const patterns = [
    /(\d[\d,]*(?:\.\d+)?)\s*(?:个|名)?\s*(?:付费客户|客户|顾客)/i,

    /(?:客户|顾客|付费客户)\s*(?:目标|数量)?\s*[:：]?\s*(\d[\d,]*(?:\.\d+)?)/i,

    /(\d[\d,]*(?:\.\d+)?)\s*(?:paying customers?|customers?|clients?)/i,

    /(?:customers?|clients?)\s*(?:target|goal)?\s*[:：]?\s*(\d[\d,]*(?:\.\d+)?)/i,

    /(\d[\d,]*(?:\.\d+)?)\s*(?:人|名)\s*(?:の)?(?:顧客|有料顧客)/i,

    /(?:顧客|有料顧客)\s*(?:目標|数)?\s*[:：]?\s*(\d[\d,]*(?:\.\d+)?)/i,
  ];

  for (const pattern of patterns) {
    const match =
      prompt.match(pattern);

    if (match) {
      return Math.max(
        0,
        Math.floor(
          parseNumber(match[1]),
        ),
      );
    }
  }

  return 0;
}

/**
 * Explicit currency only.
 *
 * Never infer currency from locale.
 * Never infer ambiguous symbols.
 */
function detectCurrency(
  prompt: string,
): string {
  const normalized =
    normalize(prompt);

  const isoCurrencies: Record<
    string,
    string
  > = {
    AED: "AED",
    AFN: "AFN",
    ALL: "ALL",
    AMD: "AMD",
    ANG: "ANG",
    AOA: "AOA",
    ARS: "ARS",
    AUD: "AUD",
    AWG: "AWG",
    AZN: "AZN",
    BAM: "BAM",
    BBD: "BBD",
    BDT: "BDT",
    BGN: "BGN",
    BHD: "BHD",
    BIF: "BIF",
    BMD: "BMD",
    BND: "BND",
    BOB: "BOB",
    BRL: "BRL",
    BSD: "BSD",
    BTN: "BTN",
    BWP: "BWP",
    BYN: "BYN",
    BZD: "BZD",
    CAD: "CAD",
    CDF: "CDF",
    CHF: "CHF",
    CLP: "CLP",
    CNY: "CNY",
    COP: "COP",
    CRC: "CRC",
    CUP: "CUP",
    CVE: "CVE",
    CZK: "CZK",
    DJF: "DJF",
    DKK: "DKK",
    DOP: "DOP",
    DZD: "DZD",
    EGP: "EGP",
    ERN: "ERN",
    ETB: "ETB",
    EUR: "EUR",
    FJD: "FJD",
    FKP: "FKP",
    GBP: "GBP",
    GEL: "GEL",
    GHS: "GHS",
    GIP: "GIP",
    GMD: "GMD",
    GNF: "GNF",
    GTQ: "GTQ",
    GYD: "GYD",
    HKD: "HKD",
    HNL: "HNL",
    HTG: "HTG",
    HUF: "HUF",
    IDR: "IDR",
    ILS: "ILS",
    INR: "INR",
    IQD: "IQD",
    IRR: "IRR",
    ISK: "ISK",
    JMD: "JMD",
    JOD: "JOD",
    JPY: "JPY",
    KES: "KES",
    KGS: "KGS",
    KHR: "KHR",
    KMF: "KMF",
    KPW: "KPW",
    KRW: "KRW",
    KWD: "KWD",
    KYD: "KYD",
    KZT: "KZT",
    LAK: "LAK",
    LBP: "LBP",
    LKR: "LKR",
    LRD: "LRD",
    LSL: "LSL",
    LYD: "LYD",
    MAD: "MAD",
    MDL: "MDL",
    MGA: "MGA",
    MKD: "MKD",
    MMK: "MMK",
    MNT: "MNT",
    MOP: "MOP",
    MRU: "MRU",
    MUR: "MUR",
    MVR: "MVR",
    MWK: "MWK",
    MXN: "MXN",
    MYR: "MYR",
    MZN: "MZN",
    NAD: "NAD",
    NGN: "NGN",
    NIO: "NIO",
    NOK: "NOK",
    NPR: "NPR",
    NZD: "NZD",
    OMR: "OMR",
    PAB: "PAB",
    PEN: "PEN",
    PGK: "PGK",
    PHP: "PHP",
    PKR: "PKR",
    PLN: "PLN",
    PYG: "PYG",
    QAR: "QAR",
    RON: "RON",
    RSD: "RSD",
    RUB: "RUB",
    RWF: "RWF",
    SAR: "SAR",
    SBD: "SBD",
    SCR: "SCR",
    SDG: "SDG",
    SEK: "SEK",
    SGD: "SGD",
    SHP: "SHP",
    SLE: "SLE",
    SOS: "SOS",
    SRD: "SRD",
    SSP: "SSP",
    STN: "STN",
    SYP: "SYP",
    SZL: "SZL",
    THB: "THB",
    TJS: "TJS",
    TMT: "TMT",
    TND: "TND",
    TOP: "TOP",
    TRY: "TRY",
    TTD: "TTD",
    TWD: "TWD",
    TZS: "TZS",
    UAH: "UAH",
    UGX: "UGX",
    USD: "USD",
    UYU: "UYU",
    UZS: "UZS",
    VED: "VED",
    VES: "VES",
    VND: "VND",
    VUV: "VUV",
    WST: "WST",
    XAF: "XAF",
    XCD: "XCD",
    XOF: "XOF",
    XPF: "XPF",
    YER: "YER",
    ZAR: "ZAR",
    ZMW: "ZMW",
    ZWL: "ZWL",
    BTC: "BTC",
    ETH: "ETH",
  };

  const isoPattern =
    new RegExp(
      `\\b(${Object.keys(
        isoCurrencies,
      ).join("|")})\\b`,
      "i",
    );

  const isoMatch =
    normalized.match(
      isoPattern,
    );

  if (isoMatch) {
    return (
      isoCurrencies[
        isoMatch[1].toUpperCase()
      ] ??
      UNSPECIFIED_CURRENCY
    );
  }

  const namedCurrencies: Array<
    [RegExp, string]
  > = [
    [
      /人民币|人民币元|元人民币|Chinese Yuan|Renminbi/i,
      "CNY",
    ],
    [
      /美元|美金|美刀|US dollars?|United States dollars?/i,
      "USD",
    ],
    [
      /日元|日本円|円|Japanese yen/i,
      "JPY",
    ],
    [
      /港币|港元|Hong Kong dollars?/i,
      "HKD",
    ],
    [
      /澳门元|澳门币|Macau pataca/i,
      "MOP",
    ],
    [
      /台币|新台币|台湾ドル|Taiwan dollars?/i,
      "TWD",
    ],
    [
      /韩元|韩国ウォン|Korean won/i,
      "KRW",
    ],
    [
      /新加坡元|新加坡币|Singapore dollars?/i,
      "SGD",
    ],
    [
      /澳元|澳大利亚元|Australian dollars?/i,
      "AUD",
    ],
    [
      /加元|加拿大元|Canadian dollars?/i,
      "CAD",
    ],
    [
      /新西兰元|纽元|New Zealand dollars?/i,
      "NZD",
    ],
    [
      /欧元|euro|euros/i,
      "EUR",
    ],
    [
      /英镑|pound sterling|British pounds?|sterling/i,
      "GBP",
    ],
    [
      /瑞士法郎|Swiss francs?/i,
      "CHF",
    ],
    [
      /瑞典克朗|Swedish kronor|Swedish krona/i,
      "SEK",
    ],
    [
      /挪威克朗|Norwegian kroner|Norwegian krone/i,
      "NOK",
    ],
    [
      /丹麦克朗|Danish kroner|Danish krone/i,
      "DKK",
    ],
    [
      /波兰兹罗提|波兰兹罗蒂|Polish zloty|Polish zlotys/i,
      "PLN",
    ],
    [
      /捷克克朗|Czech koruna|Czech korunas/i,
      "CZK",
    ],
    [
      /匈牙利福林|Hungarian forint/i,
      "HUF",
    ],
    [
      /俄罗斯卢布|卢布|Russian rubles?|Russian roubles?/i,
      "RUB",
    ],
    [
      /土耳其里拉|Turkish lira/i,
      "TRY",
    ],
    [
      /印度卢比|Indian rupees?/i,
      "INR",
    ],
    [
      /巴基斯坦卢比|Pakistani rupees?/i,
      "PKR",
    ],
    [
      /孟加拉塔卡|Bangladeshi taka/i,
      "BDT",
    ],
    [
      /泰铢|Thai baht/i,
      "THB",
    ],
    [
      /越南盾|Vietnamese dong/i,
      "VND",
    ],
    [
      /印尼盾|印尼卢比|Indonesian rupiah/i,
      "IDR",
    ],
    [
      /马来西亚林吉特|马来西亚令吉|Malaysian ringgit/i,
      "MYR",
    ],
    [
      /菲律宾比索|Philippine pesos?/i,
      "PHP",
    ],
    [
      /墨西哥比索|Mexican pesos?/i,
      "MXN",
    ],
    [
      /巴西雷亚尔|Brazilian reais?|Brazilian real/i,
      "BRL",
    ],
    [
      /阿根廷比索|Argentine pesos?/i,
      "ARS",
    ],
    [
      /智利比索|Chilean pesos?/i,
      "CLP",
    ],
    [
      /哥伦比亚比索|Colombian pesos?/i,
      "COP",
    ],
    [
      /秘鲁索尔|Peruvian soles?|Peruvian sol/i,
      "PEN",
    ],
    [
      /南非兰特|South African rand/i,
      "ZAR",
    ],
    [
      /尼日利亚奈拉|Nigerian naira/i,
      "NGN",
    ],
    [
      /肯尼亚先令|Kenyan shillings?/i,
      "KES",
    ],
    [
      /埃及镑|Egyptian pounds?/i,
      "EGP",
    ],
    [
      /以色列新谢克尔|以色列谢克尔|Israeli new shekels?|Israeli shekels?/i,
      "ILS",
    ],
    [
      /沙特里亚尔|Saudi riyals?/i,
      "SAR",
    ],
    [
      /阿联酋迪拉姆|UAE dirhams?|Emirati dirhams?/i,
      "AED",
    ],
    [
      /卡塔尔里亚尔|Qatari riyals?/i,
      "QAR",
    ],
    [
      /科威特第纳尔|Kuwaiti dinars?/i,
      "KWD",
    ],
    [
      /比特币|bitcoin/i,
      "BTC",
    ],
    [
      /以太币|以太坊|ether|ethereum/i,
      "ETH",
    ],
  ];

  for (
    const [
      pattern,
      code,
    ] of namedCurrencies
  ) {
    if (
      pattern.test(
        normalized,
      )
    ) {
      return code;
    }
  }

  const symbols: Array<
    [RegExp, string]
  > = [
    [/€/i, "EUR"],
    [/£/i, "GBP"],
    [/₹/i, "INR"],
    [/₩/i, "KRW"],
    [/₽/i, "RUB"],
    [/₺/i, "TRY"],
    [/฿/i, "THB"],
  ];

  for (
    const [
      pattern,
      code,
    ] of symbols
  ) {
    if (
      pattern.test(
        normalized,
      )
    ) {
      return code;
    }
  }

  return UNSPECIFIED_CURRENCY;
}

function parseDeadlineDays(
  prompt: string,
): number | null {
  const normalized =
    normalize(prompt);

  const patterns = [
    /(?:在|于|within|in)\s*(\d+)\s*(?:天|日|days?|d)\s*(?:内|以内)?/i,

    /(\d+)\s*(?:天|日)\s*(?:内|以内)/i,

    /(?:期限|截止|deadline|target date)\s*[:：]?\s*(?:in|within)?\s*(\d+)\s*(?:天|日|days?)/i,

    /(\d+)\s*(?:日間|日以内|日間以内)/i,
  ];

  for (const pattern of patterns) {
    const match =
      normalized.match(pattern);

    if (match) {
      const days =
        Number.parseInt(
          match[1],
          10,
        );

      if (
        Number.isFinite(days) &&
        days > 0
      ) {
        return Math.min(
          days,
          3650,
        );
      }
    }
  }

  const monthMatch =
    normalized.match(
      /(?:在|于|within|in)?\s*(\d+)\s*(?:个月|個月|months?|mo)\s*(?:内|以内)?/i,
    );

  if (monthMatch) {
    const months =
      Number.parseInt(
        monthMatch[1],
        10,
      );

    if (
      Number.isFinite(months) &&
      months > 0
    ) {
      return Math.min(
        months * 30,
        3650,
      );
    }
  }

  return null;
}

function inferStage(
  prompt: string,
):
  CommercialChatIntent["stage"] {
  if (
    /(?:扩大|规模化|增长|scale|scaling)/i.test(
      prompt,
    )
  ) {
    return "scaling";
  }

  if (
    /(?:复购|留存|retention|retain)/i.test(
      prompt,
    )
  ) {
    return "retention";
  }

  if (
    /(?:交付|delivery|deliver)/i.test(
      prompt,
    )
  ) {
    return "delivery";
  }

  if (
    /(?:成交|转化|conversion|convert)/i.test(
      prompt,
    )
  ) {
    return "conversion";
  }

  if (
    /(?:获客|客户|顾客|customer|customers|client|clients|acquisition|acquire|顧客|有料顧客)/i.test(
      prompt,
    )
  ) {
    return "acquisition";
  }

  return "validation";
}

function extractTitle(
  prompt: string,
  locale: Locale,
): string {
  const normalized =
    normalize(prompt);

  if (
    /第一个付费客户|首个付费客户|第一个客户/.test(
      normalized,
    )
  ) {
    return locale === "ja"
      ? "最初の有料顧客を獲得する"
      : locale === "en"
        ? "Acquire the first paying customer"
        : "获得第一个付费客户";
  }

  if (
    /first paying customer/i.test(
      normalized,
    )
  ) {
    return "Acquire the first paying customer";
  }

  if (
    /最初の有料顧客|最初の顧客/.test(
      normalized,
    )
  ) {
    return "最初の有料顧客を獲得する";
  }

  const colonIndex =
    normalized.search(
      /[:：]/,
    );

  if (colonIndex >= 0) {
    const candidate =
      normalize(
        normalized.slice(
          colonIndex + 1,
        ),
      );

    if (
      candidate &&
      candidate.length <= 100
    ) {
      return candidate;
    }
  }

  if (locale === "ja") {
    return "新しい商業目標";
  }

  if (locale === "en") {
    return "New commercial objective";
  }

  return "新的商业目标";
}

function isCommercialIntent(
  prompt: string,
): boolean {
  const normalized =
    normalize(prompt);

  const chinese =
    /(?:建立|创建|设定|制定|设置).{0,20}(?:商业目标|赚钱目标|收入目标|盈利目标|赚钱)|(?:真实赚钱目标|商业 Objective)/i.test(
      normalized,
    );

  const english =
    /(?:create|set|establish|define).{0,30}(?:commercial objective|revenue goal|business goal|money goal|profit goal)|commercial objective/i.test(
      normalized,
    );

  const japanese =
    /(?:商業目標|収益目標|収入目標).{0,20}(?:作成|設定|制定)|(?:商業目標を作成|商業目標を設定)/i.test(
      normalized,
    );

  return (
    chinese ||
    english ||
    japanese
  );
}

function emptyIntent(): CommercialChatIntent {
  return {
    detected: false,
    title: "",
    description: "",
    successCriteria: "",
    stage: "validation",
    currency:
      UNSPECIFIED_CURRENCY,
    revenueTarget: 0,
    costTarget: 0,
    customerTarget: 0,
    deadlineDays: null,
  };
}

export function detectCommercialChatIntent(
  prompt: string,
  locale: Locale,
): CommercialChatIntent {
  const cleanPrompt =
    normalize(prompt);

  if (
    !cleanPrompt ||
    !isCommercialIntent(
      cleanPrompt,
    )
  ) {
    return emptyIntent();
  }

  const currency =
    detectCurrency(
      cleanPrompt,
    );

  const revenueTarget =
    parseMoney(
      cleanPrompt,
      [
        /(?:收入|营收|营业额|销售额|revenue|sales)\s*(?:目标|target|goal)?\s*[:：]?\s*(?:¥|￥|\$|€|£|₹|₩|₽|₺|฿)?\s*(\d[\d,]*(?:\.\d+)?)\s*(万|w|k)?/i,

        /(?:target|goal|目标)[^。；;\n]{0,40}?(?:¥|￥|\$|€|£|₹|₩|₽|₺|฿)?\s*(\d[\d,]*(?:\.\d+)?)\s*(万|w|k)?/i,

        /(?:USD|CNY|JPY|HKD|MOP|TWD|KRW|SGD|AUD|CAD|EUR|GBP|CHF|SEK|NOK|DKK|INR|THB|VND|IDR|MYR|PHP|MXN|BRL|RUB|TRY|SAR|AED|QAR|KWD|BTC|ETH)\s*(\d[\d,]*(?:\.\d+)?)\s*(万|w|k)?/i,

        /(?:\$|€|£|₹|₩|₽|₺|฿)\s*(\d[\d,]*(?:\.\d+)?)\s*(万|w|k)?/i,
      ],
    );

  const costTarget =
    parseMoney(
      cleanPrompt,
      [
        /(?:成本|预算|cost|budget)\s*(?:目标|上限|target|limit|以内|maximum)?\s*[:：]?\s*(?:¥|￥|\$|€|£|₹|₩|₽|₺|฿)?\s*(\d[\d,]*(?:\.\d+)?)\s*(万|w|k)?/i,

        /(?:cost|budget)\s*(?:cap|limit|max(?:imum)?)?\s*[:：]?\s*(?:\$|€|£|₹|₩|₽|₺|฿)?\s*(\d[\d,]*(?:\.\d+)?)\s*(万|w|k)?/i,
      ],
    );

  const customerTarget =
    parseCustomers(
      cleanPrompt,
    );

  const deadlineDays =
    parseDeadlineDays(
      cleanPrompt,
    );

  const title =
    extractTitle(
      cleanPrompt,
      locale,
    );

  return {
    detected: true,

    title,

    description:
      cleanPrompt,

    successCriteria:
      cleanPrompt,

    stage:
      inferStage(
        cleanPrompt,
      ),

    currency,

    revenueTarget,

    costTarget,

    customerTarget,

    deadlineDays,
  };
}
