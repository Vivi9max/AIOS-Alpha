import {
  storage,
} from "@/lib/server-storage";

import {
  createUserStorageKey,
} from "@/lib/storage/data-scope";

export type CommercialObjectiveStatus =
  | "planned"
  | "active"
  | "paused"
  | "completed"
  | "cancelled";

export type CommercialStage =
  | "idea"
  | "validation"
  | "acquisition"
  | "conversion"
  | "delivery"
  | "retention"
  | "scaling";

export interface CommercialObjective {
  id: string;

  title: string;
  description: string;

  status: CommercialObjectiveStatus;
  stage: CommercialStage;

  currency: string;

  revenueTarget: number;
  revenueActual: number;

  costTarget: number;
  costActual: number;

  customerTarget: number;
  customerActual: number;

  outcomeId: string | null;
  taskId: string | null;

  successCriteria: string;

  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

export interface CommercialOverview {
  objectives: CommercialObjective[];

  activeObjective: CommercialObjective | null;

  revenueTarget: number;
  revenueActual: number;
  revenueGap: number;

  customerTarget: number;
  customerActual: number;
  customerGap: number;

  progress: number;

  status:
    | "no-objective"
    | "active"
    | "completed"
    | "paused";
}

export interface CreateCommercialObjectiveInput {
  title: string;
  description?: string;

  status?: CommercialObjectiveStatus;
  stage?: CommercialStage;

  currency?: string;

  revenueTarget?: number;
  costTarget?: number;
  customerTarget?: number;

  outcomeId?: string | null;
  taskId?: string | null;

  successCriteria?: string;
}

export interface UpdateCommercialObjectiveInput {
  title?: string;
  description?: string;

  status?: CommercialObjectiveStatus;
  stage?: CommercialStage;

  currency?: string;

  revenueTarget?: number;
  revenueActual?: number;

  costTarget?: number;
  costActual?: number;

  customerTarget?: number;
  customerActual?: number;

  outcomeId?: string | null;
  taskId?: string | null;

  successCriteria?: string;
}

const STORAGE_RESOURCE =
  "commercial-objectives";

const MAX_OBJECTIVES = 100;

const UNSPECIFIED_CURRENCY =
  "UNSPECIFIED";

/**
 * Supported ISO-4217-style currency codes.
 *
 * We intentionally accept explicit codes rather than
 * inferring currency from locale.
 */
const CURRENCY_CODES = new Set([
  "AED",
  "AFN",
  "ALL",
  "AMD",
  "ANG",
  "AOA",
  "ARS",
  "AUD",
  "AWG",
  "AZN",
  "BAM",
  "BBD",
  "BDT",
  "BGN",
  "BHD",
  "BIF",
  "BMD",
  "BND",
  "BOB",
  "BRL",
  "BSD",
  "BTN",
  "BWP",
  "BYN",
  "BZD",
  "CAD",
  "CDF",
  "CHF",
  "CLP",
  "CNY",
  "COP",
  "CRC",
  "CUP",
  "CVE",
  "CZK",
  "DJF",
  "DKK",
  "DOP",
  "DZD",
  "EGP",
  "ERN",
  "ETB",
  "EUR",
  "FJD",
  "FKP",
  "GBP",
  "GEL",
  "GHS",
  "GIP",
  "GMD",
  "GNF",
  "GTQ",
  "GYD",
  "HKD",
  "HNL",
  "HTG",
  "HUF",
  "IDR",
  "ILS",
  "INR",
  "IQD",
  "IRR",
  "ISK",
  "JMD",
  "JOD",
  "JPY",
  "KES",
  "KGS",
  "KHR",
  "KMF",
  "KPW",
  "KRW",
  "KWD",
  "KYD",
  "KZT",
  "LAK",
  "LBP",
  "LKR",
  "LRD",
  "LSL",
  "LYD",
  "MAD",
  "MDL",
  "MGA",
  "MKD",
  "MMK",
  "MNT",
  "MOP",
  "MRU",
  "MUR",
  "MVR",
  "MWK",
  "MXN",
  "MYR",
  "MZN",
  "NAD",
  "NGN",
  "NIO",
  "NOK",
  "NPR",
  "NZD",
  "OMR",
  "PAB",
  "PEN",
  "PGK",
  "PHP",
  "PKR",
  "PLN",
  "PYG",
  "QAR",
  "RON",
  "RSD",
  "RUB",
  "RWF",
  "SAR",
  "SBD",
  "SCR",
  "SDG",
  "SEK",
  "SGD",
  "SHP",
  "SLE",
  "SOS",
  "SRD",
  "SSP",
  "STN",
  "SYP",
  "SZL",
  "THB",
  "TJS",
  "TMT",
  "TND",
  "TOP",
  "TRY",
  "TTD",
  "TWD",
  "TZS",
  "UAH",
  "UGX",
  "USD",
  "UYU",
  "UZS",
  "VED",
  "VES",
  "VND",
  "VUV",
  "WST",
  "XAF",
  "XCD",
  "XOF",
  "XPF",
  "YER",
  "ZAR",
  "ZMW",
  "ZWL",

  // Digital currencies explicitly named by the user.
  "BTC",
  "ETH",
]);

function storageKey(): string {
  return createUserStorageKey(
    STORAGE_RESOURCE,
  );
}

function createId(): string {
  return [
    "commercial",
    Date.now().toString(36),
    Math.random()
      .toString(36)
      .slice(2, 9),
  ].join("-");
}

function normalizeText(
  value: unknown,
  maxLength: number,
): string {
  if (
    typeof value !==
    "string"
  ) {
    return "";
  }

  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizeMoney(
  value: unknown,
): number {
  const number =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(
      number,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(
      number * 100,
    ) / 100,
  );
}

function normalizeCount(
  value: unknown,
): number {
  const number =
    typeof value === "number"
      ? value
      : Number(value);

  if (
    !Number.isFinite(
      number,
    )
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(number),
  );
}

/**
 * Normalize an explicitly supplied currency.
 *
 * Policy:
 * 1. Explicit ISO code wins.
 * 2. Explicit currency names are mapped.
 * 3. Unambiguous currency symbols are accepted.
 * 4. Ambiguous symbols such as "$", "¥" and "￥"
 *    are NEVER guessed.
 * 5. Locale is NEVER used to infer currency.
 * 6. Missing / unknown currency becomes UNSPECIFIED.
 */
function normalizeCurrency(
  value: unknown,
): string {
  const raw =
    normalizeText(
      value,
      64,
    );

  if (!raw) {
    return UNSPECIFIED_CURRENCY;
  }

  const normalized =
    raw.toUpperCase();

  if (
    CURRENCY_CODES.has(
      normalized,
    )
  ) {
    return normalized;
  }

  const compact =
    raw
      .replace(/\s+/g, " ")
      .trim();

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
      /日元|日本円|Japanese yen/i,
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
      /俄罗斯卢布|俄罗​​斯卢布|卢布|Russian rubles?|Russian roubles?/i,
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
        compact,
      )
    ) {
      return code;
    }
  }

  /**
   * Only symbols with a single unambiguous
   * interpretation are accepted.
   *
   * "$" is ambiguous.
   * "¥" and "￥" are ambiguous.
   */
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
        compact,
      )
    ) {
      return code;
    }
  }

  return UNSPECIFIED_CURRENCY;
}

function normalizeStatus(
  value: unknown,
): CommercialObjectiveStatus {
  if (
    value === "active" ||
    value === "paused" ||
    value === "completed" ||
    value === "cancelled"
  ) {
    return value;
  }

  return "planned";
}

function normalizeStage(
  value: unknown,
): CommercialStage {
  if (
    value === "validation" ||
    value === "acquisition" ||
    value === "conversion" ||
    value === "delivery" ||
    value === "retention" ||
    value === "scaling"
  ) {
    return value;
  }

  return "idea";
}

function normalizeObjective(
  value: unknown,
): CommercialObjective | null {
  if (
    !value ||
    typeof value !==
      "object"
  ) {
    return null;
  }

  const item =
    value as Partial<
      CommercialObjective
    >;

  if (
    typeof item.id !==
      "string" ||
    typeof item.title !==
      "string" ||
    typeof item.description !==
      "string" ||
    typeof item.successCriteria !==
      "string" ||
    typeof item.createdAt !==
      "number" ||
    typeof item.updatedAt !==
      "number"
  ) {
    return null;
  }

  return {
    id: item.id,
    title:
      normalizeText(
        item.title,
        200,
      ),
    description:
      normalizeText(
        item.description,
        2000,
      ),

    status:
      normalizeStatus(
        item.status,
      ),

    stage:
      normalizeStage(
        item.stage,
      ),

    currency:
      normalizeCurrency(
        item.currency,
      ),

    revenueTarget:
      normalizeMoney(
        item.revenueTarget,
      ),

    revenueActual:
      normalizeMoney(
        item.revenueActual,
      ),

    costTarget:
      normalizeMoney(
        item.costTarget,
      ),

    costActual:
      normalizeMoney(
        item.costActual,
      ),

    customerTarget:
      normalizeCount(
        item.customerTarget,
      ),

    customerActual:
      normalizeCount(
        item.customerActual,
      ),

    outcomeId:
      typeof item.outcomeId ===
        "string"
        ? item.outcomeId
        : null,

    taskId:
      typeof item.taskId ===
        "string"
        ? item.taskId
        : null,

    successCriteria:
      normalizeText(
        item.successCriteria,
        1000,
      ),

    createdAt:
      item.createdAt,

    updatedAt:
      item.updatedAt,

    completedAt:
      typeof item.completedAt ===
        "number"
        ? item.completedAt
        : undefined,
  };
}

async function readObjectives(): Promise<
  CommercialObjective[]
> {
  const stored =
    await storage.get<
      unknown[]
    >(
      storageKey(),
    );

  if (
    !Array.isArray(
      stored,
    )
  ) {
    return [];
  }

  return stored
    .map(
      normalizeObjective,
    )
    .filter(
      (
        item,
      ): item is CommercialObjective =>
        item !== null,
    )
    .slice(
      -MAX_OBJECTIVES,
    );
}

async function writeObjectives(
  objectives: CommercialObjective[],
): Promise<void> {
  await storage.set(
    storageKey(),
    objectives.slice(
      -MAX_OBJECTIVES,
    ),
  );
}

export async function listCommercialObjectives(): Promise<
  CommercialObjective[]
> {
  const objectives =
    await readObjectives();

  return objectives.sort(
    (
      first,
      second,
    ) =>
      second.updatedAt -
      first.updatedAt,
  );
}

export async function getCommercialObjective(
  id: string,
): Promise<
  CommercialObjective | null
> {
  const objectives =
    await readObjectives();

  return (
    objectives.find(
      (
        item,
      ) =>
        item.id === id,
    ) ?? null
  );
}

export async function createCommercialObjective(
  input: CreateCommercialObjectiveInput,
): Promise<CommercialObjective> {
  const title =
    normalizeText(
      input.title,
      200,
    );

  if (!title) {
    throw new Error(
      "Commercial objective title is required.",
    );
  }

  const objectives =
    await readObjectives();

  const duplicate =
    objectives.find(
      (
        item,
      ) =>
        item.status !==
          "cancelled" &&
        item.status !==
          "completed" &&
        item.title
          .toLowerCase() ===
          title.toLowerCase(),
    );

  if (duplicate) {
    throw new Error(
      `DUPLICATE_COMMERCIAL_OBJECTIVE:${duplicate.id}`,
    );
  }

  const now =
    Date.now();

  const objective:
    CommercialObjective =
    {
      id: createId(),

      title,

      description:
        normalizeText(
          input.description,
          2000,
        ),

      status:
        normalizeStatus(
          input.status ??
            "planned",
        ),

      stage:
        normalizeStage(
          input.stage ??
            "validation",
        ),

      currency:
        normalizeCurrency(
          input.currency,
        ),

      revenueTarget:
        normalizeMoney(
          input.revenueTarget,
        ),

      revenueActual: 0,

      costTarget:
        normalizeMoney(
          input.costTarget,
        ),

      costActual: 0,

      customerTarget:
        normalizeCount(
          input.customerTarget,
        ),

      customerActual: 0,

      outcomeId:
        input.outcomeId ??
        null,

      taskId:
        input.taskId ??
        null,

      successCriteria:
        normalizeText(
          input.successCriteria,
          1000,
        ) ||
        "Generate measurable commercial progress and record verified business results.",

      createdAt: now,
      updatedAt: now,
    };

  objectives.push(
    objective,
  );

  await writeObjectives(
    objectives,
  );

  return objective;
}

export async function updateCommercialObjective(
  id: string,
  updates: UpdateCommercialObjectiveInput,
): Promise<
  CommercialObjective | null
> {
  const objectives =
    await readObjectives();

  const index =
    objectives.findIndex(
      (
        item,
      ) =>
        item.id === id,
    );

  if (index === -1) {
    return null;
  }

  const current =
    objectives[index];

  const status =
    updates.status ??
    current.status;

  const updated:
    CommercialObjective =
    {
      ...current,

      title:
        updates.title ===
          undefined
          ? current.title
          : normalizeText(
              updates.title,
              200,
            ) ||
            current.title,

      description:
        updates.description ===
          undefined
          ? current.description
          : normalizeText(
              updates.description,
              2000,
            ),

      status,

      stage:
        updates.stage ===
          undefined
          ? current.stage
          : normalizeStage(
              updates.stage,
            ),

      currency:
        updates.currency ===
          undefined
          ? current.currency
          : normalizeCurrency(
              updates.currency,
            ),

      revenueTarget:
        updates.revenueTarget ===
          undefined
          ? current.revenueTarget
          : normalizeMoney(
              updates.revenueTarget,
            ),

      revenueActual:
        updates.revenueActual ===
          undefined
          ? current.revenueActual
          : normalizeMoney(
              updates.revenueActual,
            ),

      costTarget:
        updates.costTarget ===
          undefined
          ? current.costTarget
          : normalizeMoney(
              updates.costTarget,
            ),

      costActual:
        updates.costActual ===
          undefined
          ? current.costActual
          : normalizeMoney(
              updates.costActual,
            ),

      customerTarget:
        updates.customerTarget ===
          undefined
          ? current.customerTarget
          : normalizeCount(
              updates.customerTarget,
            ),

      customerActual:
        updates.customerActual ===
          undefined
          ? current.customerActual
          : normalizeCount(
              updates.customerActual,
            ),

      outcomeId:
        updates.outcomeId ===
          undefined
          ? current.outcomeId
          : updates.outcomeId,

      taskId:
        updates.taskId ===
          undefined
          ? current.taskId
          : updates.taskId,

      successCriteria:
        updates.successCriteria ===
          undefined
          ? current.successCriteria
          : normalizeText(
              updates.successCriteria,
              1000,
            ),

      completedAt:
        status ===
          "completed"
          ? current.completedAt ??
            Date.now()
          : current.completedAt,

      updatedAt:
        Date.now(),
    };

  objectives[index] =
    updated;

  await writeObjectives(
    objectives,
  );

  return updated;
}

export async function getCommercialOverview(): Promise<
  CommercialOverview
> {
  const objectives =
    await listCommercialObjectives();

  const activeObjective =
    objectives.find(
      (
        item,
      ) =>
        item.status ===
        "active",
    ) ?? null;

  const target =
    activeObjective ??
    objectives.find(
      (
        item,
      ) =>
        item.status ===
        "planned",
    ) ??
    null;

  if (!target) {
    return {
      objectives,
      activeObjective: null,

      revenueTarget: 0,
      revenueActual: 0,
      revenueGap: 0,

      customerTarget: 0,
      customerActual: 0,
      customerGap: 0,

      progress: 0,

      status:
        "no-objective",
    };
  }

  const revenueProgress =
    target.revenueTarget > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              (target.revenueActual /
                target.revenueTarget) *
                100,
            ),
          ),
        )
      : 0;

  const customerProgress =
    target.customerTarget > 0
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(
              (target.customerActual /
                target.customerTarget) *
                100,
            ),
          ),
        )
      : 0;

  const progress =
    target.revenueTarget > 0 &&
    target.customerTarget > 0
      ? Math.round(
          (revenueProgress +
            customerProgress) /
            2,
        )
      : Math.max(
          revenueProgress,
          customerProgress,
        );

  const status =
    target.status ===
      "completed"
      ? "completed"
      : target.status ===
          "paused"
        ? "paused"
        : "active";

  return {
    objectives,
    activeObjective,

    revenueTarget:
      target.revenueTarget,

    revenueActual:
      target.revenueActual,

    revenueGap:
      Math.max(
        0,
        target.revenueTarget -
          target.revenueActual,
      ),

    customerTarget:
      target.customerTarget,

    customerActual:
      target.customerActual,

    customerGap:
      Math.max(
        0,
        target.customerTarget -
          target.customerActual,
      ),

    progress,

    status,
  };
}
