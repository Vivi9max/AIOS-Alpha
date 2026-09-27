"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";
import {
  chatPanelCopy,
} from "@/lib/i18n/chat-panel";
import {
  clearAIOSInputFiles,
  getAIOSInputFiles,
} from "@/lib/runtime/input/aios-input-browser-store";
import {
  executeAIOSInputUnderstandingBridge,
} from "@/lib/runtime/input/aios-input-understanding-bridge";
import type {
  AIOSInputItem,
} from "@/lib/runtime/input/aios-input-types";
import ChatInput from "./ChatInput";
import MessageList, {
  type ChatMessage,
} from "./MessageList";
interface MemoryRecord {
  id: number;
  role:
    | "user"
    | "assistant";
  content: string;
  timestamp: number;
}
interface CNChatResponse {
  success?: boolean;
  code?: string;
  content?: string;
  provider?: string;
  requestedProvider?: string;
  fallbackUsed?: boolean;
  error?: string;
  latencyMs?: number;
  conversation?: MemoryRecord[];
  inputUnderstanding?: {
    understoodCount?: number;
    pendingCount?: number;
    failedCount?: number;
  };
}
interface CNRuntimeStatus {
  success?: boolean;
  configuredProviders?: {
    deepseek?: boolean;
    qwen?: boolean;
  };
  selectedProvider?: string;
  fallbackProvider?: string;
}
function isRuntimeWrapper(
  content: string,
): boolean {
  const raw =
    content.trim();
  if (!raw) {
    return false;
  }
  return (
    raw.includes(
      "你是 AIOS Runtime 的执行引擎",
    ) &&
    raw.includes(
      "内部执行步骤：",
    ) &&
    raw.includes(
      "最终回答规则：",
    )
  );
}
function sanitizeMessages(
  memory: MemoryRecord[],
): ChatMessage[] {
  return memory
    .filter(
      (item) =>
        (
          item.role === "user" ||
          item.role === "assistant"
        ) &&
        !isRuntimeWrapper(
          item.content,
        ),
    )
    .map(
      (item) => ({
        id: item.id,
        role: item.role,
        content: item.content,
      }),
    );
}
function buildInputSummary(
  inputs: AIOSInputItem[],
): string {
  const names =
    inputs
      .map(
        (item) =>
          item.metadata.name,
      )
      .filter(
        (
          name,
        ): name is string =>
          typeof name ===
            "string" &&
          name.trim()
            .length > 0,
      );
  if (
    names.length ===
    0
  ) {
    return `Attached inputs: ${inputs.length}`;
  }
  return `Attached inputs: ${names.join(", ")}`;
}
function buildEvidencePrompt(
  prompt: string,
  inputs: AIOSInputItem[],
  locale: string,
): string {
  const evidence =
    inputs
      .filter(
        (input) =>
          input.processingStatus ===
            "ready" &&
          typeof input.extractedText ===
            "string" &&
          input.extractedText
            .trim()
            .length > 0,
      )
      .map(
        (input) => {
          const name =
            input.metadata.name ??
            input.id;
          return [
            `Input: ${name}`,
            "Status: ready",
            "Evidence:",
            input.extractedText!.trim(),
          ].join("\n");
        },
      );
  const userPrompt =
    prompt ||
    (
      locale === "zh-CN"
        ? "请分析我上传的输入。"
        : locale === "ja"
          ? "アップロードした入力を分析してください。"
          : "Please analyze the uploaded input."
    );
  if (
    evidence.length ===
    0
  ) {
    return userPrompt;
  }
  const evidenceLabel =
    locale === "zh-CN"
      ? "以下内容来自 AIOS Input Understanding 对用户上传输入的实际处理结果。它属于输入证据，不是自动确认的事实。请明确区分证据与推断。"
      : locale === "ja"
        ? "以下は AIOS Input Understanding が入力から取得した証拠です。自動的に事実と確定された情報ではありません。証拠と推測を明確に区別してください。"
        : "The following is evidence produced by AIOS Input Understanding. It is not automatically verified as fact. Clearly distinguish evidence from inference.";
  return [
    userPrompt,
    "",
    "=== AIOS CN INPUT EVIDENCE ===",
    evidenceLabel,
    "",
    ...evidence,
    "=== END AIOS CN INPUT EVIDENCE ===",
  ].join("\n");
}
function buildFailureMessage(
  locale: string,
  understoodCount: number,
  pendingCount: number,
  failedCount: number,
): string {
  if (
    locale === "zh-CN"
  ) {
    return [
      "输入已接收，但当前没有足够的可用理解证据。",
      `已理解：${understoodCount}`,
      `待处理：${pendingCount}`,
      `失败：${failedCount}`,
      "AIOS CN 未将未解析的文件内容当作已读取事实继续回答。",
    ].join("\n");
  }
  if (
    locale === "ja"
  ) {
    return [
      "入力を受け付けましたが、利用可能な理解エビデンスが不足しています。",
      `理解済み：${understoodCount}`,
      `保留：${pendingCount}`,
      `失敗：${failedCount}`,
      "AIOS CN は未解析のファイルを読み取り済みの事実として扱いません。",
    ].join("\n");
  }
  return [
    "The input was received, but there is not enough usable understanding evidence.",
    `Understood: ${understoodCount}`,
    `Pending: ${pendingCount}`,
    `Failed: ${failedCount}`,
    "AIOS CN will not treat unprocessed files as already-read facts.",
  ].join("\n");
}
function localized(
  locale: string,
  zh: string,
  en: string,
  ja: string,
): string {
  if (
    locale === "ja"
  ) {
    return ja;
  }
  if (
    locale === "en"
  ) {
    return en;
  }
  return zh;
}
export default function AIOSCNChatPanel() {
  const {
    locale,
  } = useLanguage();
  const copy =
    chatPanelCopy[locale];
  const [
    messages,
    setMessages,
  ] = useState<ChatMessage[]>(
    [],
  );
  const [
    loading,
    setLoading,
  ] = useState(false);
  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(true);
  const [
    runtimeStatus,
    setRuntimeStatus,
  ] = useState<CNRuntimeStatus | null>(
    null,
  );
  const scrollRef =
    useRef<HTMLDivElement | null>(
      null,
    );
  const scrollToBottom =
    useCallback(
      (
        behavior:
          | ScrollBehavior
          = "smooth",
      ) => {
        window.requestAnimationFrame(
          () => {
            const element =
              scrollRef.current;
            if (!element) {
              return;
            }
            element.scrollTo({
              top:
                element.scrollHeight,
              behavior,
            });
          },
        );
      },
      [],
    );
  const loadHistory =
    useCallback(
      async () => {
        setHistoryLoading(true);
        try {
          const response =
            await fetch(
              "/api/memory",
              {
                cache:
                  "no-store",
                credentials:
                  "same-origin",
              },
            );
          if (!response.ok) {
            throw new Error(
              "Failed to load chat history.",
            );
          }
          const data =
            await response.json();
          const memory:
            MemoryRecord[] =
            Array.isArray(
              data.items,
            )
              ? data.items
              : [];
          const restored =
            sanitizeMessages(
              memory,
            );
          setMessages(
            restored.length > 0
              ? restored
              : [
                  {
                    role:
                      "assistant",
                    content:
                      localized(
                        locale,
                        "AIOS CN 已准备就绪。可以直接输入问题，也可以使用相机、相册、文件或语音输入。",
                        "AIOS CN is ready. You can type a question or use camera, photos, files, or voice input.",
                        "AIOS CN の準備が完了しました。質問を入力するか、カメラ、写真、ファイル、音声入力を使用できます。",
                      ),
                  },
                ],
          );
        } catch (error) {
          console.error(
            "[AIOS CN History]",
            error,
          );
        } finally {
          setHistoryLoading(false);
        }
      },
      [locale],
    );
  const loadRuntimeStatus =
    useCallback(
      async () => {
        try {
          const response =
            await fetch(
              "/api/cn/runtime",
              {
                cache:
                  "no-store",
                credentials:
                  "same-origin",
              },
            );
          if (!response.ok) {
            return;
          }
          const data =
            (await response.json()) as CNRuntimeStatus;
          setRuntimeStatus(
            data,
          );
        } catch (error) {
          console.error(
            "[AIOS CN Runtime Status]",
            error,
          );
        }
      },
      [],
    );
  useEffect(() => {
    void Promise.all([
      loadHistory(),
      loadRuntimeStatus(),
    ]);
  }, [
    loadHistory,
    loadRuntimeStatus,
  ]);
  useEffect(() => {
    scrollToBottom(
      historyLoading
        ? "auto"
        : "smooth",
    );
  }, [
    messages,
    loading,
    historyLoading,
    scrollToBottom,
  ]);
  function handleMessageDeleted(
    messageId: number,
  ) {
    setMessages(
      (current) =>
        current.filter(
          (message) =>
            message.id !==
            messageId,
        ),
    );
  }
  async function handleSend(
    prompt: string,
    inputs?: AIOSInputItem[],
  ) {
    const cleanPrompt =
      prompt.trim();
    const normalizedInputs =
      Array.isArray(inputs)
        ? inputs
        : [];
    if (
      (
        !cleanPrompt &&
        normalizedInputs.length ===
          0
      ) ||
      loading
    ) {
      return;
    }
    const userContent =
      cleanPrompt ||
      buildInputSummary(
        normalizedInputs,
      );
    setMessages(
      (current) => [
        ...current,
        {
          role: "user",
          content:
            userContent,
        },
      ],
    );
    setLoading(true);
    scrollToBottom(
      "smooth",
    );
    const files =
      getAIOSInputFiles(
        normalizedInputs.map(
          (item) =>
            item.id,
        ),
      );
    try {
      let understanding:
        Awaited<
          ReturnType<
            typeof executeAIOSInputUnderstandingBridge
          >
        > | null = null;
      if (
        files.length > 0
      ) {
        understanding =
          await executeAIOSInputUnderstandingBridge(
            normalizedInputs,
            files,
            locale,
          );
        const usable =
          understanding.success &&
          understanding.inputs.some(
            (input) =>
              input.processingStatus ===
                "ready" &&
              typeof input.extractedText ===
                "string" &&
              input.extractedText
                .trim()
                .length > 0,
          );
        if (!usable) {
          setMessages(
            (current) => [
              ...current,
              {
                role:
                  "assistant",
                content:
                  buildFailureMessage(
                    locale,
                    understanding!.understoodCount,
                    understanding!.pendingCount,
                    understanding!.failedCount,
                  ),
              },
            ],
          );
          return;
        }
      }
      const runtimePrompt =
        buildEvidencePrompt(
          cleanPrompt,
          understanding?.inputs ??
            [],
          locale,
        );
      const inputIds =
        files.map(
          (entry) =>
            entry.inputId,
        );
      let response: Response;
      if (
        files.length > 0
      ) {
        const formData =
          new FormData();
        formData.append(
          "prompt",
          runtimePrompt,
        );
        formData.append(
          "inputs",
          JSON.stringify(
            normalizedInputs,
          ),
        );
        formData.append(
          "fileInputIds",
          JSON.stringify(
            inputIds,
          ),
        );
        for (
          const entry of files
        ) {
          formData.append(
            "files",
            entry.file,
            entry.file.name,
          );
        }
        response =
          await fetch(
            "/api/cn/chat",
            {
              method: "POST",
              headers: {
                "x-aios-locale":
                  locale,
              },
              credentials:
                "same-origin",
              body:
                formData,
            },
          );
      } else {
        response =
          await fetch(
            "/api/cn/chat",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
                "x-aios-locale":
                  locale,
              },
              credentials:
                "same-origin",
              body:
                JSON.stringify({
                  prompt:
                    runtimePrompt,
                }),
              },
            );
      }
      const data =
        (await response.json()) as CNChatResponse;
      if (!response.ok) {
        throw new Error(
          data.content ??
            data.error ??
            localized(
              locale,
              "AIOS CN 请求失败。",
              "AIOS CN request failed.",
              "AIOS CN リクエストに失敗しました。",
            ),
        );
      }
      let assistantContent =
        typeof data.content ===
          "string" &&
        data.content.trim()
          ? data.content.trim()
          : "";
      if (
        understanding
      ) {
        const status =
          localized(
            locale,
            `输入理解完成：已理解 ${understanding.understoodCount}，待处理 ${understanding.pendingCount}，失败 ${understanding.failedCount}。`,
            `Input understanding: ${understanding.understoodCount} understood, ${understanding.pendingCount} pending, ${understanding.failedCount} failed.`,
            `入力理解：理解済み ${understanding.understoodCount}、保留 ${understanding.pendingCount}、失敗 ${understanding.failedCount}。`,
          );
        assistantContent =
          assistantContent
            ? `${assistantContent}\n\n${status}`
            : status;
      }
      if (
        !assistantContent
      ) {
        assistantContent =
          localized(
            locale,
            "AIOS CN 没有返回可显示的内容。",
            "AIOS CN returned no displayable content.",
            "AIOS CN から表示可能な内容が返されませんでした。",
          );
      }
      setMessages(
        (current) => [
          ...current,
          {
            role:
              "assistant",
            content:
              assistantContent,
          },
        ],
      );
      if (
        Array.isArray(
          data.conversation,
        )
      ) {
        const canonical =
          sanitizeMessages(
            data.conversation,
          );
        if (
          canonical.length > 0
        ) {
          setMessages(
            canonical,
          );
        }
      }
      scrollToBottom(
        "smooth",
      );
    } catch (error) {
      setMessages(
        (current) => [
          ...current,
          {
            role:
              "assistant",
            content:
              error instanceof Error
                ? error.message
                : localized(
                    locale,
                    "AIOS CN 连接失败。",
                    "AIOS CN connection failed.",
                    "AIOS CN の接続に失敗しました。",
                  ),
          },
        ],
      );
      scrollToBottom(
        "smooth",
      );
    } finally {
      if (
        files.length > 0
      ) {
        clearAIOSInputFiles(
          files.map(
            (entry) =>
              entry.inputId,
          ),
        );
      }
      setLoading(false);
      void loadRuntimeStatus();
    }
  }
  const deepseekReady =
    runtimeStatus
      ?.configuredProviders
      ?.deepseek === true;
  const providerText =
    deepseekReady
      ? "DeepSeek"
      : "CN Runtime";
  return (
    <section
      style={{
        minHeight:
          "calc(100vh - 150px)",
        display:
          "flex",
        flexDirection:
          "column",
        overflow:
          "hidden",
        background:
          "#ffffff",
        border:
          "1px solid #e5e7eb",
        borderRadius:
          18,
        boxShadow:
          "0 8px 28px rgba(15, 23, 42, 0.05)",
      }}
    >
      <header
        style={{
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "space-between",
          gap: 12,
          padding:
            "14px 18px",
          borderBottom:
            "1px solid #eef2f7",
          background:
            "#ffffff",
        }}
      >
        <div>
          <div
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius:
                  "50%",
                background:
                  deepseekReady
                    ? "#22c55e"
                    : "#f59e0b",
              }}
            />
            <strong
              style={{
                color:
                  "#111827",
                fontSize:
                  15,
              }}
            >
              AIOS CN
            </strong>
          </div>
          <div
            style={{
              marginTop:
                3,
              color:
                "#94a3b8",
              fontSize:
                11,
            }}
          >
            {providerText}
            {" · China Runtime"}
          </div>
        </div>
        <div
          style={{
            color:
              deepseekReady
                ? "#15803d"
                : "#b45309",
            fontSize:
              11,
            fontWeight:
              700,
          }}
        >
          {deepseekReady
            ? localized(
                locale,
                "运行正常",
                "Ready",
                "稼働中",
              )
            : localized(
                locale,
                "等待 Provider",
                "Provider required",
                "Provider 待ち",
              )}
        </div>
      </header>
      <div
        ref={scrollRef}
        style={{
          flex:
            1,
          minHeight:
            0,
          overflowY:
            "auto",
          padding:
            "24px 18px 30px",
          background:
            "#ffffff",
          WebkitOverflowScrolling:
            "touch",
        }}
      >
        {historyLoading ? (
          <div
            style={{
              minHeight:
                160,
              display:
                "flex",
              alignItems:
                "center",
              justifyContent:
                "center",
              color:
                "#94a3b8",
              fontSize:
                13,
            }}
          >
            {copy.restoring}
          </div>
        ) : (
          <MessageList
            messages={
              messages
            }
            onMessageDeleted={
              handleMessageDeleted
            }
            onConversationChanged={
              () =>
                void loadHistory()
            }
          />
        )}
        {loading && (
          <div
            aria-live="polite"
            style={{
              display:
                "flex",
              alignItems:
                "center",
              gap: 10,
              marginTop:
                6,
              color:
                "#94a3b8",
              fontSize:
                13,
            }}
          >
            <span
              style={{
                width:
                  28,
                height:
                  28,
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                flexShrink:
                  0,
                borderRadius:
                  "50%",
                background:
                  "#111827",
                color:
                  "#ffffff",
                fontSize:
                  10,
                fontWeight:
                  800,
              }}
            >
              CN
            </span>
            <span>
              {localized(
                locale,
                "AIOS CN 正在处理...",
                "AIOS CN is processing...",
                "AIOS CN 処理中...",
              )}
            </span>
          </div>
        )}
      </div>
      <div
        style={{
          padding:
            "12px 14px 14px",
          borderTop:
            "1px solid #eef2f7",
          background:
            "#ffffff",
        }}
      >
        <ChatInput
          loading={
            loading ||
            historyLoading
          }
          onSend={
            handleSend
          }
        />
      </div>
    </section>
  );
}
