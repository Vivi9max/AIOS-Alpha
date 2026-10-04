import {
  describe,
  expect,
  it,
} from "vitest";

import {
  executeRealtimeChatBridge,
  inspectRealtimeChatCapability,
} from "@/lib/runtime/realtime-chat-bridge";
import type {
  RealtimeChatBridgeResult,
} from "@/lib/runtime/realtime-chat-bridge";
import {
  formatRealtimeResponse,
  getRealtimeResponseDisclosure,
  getRealtimeResponseStatusLabel,
  isRealtimeResponseVerified,
  type RealtimeResponse,
} from "@/lib/runtime/realtime-response-formatter";

function createBridgeResult(
  overrides: Partial<RealtimeChatBridgeResult>,
): RealtimeChatBridgeResult {
  return {
    detected: true,
    handled: true,
    success: false,
    shouldContinueRuntime: false,
    requiresExternalEvidence: true,
    evidenceVerified: false,
    evidenceAvailable: false,
    capability: "weather",
    execution: "external-evidence-required",
    code: "REALTIME_CHAT_FAILED",
    content: "RAW REALTIME CONTENT MUST NOT BE EXPOSED",
    route: {
      detected: true,
      capability: "weather",
      execution: "external-evidence-required",
      requiresExternalEvidence: true,
      reason: "External realtime evidence required.",
      code:
        "REALTIME_CAPABILITY_EXTERNAL_EVIDENCE_REQUIRED",
    },
    ...overrides,
  };
}

function createVerifiedBridgeResult(): RealtimeChatBridgeResult {
  return createBridgeResult({
    success: true,
    evidenceVerified: true,
    evidenceAvailable: true,
    code:
      "REALTIME_CHAT_EVIDENCE_VERIFIED",
    content:
      "Tokyo weather is 22°C with clear conditions.",
    evidence: {
      detected: true,
      capability: "weather",
      required: true,
      success: true,
      verified: true,
      code:
        "REALTIME_EVIDENCE_VERIFIED",
      content:
        "Tokyo weather is 22°C with clear conditions.",
      query:
        "What is the weather in Tokyo now?",
      sourceCount: 2,
      sourceHosts: [
        "weather.example.com",
        "source.example.com",
      ],
      retrievalMode:
        "web-search",
      verification: {
        verified: true,
        confidence: 1,
        verifiedSourceCount: 2,
        totalSourceCount: 2,
      },
      route: {
        detected: true,
        capability: "weather",
        execution:
          "external-evidence-required",
        requiresExternalEvidence: true,
        reason:
          "Weather requests require external realtime evidence.",
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
            "Current weather information for Tokyo.",
          source:
            "weather.example.com",
          verified: true,
        },
        {
          title:
            "Tokyo Conditions",
          url:
            "https://source.example.com/tokyo",
          snippet:
            "Current Tokyo weather conditions.",
          source:
            "source.example.com",
          verified: true,
        },
      ],
      web: {
        success: true,
        query:
          "What is the weather in Tokyo now?",
        verified: true,
        provider: "brave",
        evidence: [],
        sourceCount: 2,
        sourceHosts: [
          "weather.example.com",
          "source.example.com",
        ],
        verification: {
          verified: true,
          confidence: 1,
          verifiedSourceCount: 2,
          totalSourceCount: 2,
        },
        retrievalMode:
          "web-search",
      },
    },
  });
}

describe(
  "C167.31.12 Realtime E2E Contract",
  () => {
    describe(
      "chat to runtime contract",
      () => {
        it(
          "executes time through the runtime boundary",
          async () => {
            const result =
              await executeRealtimeChatBridge(
                "What time is it in Tokyo?",
                "en",
              );

            expect(
              result.detected,
            ).toBe(true);

            expect(
              result.handled,
            ).toBe(true);

            expect(
              result.success,
            ).toBe(true);

            expect(
              result.capability,
            ).toBe("time");

            expect(
              result.execution,
            ).toBe("runtime");

            expect(
              result.requiresExternalEvidence,
            ).toBe(false);

            expect(
              result.evidenceVerified,
            ).toBe(false);

            expect(
              result.evidenceAvailable,
            ).toBe(false);

            expect(
              result.code,
            ).toBe(
              "REALTIME_CHAT_COMPLETED",
            );

            expect(
              result.content.length,
            ).toBeGreaterThan(0);
          },
        );

        it(
          "keeps ordinary prompts outside the realtime boundary",
          async () => {
            const result =
              await executeRealtimeChatBridge(
                "Help me plan my next business task.",
                "en",
              );

            expect(
              result.detected,
            ).toBe(false);

            expect(
              result.handled,
            ).toBe(false);

            expect(
              result.shouldContinueRuntime,
            ).toBe(true);

            expect(
              result.requiresExternalEvidence,
            ).toBe(false);

            expect(
              result.code,
            ).toBe(
              "REALTIME_CHAT_NOT_DETECTED",
            );
          },
        );
      },
    );

    describe(
      "chat to external evidence boundary",
      () => {
        it(
          "routes weather to the external evidence boundary",
          () => {
            const result =
              inspectRealtimeChatCapability(
                "What is the weather in Tokyo now?",
              );

            expect(
              result.detected,
            ).toBe(true);

            expect(
              result.capability,
            ).toBe("weather");

            expect(
              result.execution,
            ).toBe(
              "external-evidence-required",
            );

            expect(
              result.requiresExternalEvidence,
            ).toBe(true);

            expect(
              result.evidenceBoundary,
            ).toBe(true);
          },
        );

        it(
          "routes market data to the external evidence boundary",
          () => {
            const result =
              inspectRealtimeChatCapability(
                "What is the current stock price?",
              );

            expect(
              result.detected,
            ).toBe(true);

            expect(
              result.capability,
            ).toBe("market");

            expect(
              result.execution,
            ).toBe(
              "external-evidence-required",
            );

            expect(
              result.requiresExternalEvidence,
            ).toBe(true);

            expect(
              result.evidenceBoundary,
            ).toBe(true);
          },
        );

        it(
          "preserves Chinese realtime routing",
          () => {
            const result =
              inspectRealtimeChatCapability(
                "现在东京天气怎么样？",
              );

            expect(
              result.detected,
            ).toBe(true);

            expect(
              result.capability,
            ).toBe("weather");

            expect(
              result.requiresExternalEvidence,
            ).toBe(true);
          },
        );

        it(
          "preserves Japanese realtime routing",
          () => {
            const result =
              inspectRealtimeChatCapability(
                "東京の現在の天気は？",
              );

            expect(
              result.detected,
            ).toBe(true);

            expect(
              result.capability,
            ).toBe("weather");

            expect(
              result.requiresExternalEvidence,
            ).toBe(true);
          },
        );
      },
    );

    describe(
      "verified evidence to response contract",
      () => {
        it(
          "formats verified realtime evidence as a verified response",
          () => {
            const bridge =
              createVerifiedBridgeResult();

            const response =
              formatRealtimeResponse(
                bridge,
                "en",
              );

            expect(
              response.metadata.status,
            ).toBe(
              "evidence-verified",
            );

            expect(
              response.metadata.evidenceVerified,
            ).toBe(true);

            expect(
              response.metadata.evidenceAvailable,
            ).toBe(true);

            expect(
              response.metadata.requiresExternalEvidence,
            ).toBe(true);

            expect(
              response.metadata.sourceCount,
            ).toBe(2);

            expect(
              response.metadata.sourceHosts,
            ).toEqual([
              "weather.example.com",
              "source.example.com",
            ]);

            expect(
              isRealtimeResponseVerified(
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
              "Tokyo weather is 22°C with clear conditions.",
            );

            expect(
              response.content,
            ).toContain(
              "weather.example.com",
            );

            expect(
              response.content,
            ).not.toContain(
              "RAW REALTIME CONTENT MUST NOT BE EXPOSED",
            );
          },
        );

        it(
          "formats verified realtime evidence in Chinese",
          () => {
            const response =
              formatRealtimeResponse(
                createVerifiedBridgeResult(),
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
              "实时证据来源：weather.example.com, source.example.com",
            );

            expect(
              getRealtimeResponseStatusLabel(
                response.metadata.status,
                "zh-CN",
              ),
            ).toBe(
              "实时证据已验证",
            );
          },
        );

        it(
          "formats verified realtime evidence in Japanese",
          () => {
            const response =
              formatRealtimeResponse(
                createVerifiedBridgeResult(),
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
              "リアルタイム証拠ソース：weather.example.com, source.example.com",
            );

            expect(
              getRealtimeResponseStatusLabel(
                response.metadata.status,
                "ja",
              ),
            ).toBe(
              "リアルタイム証拠を検証済み",
            );
          },
        );
      },
    );

    describe(
      "unverified evidence safety contract",
      () => {
        it(
          "never exposes raw content when evidence is unverified",
          () => {
            const response =
              formatRealtimeResponse(
                createBridgeResult({
                  evidenceAvailable: true,
                  evidenceVerified: false,
                  code:
                    "REALTIME_CHAT_EVIDENCE_UNVERIFIED",
                }),
                "en",
              );

            expect(
              response.metadata.status,
            ).toBe(
              "evidence-unverified",
            );

            expect(
              response.metadata.evidenceAvailable,
            ).toBe(true);

            expect(
              response.metadata.evidenceVerified,
            ).toBe(false);

            expect(
              isRealtimeResponseVerified(
                response,
              ),
            ).toBe(false);

            expect(
              response.content,
            ).not.toContain(
              "RAW REALTIME CONTENT MUST NOT BE EXPOSED",
            );

            expect(
              response.content,
            ).toContain(
              "This request requires realtime external evidence",
            );
          },
        );

        it(
          "never exposes raw content after realtime failure",
          () => {
            const response =
              formatRealtimeResponse(
                createBridgeResult({
                  evidenceAvailable: false,
                  evidenceVerified: false,
                  success: false,
                  code:
                    "REALTIME_CHAT_FAILED",
                }),
                "en",
              );

            expect(
              response.metadata.status,
            ).toBe("failed");

            expect(
              response.content,
            ).not.toContain(
              "RAW REALTIME CONTENT MUST NOT BE EXPOSED",
            );

            expect(
              response.content,
            ).toContain(
              "The realtime capability could not be completed.",
            );

            expect(
              isRealtimeResponseVerified(
                response,
              ),
            ).toBe(false);
          },
        );

        it(
          "never marks failed market data as verified",
          () => {
            const response =
              formatRealtimeResponse(
                createBridgeResult({
                  capability: "market",
                  content:
                    "Current market price: 123.45",
                  evidenceAvailable: false,
                  evidenceVerified: false,
                  success: false,
                  code:
                    "REALTIME_CHAT_FAILED",
                }),
                "en",
              );

            expect(
              response.metadata.status,
            ).toBe("failed");

            expect(
              response.metadata.capability,
            ).toBe("market");

            expect(
              response.content,
            ).not.toContain(
              "Current market price: 123.45",
            );

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
      "ordinary response contract",
      () => {
        it(
          "preserves ordinary content when realtime is not detected",
          () => {
            const ordinary =
              createBridgeResult({
                detected: false,
                handled: false,
                success: false,
                shouldContinueRuntime: true,
                requiresExternalEvidence: false,
                evidenceVerified: false,
                evidenceAvailable: false,
                capability: "unknown",
                execution: "none",
                code:
                  "REALTIME_CHAT_NOT_DETECTED",
                content:
                  "Normal AIOS Runtime response.",
                route: {
                  detected: false,
                  capability: "unknown",
                  execution: "none",
                  requiresExternalEvidence: false,
                  reason:
                    "No realtime capability detected.",
                  code:
                    "REALTIME_CAPABILITY_NOT_DETECTED",
                },
              });

            const response =
              formatRealtimeResponse(
                ordinary,
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
              "Normal AIOS Runtime response.",
            );

            expect(
              isRealtimeResponseVerified(
                response,
              ),
            ).toBe(false);

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

        it(
          "does not disclose realtime evidence for direct time execution",
          async () => {
            const bridge =
              await executeRealtimeChatBridge(
                "What time is it in Tokyo?",
                "en",
              );

            const response =
              formatRealtimeResponse(
                bridge,
                "en",
              );

            expect(
              response.metadata.status,
            ).toBe("completed");

            expect(
              response.metadata.requiresExternalEvidence,
            ).toBe(false);

            expect(
              response.metadata.evidenceVerified,
            ).toBe(false);

            expect(
              response.metadata.evidenceAvailable,
            ).toBe(false);

            expect(
              isRealtimeResponseVerified(
                response,
              ),
            ).toBe(false);

            expect(
              response.content.length,
            ).toBeGreaterThan(0);

            expect(
              getRealtimeResponseDisclosure(
                response,
                "en",
              ),
            ).toBe("Completed");
          },
        );
      },
    );

    describe(
      "status contract",
      () => {
        it(
          "keeps realtime status labels stable",
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

            expect(
              getRealtimeResponseStatusLabel(
                "not-detected",
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
      "end-to-end safety invariant",
      () => {
        it(
          "never presents unverified external realtime data as verified",
          () => {
            const cases: RealtimeResponse[] =
              [
                formatRealtimeResponse(
                  createBridgeResult({
                    evidenceAvailable: true,
                    evidenceVerified: false,
                    code:
                      "REALTIME_CHAT_EVIDENCE_UNVERIFIED",
                  }),
                  "en",
                ),
                formatRealtimeResponse(
                  createBridgeResult({
                    evidenceAvailable: false,
                    evidenceVerified: false,
                    code:
                      "REALTIME_CHAT_FAILED",
                  }),
                  "en",
                ),
              ];

            for (
              const response of cases
            ) {
              expect(
                response.metadata
                  .requiresExternalEvidence,
              ).toBe(true);

              expect(
                response.metadata
                  .evidenceVerified,
              ).toBe(false);

              expect(
                response.metadata.status,
              ).not.toBe(
                "evidence-verified",
              );

              expect(
                isRealtimeResponseVerified(
                  response,
                ),
              ).toBe(false);

              expect(
                response.content,
              ).not.toContain(
                "RAW REALTIME CONTENT MUST NOT BE EXPOSED",
              );
            }
          },
        );
      },
    );
  },
);
