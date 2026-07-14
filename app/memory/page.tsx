"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

interface MemoryRecord {
  id: number;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export default function MemoryPage() {
  const [items, setItems] =
    useState<MemoryRecord[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const loadMemory = useCallback(
    async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(
          "/api/memory",
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          throw new Error(
            "Failed to load memory."
          );
        }

        const data = await response.json();

        setItems(
          Array.isArray(data.items)
            ? data.items
            : []
        );
      } catch {
        setError("记忆读取失败。");
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  async function handleClearMemory() {
    const confirmed = window.confirm(
      "确定清空全部记忆吗？"
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        "/api/memory",
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(
          "Failed to clear memory."
        );
      }

      setItems([]);
    } catch {
      setError("清空记忆失败。");
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "#f6f7fb",
      }}
    >
      <Header />

      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
        }}
      >
        <Sidebar />

        <main
          style={{
            flex: 1,
            padding: "32px 18px 48px",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 760,
              margin: "0 auto",
            }}
          >
            <header
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "flex-start",
                gap: 16,
                marginBottom: 22,
              }}
            >
              <div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: 30,
                  }}
                >
                  🧠 Memory
                </h1>

                <p
                  style={{
                    margin: "8px 0 0",
                    color: "#6b7280",
                  }}
                >
                  AIOS 当前保存的对话记忆。
                </p>
              </div>

              <button
                type="button"
                onClick={handleClearMemory}
                disabled={items.length === 0}
                style={{
                  padding: "10px 13px",
                  border:
                    "1px solid #fecaca",
                  borderRadius: 9,
                  background:
                    items.length > 0
                      ? "#fff7f7"
                      : "#f3f4f6",
                  color:
                    items.length > 0
                      ? "#b91c1c"
                      : "#9ca3af",
                  fontWeight: 700,
                }}
              >
                清空记忆
              </button>
            </header>

            {loading && (
              <div
                style={{
                  padding: 24,
                  background: "#ffffff",
                  borderRadius: 14,
                }}
              >
                正在读取记忆……
              </div>
            )}

            {!loading && error && (
              <div
                style={{
                  padding: 16,
                  marginBottom: 16,
                  border:
                    "1px solid #fecaca",
                  borderRadius: 12,
                  background: "#fff7f7",
                  color: "#b91c1c",
                }}
              >
                {error}
              </div>
            )}

            {!loading &&
              !error &&
              items.length === 0 && (
                <div
                  style={{
                    padding: "38px 18px",
                    background: "#ffffff",
                    border:
                      "1px dashed #cbd5e1",
                    borderRadius: 16,
                    textAlign: "center",
                    color: "#64748b",
                  }}
                >
                  还没有记忆。先在 Chat
                  中进行一轮对话。
                </div>
              )}

            {!loading &&
              items.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gap: 12,
                  }}
                >
                  {[...items]
                    .reverse()
                    .map((item) => (
                      <article
                        key={item.id}
                        style={{
                          padding: 16,
                          background:
                            "#ffffff",
                          border:
                            "1px solid #e5e7eb",
                          borderRadius: 14,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent:
                              "space-between",
                            gap: 12,
                            marginBottom: 9,
                          }}
                        >
                          <strong>
                            {item.role ===
                            "user"
                              ? "U · User"
                              : "AI · Assistant"}
                          </strong>

                          <time
                            style={{
                              color:
                                "#9ca3af",
                              fontSize: 12,
                            }}
                          >
                            {new Date(
                              item.timestamp
                            ).toLocaleString()}
                          </time>
                        </div>

                        <p
                          style={{
                            margin: 0,
                            lineHeight: 1.65,
                            whiteSpace:
                              "pre-wrap",
                            overflowWrap:
                              "anywhere",
                          }}
                        >
                          {item.content}
                        </p>
                      </article>
                    ))}
                </div>
              )}
          </div>
        </main>
      </div>
    </div>
  );
}