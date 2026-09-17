"use client";
import {
  useState,
} from "react";
type Status =
  | "verified"
  | "estimated"
  | "unknown";
interface FieldState {
  value: string;
  status: Status;
  evidence: string;
}
interface ResultData {
  success: boolean;
  verified: boolean;
  code: string;
  result?: {
    product: {
      name: string;
      category: string;
      currency: string;
    };
    supplierVerification: {
      verification: {
        verifiedFieldCount: number;
        estimatedFieldCount: number;
        unknownFieldCount: number;
        completeness: number;
        overallSupplierVerified: boolean;
      };
    };
    economics: {
      components: Array<{
        label: string;
        value?: number;
        status: Status;
      }>;
      totalUnitCost?: number;
      sellingPrice?: number;
      contributionSpacePerUnit?: number;
      contributionMarginPercent?: number;
      status: string;
      profitabilityVerified: false;
    };
    testConditions: {
      canCalculateUnitEconomics: boolean;
      canRunSmallTest: boolean;
      blockers: string[];
      requiredBeforeOrder: string[];
      requiredBeforeScale: string[];
    };
    evidenceSummary: {
      verified: string[];
      estimated: string[];
      unknown: string[];
    };
    boundaries: string[];
    nextActions: string[];
  };
  pipeline?: Record<string, boolean>;
  expected?: {
    sellingPrice: number;
    totalUnitCost: number;
    contributionSpace: number;
  };
  latencyMs?: number;
}
function makeField(
  value = "",
): FieldState {
  return {
    value,
    status: "unknown",
    evidence: "",
  };
}
function FieldEditor({
  label,
  field,
  onChange,
  placeholder,
}: {
  label: string;
  field: FieldState;
  onChange: (
    field: FieldState,
  ) => void;
  placeholder?: string;
}) {
  return (
    <div
      style={{
        border: "1px solid #ddd",
        borderRadius: 10,
        padding: 12,
        marginBottom: 10,
      }}
    >
      <strong>{label}</strong>
      <input
        value={field.value}
        onChange={(event) =>
          onChange({
            ...field,
            value:
              event.target.value,
          })
        }
        placeholder={placeholder}
        style={{
          width: "100%",
          boxSizing: "border-box",
          marginTop: 8,
          padding: 9,
        }}
      />
      <select
        value={field.status}
        onChange={(event) =>
          onChange({
            ...field,
            status:
              event.target.value as Status,
          })
        }
        style={{
          marginTop: 8,
          padding: 8,
          width: "100%",
        }}
      >
        <option value="unknown">
          Unknown - 未确认
        </option>
        <option value="verified">
          Verified - 已核验
        </option>
        <option value="estimated">
          Estimated - 估算
        </option>
      </select>
      <input
        value={field.evidence}
        onChange={(event) =>
          onChange({
            ...field,
            evidence:
              event.target.value,
          })
        }
        placeholder="证据来源/备注"
        style={{
          width: "100%",
          boxSizing: "border-box",
          marginTop: 8,
          padding: 9,
        }}
      />
    </div>
  );
}
export default function CommerceUnitEconomicsPage() {
  const [productName, setProductName] =
    useState("便携小风扇");
  const [category, setCategory] =
    useState("小家电");
  const [supplierUrl, setSupplierUrl] =
    useState(makeField());
  const [supplierName, setSupplierName] =
    useState(makeField());
  const [sku, setSku] =
    useState(makeField());
  const [specifications, setSpecifications] =
    useState(makeField());
  const [purchasePrice, setPurchasePrice] =
    useState(makeField());
  const [moq, setMoq] =
    useState(makeField());
  const [shippingPerUnit, setShippingPerUnit] =
    useState(makeField());
  const [inventory, setInventory] =
    useState(makeField());
  const [sellingPrice, setSellingPrice] =
    useState(makeField());
  const [platformFee, setPlatformFee] =
    useState(makeField());
  const [logistics, setLogistics] =
    useState(makeField());
  const [returnReserve, setReturnReserve] =
    useState(makeField());
  const [acquisition, setAcquisition] =
    useState(makeField());
  const [loading, setLoading] =
    useState(false);
  const [data, setData] =
    useState<ResultData | null>(null);
  function numberField(
    field: FieldState,
  ) {
    return {
      value:
        field.value === ""
          ? undefined
          : Number(field.value),
      status: field.status,
      evidence:
        field.evidence,
    };
  }
  function stringField(
    field: FieldState,
  ) {
    return {
      value:
        field.value || undefined,
      status: field.status,
      evidence:
        field.evidence,
    };
  }
  async function calculate() {
    setLoading(true);
    try {
      const accessKey =
        sessionStorage.getItem(
          "aios-founder-access-key",
        );
      const payload = {
        productName,
        category,
        supplierUrl:
          stringField(supplierUrl),
        supplierName:
          stringField(supplierName),
        sku: stringField(sku),
        specifications:
          stringField(
            specifications,
          ),
        purchasePrice:
          numberField(
            purchasePrice,
          ),
        moq: numberField(moq),
        shippingPerUnit:
          numberField(
            shippingPerUnit,
          ),
        inventory:
          numberField(inventory),
        marketSellingPrice:
          numberField(
            sellingPrice,
          ),
        platformFeePerUnit:
          numberField(
            platformFee,
          ),
        logisticsPerUnit:
          numberField(logistics),
        returnReservePerUnit:
          numberField(
            returnReserve,
          ),
        acquisitionCostPerUnit:
          numberField(
            acquisition,
          ),
        currency: "CNY",
      };
      const response =
        await fetch(
          "/api/founder/commerce/unit-economics",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              ...(accessKey
                ? {
                    Authorization:
                      `Bearer ${accessKey}`,
                  }
                : {}),
            },
            body: JSON.stringify(
              payload,
            ),
          },
        );
      const json =
        (await response.json()) as ResultData;
      setData(json);
    } catch {
      setData({
        success: false,
        verified: false,
        code:
          "C145_5_BROWSER_REQUEST_ERROR",
      });
    } finally {
      setLoading(false);
    }
  }
  async function runRegression() {
    setLoading(true);
    try {
      const accessKey =
        sessionStorage.getItem(
          "aios-founder-access-key",
        );
      const response =
        await fetch(
          "/api/founder/commerce/unit-economics",
          {
            method: "GET",
            headers: accessKey
              ? {
                  Authorization:
                    `Bearer ${accessKey}`,
                }
              : {},
          },
        );
      const json =
        (await response.json()) as ResultData;
      setData(json);
    } catch {
      setData({
        success: false,
        verified: false,
        code:
          "C145_5_BROWSER_REQUEST_ERROR",
      });
    } finally {
      setLoading(false);
    }
  }
  return (
    <main
      style={{
        maxWidth: 980,
        margin: "0 auto",
        padding: 20,
        fontFamily:
          "system-ui, sans-serif",
      }}
    >
      <h1>
        C145.5 Supplier Verification
        & Unit Economics
      </h1>
      <p>
        Founder-only - Real supplier
        verification and unit economics
      </p>
      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <button
          onClick={calculate}
          disabled={loading}
          style={{
            padding: "10px 16px",
          }}
        >
          {loading
            ? "Calculating..."
            : "Calculate Unit Economics"}
        </button>
        <button
          onClick={runRegression}
          disabled={loading}
          style={{
            padding: "10px 16px",
          }}
        >
          Run C145.5 Regression
        </button>
      </div>
      <h2>1. Product</h2>
      <input
        value={productName}
        onChange={(event) =>
          setProductName(
            event.target.value,
          )
        }
        placeholder="商品名称"
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 10,
          marginBottom: 8,
        }}
      />
      <input
        value={category}
        onChange={(event) =>
          setCategory(
            event.target.value,
          )
        }
        placeholder="商品分类"
        style={{
          width: "100%",
          boxSizing: "border-box",
          padding: 10,
          marginBottom: 16,
        }}
      />
      <h2>2. Supplier Verification</h2>
      <FieldEditor
        label="1688 供应商页面"
        field={supplierUrl}
        onChange={setSupplierUrl}
        placeholder="粘贴供应商页面 URL"
      />
      <FieldEditor
        label="供应商名称"
        field={supplierName}
        onChange={setSupplierName}
      />
      <FieldEditor
        label="SKU"
        field={sku}
        onChange={setSku}
      />
      <FieldEditor
        label="规格"
        field={specifications}
        onChange={setSpecifications}
      />
      <FieldEditor
        label="采购价 / 件"
        field={purchasePrice}
        onChange={setPurchasePrice}
        placeholder="例如 12"
      />
      <FieldEditor
        label="MOQ"
        field={moq}
        onChange={setMoq}
        placeholder="例如 1"
      />
      <FieldEditor
        label="供应商发货/单件物流"
        field={shippingPerUnit}
        onChange={setShippingPerUnit}
        placeholder="例如 4"
      />
      <FieldEditor
        label="可确认库存"
        field={inventory}
        onChange={setInventory}
        placeholder="例如 100"
      />
      <h2>3. Market & Cost Inputs</h2>
      <FieldEditor
        label="目标售价 / 件"
        field={sellingPrice}
        onChange={setSellingPrice}
        placeholder="例如 39.9"
      />
      <FieldEditor
        label="平台成本 / 件"
        field={platformFee}
        onChange={setPlatformFee}
        placeholder="没有确认就保持 Unknown"
      />
      <FieldEditor
        label="履约物流 / 件"
        field={logistics}
        onChange={setLogistics}
        placeholder="例如 5"
      />
      <FieldEditor
        label="售后/退货预留 / 件"
        field={returnReserve}
        onChange={setReturnReserve}
        placeholder="例如 2"
      />
      <FieldEditor
        label="内容/获客成本 / 件"
        field={acquisition}
        onChange={setAcquisition}
        placeholder="例如 4"
      />
      {data && (
        <section
          style={{
            marginTop: 30,
          }}
        >
          <h2>
            {data.verified
              ? "C145.5 VERIFIED"
              : data.success
                ? "C145.5 CALCULATED"
                : "C145.5 FAILED"}
          </h2>
          <p>
            Code:{" "}
            <strong>
              {data.code}
            </strong>
          </p>
          {data.result && (
            <>
              <h2>
                Supplier Verification
              </h2>
              <p>
                Completeness:{" "}
                {
                  data.result
                    .supplierVerification
                    .verification
                    .completeness
                }%
              </p>
              <p>
                Verified:{" "}
                {
                  data.result
                    .supplierVerification
                    .verification
                    .verifiedFieldCount
                }
                {" | "}
                Estimated:{" "}
                {
                  data.result
                    .supplierVerification
                    .verification
                    .estimatedFieldCount
                }
                {" | "}
                Unknown:{" "}
                {
                  data.result
                    .supplierVerification
                    .verification
                    .unknownFieldCount
                }
              </p>
              <h2>
                Unit Economics
              </h2>
              <div
                style={{
                  border:
                    "1px solid #ddd",
                  borderRadius: 10,
                  padding: 16,
                }}
              >
                <p>
                  售价:{" "}
                  {
                    data.result
                      .economics
                      .sellingPrice ??
                    "UNKNOWN"
                  }
                </p>
                <p>
                  单位总成本:{" "}
                  {
                    data.result
                      .economics
                      .totalUnitCost ??
                    "UNKNOWN"
                  }
                </p>
                <p>
                  单位贡献空间:{" "}
                  {
                    data.result
                      .economics
                      .contributionSpacePerUnit ??
                    "UNKNOWN"
                  }
                </p>
                <p>
                  Contribution Margin:{" "}
                  {
                    data.result
                      .economics
                      .contributionMarginPercent ??
                    "UNKNOWN"
                  }
                  %
                </p>
                <p>
                  Economics Status:{" "}
                  {
                    data.result
                      .economics
                      .status
                  }
                </p>
                <p>
                  Profitability Verified:{" "}
                  {
                    data.result
                      .economics
                      .profitabilityVerified
                    ? "YES"
                    : "NO"
                  }
                </p>
              </div>
              <h2>
                Test Conditions
              </h2>
              <p>
                Unit Economics:
                {" "}
                {data.result
                  .testConditions
                  .canCalculateUnitEconomics
                  ? "READY"
                  : "NOT READY"}
              </p>
              <p>
                Small Test:
                {" "}
                {data.result
                  .testConditions
                  .canRunSmallTest
                  ? "READY"
                  : "NOT READY"}
              </p>
              <h3>Blockers</h3>
              {data.result
                .testConditions
                .blockers.map(
                  (item) => (
                    <div
                      key={item}
                      style={{
                        margin:
                          "5px 0",
                      }}
                    >
                      - {item}
                    </div>
                  ),
                )}
              <h3>
                Required Before Order
              </h3>
              {data.result
                .testConditions
                .requiredBeforeOrder.map(
                  (item) => (
                    <div
                      key={item}
                      style={{
                        margin:
                          "5px 0",
                      }}
                    >
                      - {item}
                    </div>
                  ),
                )}
              <h3>
                Required Before Scale
              </h3>
              {data.result
                .testConditions
                .requiredBeforeScale.map(
                  (item) => (
                    <div
                      key={item}
                      style={{
                        margin:
                          "5px 0",
                      }}
                    >
                      - {item}
                    </div>
                  ),
                )}
              <h2>
                Evidence Status
              </h2>
              <p>
                Verified:{" "}
                {data.result
                  .evidenceSummary
                  .verified.join(
                    "、",
                  ) || "None"}
              </p>
              <p>
                Estimated:{" "}
                {data.result
                  .evidenceSummary
                  .estimated.join(
                    "、",
                  ) || "None"}
              </p>
              <p>
                Unknown:{" "}
                {data.result
                  .evidenceSummary
                  .unknown.join(
                    "、",
                  ) || "None"}
              </p>
              <h2>
                Next Actions
              </h2>
              {data.result
                .nextActions.map(
                  (item) => (
                    <div
                      key={item}
                      style={{
                        margin:
                          "5px 0",
                      }}
                    >
                      - {item}
                    </div>
                  ),
                )}
              <h2>
                Boundaries
              </h2>
              {data.result
                .boundaries.map(
                  (item) => (
                    <div
                      key={item}
                      style={{
                        margin:
                          "5px 0",
                      }}
                    >
                      - {item}
                    </div>
                  ),
                )}
              <h2>
                Full JSON
              </h2>
              <pre
                style={{
                  whiteSpace:
                    "pre-wrap",
                  wordBreak:
                    "break-word",
                  fontSize: 12,
                  background:
                    "#f5f5f5",
                  padding: 12,
                  borderRadius: 8,
                }}
              >
                {JSON.stringify(
                  data,
                  null,
                  2,
                )}
              </pre>
            </>
          )}
          {data.pipeline && (
            <>
              <h2>Regression Pipeline</h2>
              {Object.entries(
                data.pipeline,
              ).map(
                ([key, value]) => (
                  <div
                    key={key}
                    style={{
                      margin:
                        "5px 0",
                    }}
                  >
                    {value
                      ? "PASS"
                      : "FAIL"}{" "}
                    {key}
                  </div>
                ),
              )}
              {data.expected && (
                <p>
                  Expected:
                  {" "}
                  Selling Price{" "}
                  {
                    data.expected
                      .sellingPrice
                  }
                  {" | "}
                  Total Cost{" "}
                  {
                    data.expected
                      .totalUnitCost
                  }
                  {" | "}
                  Contribution{" "}
                  {
                    data.expected
                      .contributionSpace
                  }
                </p>
              )}
            </>
          )}
        </section>
      )}
    </main>
  );
}
