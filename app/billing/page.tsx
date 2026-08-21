import WorkspaceShell from "@/components/layout/WorkspaceShell";

import {
  AIOS_PLANS,
} from "@/lib/billing/plans";

export default function BillingPage() {
  return (
    <WorkspaceShell>
      <main
        style={{
          width: "100%",
          maxWidth: 1100,
          margin: "0 auto",
          padding: "24px 20px 40px",
          boxSizing: "border-box",
        }}
      >
        <header
          style={{
            marginBottom: 26,
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 800,
              letterSpacing:
                "0.08em",
              textTransform:
                "uppercase",
              color: "#6366f1",
            }}
          >
            AIOS PRODUCT
          </div>

          <h1
            style={{
              margin:
                "6px 0 0",
              fontSize: 30,
              color: "#0f172a",
            }}
          >
            Plans & Access
          </h1>

          <p
            style={{
              margin:
                "8px 0 0",
              color: "#64748b",
              fontSize: 14,
              maxWidth: 720,
            }}
          >
            AIOS capabilities are separated from
            payment providers so the core operating
            system can evolve independently.
          </p>
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(230px, 1fr))",
            gap: 16,
          }}
        >
          {Object.values(
            AIOS_PLANS,
          ).map((plan) => (
            <article
              key={plan.id}
              style={{
                position:
                  "relative",
                background:
                  "#ffffff",
                border:
                  plan.highlighted
                    ? "2px solid #6366f1"
                    : "1px solid #e5e7eb",
                borderRadius: 18,
                padding: 20,
                boxShadow:
                  "0 10px 30px rgba(15, 23, 42, 0.05)",
              }}
            >
              {plan.highlighted ? (
                <div
                  style={{
                    position:
                      "absolute",
                    top: -11,
                    right: 16,
                    padding:
                      "4px 8px",
                    borderRadius:
                      999,
                    background:
                      "#6366f1",
                    color:
                      "#ffffff",
                    fontSize:
                      10,
                    fontWeight:
                      800,
                  }}
                >
                  NEXT
                </div>
              ) : null}

              <div
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  fontWeight: 800,
                  textTransform:
                    "uppercase",
                }}
              >
                {plan.id}
              </div>

              <h2
                style={{
                  margin:
                    "7px 0 0",
                  color:
                    "#0f172a",
                  fontSize: 22,
                }}
              >
                {plan.name}
              </h2>

              <div
                style={{
                  marginTop: 8,
                  fontSize: 15,
                  fontWeight: 800,
                  color:
                    "#312e81",
                }}
              >
                {plan.priceLabel}
              </div>

              <p
                style={{
                  minHeight: 55,
                  margin:
                    "12px 0 16px",
                  color:
                    "#64748b",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                {plan.description}
              </p>

              <div
                style={{
                  display: "grid",
                  gap: 8,
                }}
              >
                {plan.capabilities.map(
                  (capability) => (
                    <div
                      key={
                        capability
                      }
                      style={{
                        fontSize:
                          12,
                        color:
                          "#334155",
                      }}
                    >
                      ✓{" "}
                      {capability}
                    </div>
                  ),
                )}
              </div>

              <div
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop:
                    "1px solid #eef2f7",
                  fontSize: 11,
                  color:
                    "#64748b",
                  lineHeight: 1.6,
                }}
              >
                Daily executions:{" "}
                {plan.limits
                  .executionsPerDay ??
                  "Unlimited"}
                <br />
                Memory items:{" "}
                {plan.limits
                  .memoryItems ??
                  "Unlimited"}
                <br />
                Automation jobs:{" "}
                {plan.limits
                  .automationJobs ??
                  "Unlimited"}
              </div>
            </article>
          ))}
        </div>

        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 14,
            background:
              "#f8fafc",
            color: "#64748b",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          Payments are not enabled yet. This
          foundation intentionally keeps AIOS
          capabilities independent from any
          payment provider so future web, iOS,
          and business billing can share the same
          entitlement layer.
        </div>
      </main>
    </WorkspaceShell>
  );
}
