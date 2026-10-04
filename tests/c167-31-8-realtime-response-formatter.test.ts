import {
  describe,
  expect,
  it,
} from "vitest";

import {
  formatRealtimeResponse,
  getRealtimeResponseDisclosure,
  getRealtimeResponseStatusLabel,
  isRealtimeResponseVerified,
  requiresRealtimeEvidenceDisclosure,
} from "@/lib/runtime/realtime-response-formatter";

import type {
  RealtimeChatBridgeResult,
} from "@/lib/runtime/realtime-chat-bridge";

function createResult(
  overrides: Partial<RealtimeChatBridgeResult> = {},
): RealtimeChatBridgeResult {
  return {
    detected: true,
    handled: true,
    success: true,
    shouldContinueRuntime: false,
    requiresExternalEvidence: false,
    evidenceVerified: false,
    evidenceAvailable: false,
    capability: "time",
    execution: "runtime",
    code:
      "REALTIME_CHAT_COMPLETED",
    content:
      "Current time: 10:00 AM",
    route: {
      detected: true,
      capability: "time",
      execution: "runtime",
      requiresExternalEvidence: false,
      reason:
        "Time capability can be executed directly by the runtime.",
      code:
        "REALTIME_CAPABILITY_COMPLETED",
    },
    ...overrides,
  };
}

describe(
  "C167.31.8 Realtime Response Formatter",
  () => {
    describe(
      "runtime completed response",
      () => {
        it(
          "keeps direct runtime time responses completed",
          () => {
            const response =
              formatRealtimeResponse(
                createResult(),
                "en",
              );

            expect(
              response.metadata.status,
            ).toBe("completed");

            expect(
              response.metadata.capability,
            ).toBe("time");

            expect(
              response.metadata.execution,
            ).toBe("runtime");

            expect(
              response.metadata
                .requiresExternalEvidence,
            ).toBe(false);

            expect(
              response.metadata
                .evidenceVerified,
            ).toBe(false);

            expect(
              response.content,
            ).toBe(
              "Current time: 10:00 AM",
            );
          },
        );

        it(
          "does not add realtime evidence disclosure to time",
          () => {
            const response =
              formatRealtimeResponse(
                createResult(),
                "en",
              );

            expect(
              requiresRealtimeEvidenceDisclosure(
                response,
              ),
            ).toBe(false);

            expect(
              isRealtimeResponseVerified(
                response,
              ),
            ).toBe(false);
          },
        );
      },
    );

    describe(
      "verified external evidence",
      () => {
        it(
          "marks verified weather evidence explicitly",
          () => {
            const response =
              formatRealtimeResponse(
                createResult({
                  capability:
                    "weather",
                  execution:
                    "external-evidence-required",
                  requiresExternalEvidence:
                    true,
                  evidenceVerified:
                    true,
                  evidenceAvailable:
                    true,
                  code:
                    "REALTIME_CHAT_EVIDENCE_VERIFIED",
                  content:
                    "Tokyo weather is 22°C.",
                  evidence: {
                    detected: true,
                    capability:
                      "weather",
                    required: true,
                    success: true,
                    verified: true,
                    code:
                      "REALTIME_EVIDENCE_VERIFIED",
                    content:
                      "Tokyo weather is 22°C.",
                    query:
                      "Tokyo weather now",
                    sourceCount: 2,
                    sourceHosts: [
                      "weather.example.com",
                      "example.gov",
                    ],
                    retrievalMode:
                      "web-search",
                    verification:
                      undefined,
                    route: {
                      detected: true,
                      capability:
                        "weather",
                      execution:
                        "external-evidence-required",
                      requiresExternalEvidence:
                        true,
                      reason:
                        "Weather requires external realtime evidence.",
                      code:
                        "REALTIME_CAPABILITY_EXTERNAL_EVIDENCE_REQUIRED",
                    },
                    evidence: [
                      {
                        title:
                          "Tokyo Weather",
                        url:
                          "https://weather.example.com/tokyo",
                        snippet:
                          "Current Tokyo weather.",
                        source:
                          "weather.example.com",
                      },
                      {
                        title:
                          "Tokyo Weather Government",
                        url:
                          "https://example.gov/weather/tokyo",
                        snippet:
                          "Current weather information.",
                        source:
                          "example.gov",
                      },
                    ],
                    web: {
                      success: true,
                      query:
                        "Tokyo weather now",
                      verified: true,
                      provider:
                        "brave",
                      evidence: [
                        {
                          title:
                            "Tokyo Weather",
                          url:
                            "https://weather.example.com/tokyo",
                          snippet:
                            "Current Tokyo weather.",
                          source:
                            "weather.example.com",
                        },
                        {
                          title:
                            "Tokyo Weather Government",
                          url:
                            "https://example.gov/weather/tokyo",
                          snippet:
                            "Current weather information.",
                          source:
                            "example.gov",
                        },
                      ],
                      sourceCount: 2,
                      sourceHosts: [
                        "weather.example.com",
                        "example.gov",
                      ],
                      verification:
                        undefined,
                      retrievalMode:
                        "web-search",
                    },
                  },
                }),
                "en",
              );

            expect(
              response.metadata.status,
            ).toBe(
              "evidence-verified",
            );

            expect(
              response.metadata
                .evidenceVerified,
            ).toBe(true);

            expect(
              response.metadata.sourceCount,
            ).toBe(2);

            expect(
              response.metadata.sourceHosts,
            ).toEqual([
              "weather.example.com",
              "example.gov",
            ]);

            expect(
              isRealtimeResponseVerified(
                response,
              ),
            ).toBe(true);

            expect(
              requiresRealtimeEvidenceDisclosure(
                response,
              ),
            ).toBe(true);

            expect(
              response.content,
            ).toContain(
              "Realtime information has been verified against external evidence.",
            );

            expect(
              response.content,
            ).toContain(
              "Tokyo weather is 22°C.",
            );

            expect(
              response.content,
            ).toContain(
              "weather.example.com",
            );

            expect(
              response.content,
            ).toContain(
              "Verified source count: 2",
            );
          },
        );

        it(
          "formats verified Chinese realtime responses",
          () => {
            const response =
              formatRealtimeResponse(
                createResult({
                  capability:
                    "news",
                  execution:
                    "external-evidence-required",
                  requiresExternalEvidence:
                    true,
                  evidenceVerified:
                    true,
                  evidenceAvailable:
                    true,
                  code:
                    "REALTIME_CHAT_EVIDENCE_VERIFIED",
                  content:
                    "今日新闻已完成验证。",
                  evidence: {
                    detected: true,
                    capability:
                      "news",
                    required: true,
                    success: true,
                    verified: true,
                    code:
                      "REALTIME_EVIDENCE_VERIFIED",
                    content:
                      "今日新闻已完成验证。",
                    query:
                      "今日新闻",
                    sourceCount: 1,
                    sourceHosts: [
                      "news.example.cn",
                    ],
                    retrievalMode:
                      "web-search",
                    verification:
                      undefined,
                    route: {
                      detected: true,
                      capability:
                        "news",
                      execution:
                        "external-evidence-required",
                      requiresExternalEvidence:
                        true,
                      reason:
                        "News requires external realtime evidence.",
                      code:
                        "REALTIME_CAPABILITY_EXTERNAL_EVIDENCE_REQUIRED",
                    },
                    evidence: [
                      {
                        title:
                          "今日新闻",
                        url:
                          "https://news.example.cn/today",
                        snippet:
                          "今日新闻。",
                        source:
                          "news.example.cn",
                      },
                    ],
                    web: {
                      success: true,
                      query:
                        "今日新闻",
                      verified: true,
                      provider:
                        "brave",
                      evidence: [
                        {
                          title:
                            "今日新闻",
                          url:
                            "https://news.example.cn/today",
                          snippet:
                            "今日新闻。",
                          source:
                            "news.example.cn",
                        },
                      ],
                      sourceCount: 1,
                      sourceHosts: [
                        "news.example.cn",
                      ],
                      verification:
                        undefined,
                      retrievalMode:
                        "web-search",
                    },
                  },
                }),
                "zh-CN",
              );

            expect(
              response.metadata.status,
            ).toBe(
              "evidence-verified",
            );

            expect(
              response.content,
            ).toContain(
              "实时信息已通过外部证据验证。",
            );

            expect(
              response.content,
            ).toContain(
              "今日新闻已完成验证。",
            );

            expect(
              response.content,
            ).toContain(
              "实时证据来源：news.example.cn",
            );

            expect(
              response.content,
            ).toContain(
              "已验证来源数：1",
            );
          },
        );

        it(
          "formats verified Japanese realtime responses",
          () => {
            const response =
              formatRealtimeResponse(
                createResult({
                  capability:
                    "exchange-rate",
                  execution:
                    "external-evidence-required",
                  requiresExternalEvidence:
                    true,
                  evidenceVerified:
                    true,
                  evidenceAvailable:
                    true,
                  code:
                    "REALTIME_CHAT_EVIDENCE_VERIFIED",
                  content:
                    "USD/JPY exchange rate verified.",
                }),
                "ja",
              );

            expect(
              response.metadata.status,
            ).toBe(
              "evidence-verified",
            );

            expect(
              response.content,
            ).toContain(
              "リアルタイム情報は外部証拠によって検証されています。",
            );

            expect(
              response.content,
            ).toContain(
              "USD/JPY exchange rate verified.",
            );
          },
        );
      },
    );

    describe(
      "unverified external evidence",
      () => {
        it(
          "blocks unverified weather results",
          () => {
            const response =
              formatRealtimeResponse(
                createResult({
                  capability:
                    "weather",
                  execution:
                    "external-evidence-required",
                  requiresExternalEvidence:
                    true,
                  evidenceVerified:
                    false,
                  evidenceAvailable:
                    true,
                  code:
                    "REALTIME_CHAT_EVIDENCE_UNVERIFIED",
                  content:
                    "Unverified weather result.",
                  evidence: {
                    detected: true,
                    capability:
                      "weather",
                    required: true,
                    success: true,
                    verified: false,
                    code:
                      "REALTIME_EVIDENCE_UNVERIFIED",
                    content:
                      "Unverified weather result.",
                    query:
                      "Tokyo weather now",
                    sourceCount: 1,
                    sourceHosts: [
                      "example.com",
                    ],
                    retrievalMode:
                      "web-search",
                    verification:
                      undefined,
                    route: {
                      detected: true,
                      capability:
                        "weather",
                      execution:
                        "external-evidence-required",
                      requiresExternalEvidence:
                        true,
                      reason:
                        "Weather requires external realtime evidence.",
                      code:
                        "REALTIME_CAPABILITY_EXTERNAL_EVIDENCE_REQUIRED",
                    },
                    evidence: [
                      {
                        title:
                          "Unverified source",
                        url:
                          "https://example.com/weather",
                        snippet:
                          "Unverified weather.",
                        source:
                          "example.com",
                      },
                    ],
                    web: {
                      success: true,
                      query:
                        "Tokyo weather now",
                      verified: false,
                      provider:
                        "brave",
                      evidence: [
                        {
                          title:
                            "Unverified source",
                          url:
                            "https://example.com/weather",
                          snippet:
                            "Unverified weather.",
                          source:
                            "example.com",
                        },
                      ],
                      sourceCount: 1,
                      sourceHosts: [
                        "example.com",
                      ],
                      verification:
                        undefined,
                      retrievalMode:
                        "web-search",
                    },
                  },
                }),
                "en",
              );

            expect(
              response.metadata.status,
            ).toBe(
              "evidence-unverified",
            );

            expect(
              isRealtimeResponseVerified(
                response,
              ),
            ).toBe(false);

            expect(
              response.content,
            ).not.toContain(
              "Unverified weather result.",
            );

            expect(
              response.content,
            ).toContain(
              "This request requires realtime external evidence",
            );

            expect(
              response.content,
            ).toContain(
              "AIOS does not present unverified information as a realtime result.",
            );
          },
        );
      },
    );

    describe(
      "failed realtime response",
      () => {
        it(
          "returns a failure disclosure when realtime execution fails",
          () => {
            const response =
              formatRealtimeResponse(
                createResult({
                  capability:
                    "market",
                  execution:
                    "external-evidence-required",
                  requiresExternalEvidence:
                    true,
                  evidenceVerified:
                    false,
                  evidenceAvailable:
                    false,
                  success: false,
                  code:
                    "REALTIME_CHAT_FAILED",
                  content: "",
                }),
                "en",
              );

            expect(
              response.metadata.status,
            ).toBe("failed");

            expect(
              response.content,
            ).toContain(
              "The realtime capability could not be completed.",
            );

            expect(
              response.content,
            ).not.toContain(
              "Current time",
            );
          },
        );
      },
    );

    describe(
      "not detected",
      () => {
        it(
          "preserves non-realtime content",
          () => {
            const response =
              formatRealtimeResponse(
                createResult({
                  detected: false,
                  handled: false,
                  success: false,
                  shouldContinueRuntime:
                    true,
                  capability:
                    "unknown",
                  execution:
                    "none",
                  requiresExternalEvidence:
                    false,
                  evidenceVerified:
                    false,
                  evidenceAvailable:
                    false,
                  code:
                    "REALTIME_CHAT_NOT_DETECTED",
                  content:
                    "Continue with normal Runtime.",
                  route: {
                    detected: false,
                    capability:
                      "unknown",
                    execution:
                      "none",
                    requiresExternalEvidence:
                      false,
                    reason:
                      "No realtime capability detected.",
                    code:
                      "REALTIME_CAPABILITY_NOT_DETECTED",
                  },
                }),
                "en",
              );

            expect(
              response.metadata.status,
            ).toBe(
              "not-detected",
            );

            expect(
              response.content,
            ).toBe(
              "Continue with normal Runtime.",
            );

            expect(
              getRealtimeResponseDisclosure(
                response,
                "en",
              ),
            ).toBe(
              "Non-realtime request",
            );
          },
        );
      },
    );

    describe(
      "status labels",
      () => {
        it(
          "returns stable English labels",
          () => {
            expect(
              getRealtimeResponseStatusLabel(
                "completed",
                "en",
              ),
            ).toBe("Completed");

            expect(
              getRealtimeResponseStatusLabel(
                "evidence-verified",
                "en",
              ),
            ).toBe(
              "Realtime evidence verified",
            );

            expect(
              getRealtimeResponseStatusLabel(
                "evidence-unverified",
                "en",
              ),
            ).toBe(
              "Realtime evidence unverified",
            );

            expect(
              getRealtimeResponseStatusLabel(
                "failed",
                "en",
              ),
            ).toBe(
              "Execution failed",
            );
          },
        );

        it(
          "returns Chinese and Japanese labels",
          () => {
            expect(
              getRealtimeResponseStatusLabel(
                "evidence-verified",
                "zh-CN",
              ),
            ).toBe(
              "实时证据已验证",
            );

            expect(
              getRealtimeResponseStatusLabel(
                "evidence-verified",
                "ja",
              ),
            ).toBe(
              "リアルタイム証拠を検証済み",
            );
          },
        );
      },
    );
  },
);
