import {
  describe,
  expect,
  it,
} from "vitest";

import {
  inspectRealtimeChatCapability,
} from "@/lib/runtime/realtime-chat-bridge";

import {
  formatRealtimeResponse,
  isRealtimeResponseVerified,
  type RealtimeResponse,
} from "@/lib/runtime/realtime-response-formatter";

import type {
  RealtimeChatBridgeResult,
} from "@/lib/runtime/realtime-chat-bridge";

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
    content:
      "RAW REALTIME CONTENT MUST NOT BE EXPOSED",
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
    ...overrides,
  };
}

describe(
  "C167.31.15 Realtime API Contract",
  () => {
    describe(
      "request routing contract",
      () => {
        it(
          "routes time requests to the runtime",
          () => {
            const result =
              inspectRealtimeChatCapability(
                "What time is it in Tokyo?",
              );

            expect(
              result.detected,
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
              result.evidenceBoundary,
            ).toBe(false);
          },
        );

        it(
          "routes weather requests to external evidence",
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
          "routes news requests to external evidence",
          () => {
            const result =
              inspectRealtimeChatCapability(
                "What is the latest news now?",
              );

            expect(
              result.detected,
            ).toBe(true);

            expect(
              result.capability,
            ).toBe("news");

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
          "routes exchange-rate requests to external evidence",
          () => {
            const result =
              inspectRealtimeChatCapability(
                "What is the current USD to JPY exchange rate?",
              );

            expect(
              result.detected,
            ).toBe(true);

            expect(
              result.capability,
            ).toBe("exchange-rate");

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
          "routes market requests to external evidence",
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
      },
    );

    describe(
      "multilingual routing contract",
      () => {
        it(
          "preserves Chinese weather routing",
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
              result.execution,
            ).toBe(
              "external-evidence-required",
            );

            expect(
              result.evidenceBoundary,
            ).toBe(true);
          },
        );

        it(
          "preserves Chinese exchange-rate routing",
          () => {
            const result =
              inspectRealtimeChatCapability(
                "现在美元兑日元汇率是多少？",
              );

            expect(
              result.detected,
            ).toBe(true);

            expect(
              result.capability,
            ).toBe("exchange-rate");

            expect(
              result.requiresExternalEvidence,
            ).toBe(true);
          },
        );

        it(
          "preserves Japanese weather routing",
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

        it(
          "preserves Japanese market routing",
          () => {
            const result =
              inspectRealtimeChatCapability(
                "現在の株価はいくらですか？",
              );

            expect(
              result.detected,
            ).toBe(true);

            expect(
              result.capability,
            ).toBe("market");

            expect(
              result.requiresExternalEvidence,
            ).toBe(true);
          },
        );
      },
    );

    describe(
      "ordinary chat boundary",
      () => {
        it(
          "does not classify ordinary business planning as realtime",
          () => {
            const result =
              inspectRealtimeChatCapability(
                "Help me plan my next business task.",
              );

            expect(
              result.detected,
            ).toBe(false);

            expect(
              result.capability,
            ).toBe("unknown");

            expect(
              result.execution,
            ).toBe("none");

            expect(
              result.requiresExternalEvidence,
            ).toBe(false);

            expect(
              result.evidenceBoundary,
            ).toBe(false);
          },
        );

        it(
          "does not classify ordinary knowledge questions as realtime",
          () => {
            const result =
              inspectRealtimeChatCapability(
                "Explain how a business model works.",
              );

            expect(
              result.detected,
            ).toBe(false);

            expect(
              result.execution,
            ).toBe("none");

            expect(
              result.requiresExternalEvidence,
            ).toBe(false);
          },
        );
      },
    );

    describe(
      "response metadata contract",
      () => {
        it(
          "marks verified external evidence correctly",
          () => {
            const bridge =
              createBridgeResult({
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
              response.metadata.capability,
            ).toBe("weather");

            expect(
              response.metadata.execution,
            ).toBe(
              "external-evidence-required",
            );

            expect(
              response.metadata.requiresExternalEvidence,
            ).toBe(true);

            expect(
              response.metadata.evidenceVerified,
            ).toBe(true);

            expect(
              response.metadata.evidenceAvailable,
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
          },
        );

        it(
          "preserves capability metadata when evidence is unavailable",
          () => {
            const response =
              formatRealtimeResponse(
                createBridgeResult({
                  capability: "market",
                  success: false,
                  evidenceAvailable: false,
                  evidenceVerified: false,
                  code:
                    "REALTIME_CHAT_FAILED",
                  content:
                    "Current market price: 123.45",
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
              response.metadata.requiresExternalEvidence,
            ).toBe(true);

            expect(
              response.metadata.evidenceAvailable,
            ).toBe(false);

            expect(
              response.metadata.evidenceVerified,
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
      "response safety contract",
      () => {
        it(
          "does not expose unverified external realtime content",
          () => {
            const response =
              formatRealtimeResponse(
                createBridgeResult({
                  success: false,
                  evidenceAvailable: true,
                  evidenceVerified: false,
                  code:
                    "REALTIME_CHAT_EVIDENCE_UNVERIFIED",
                  content:
                    "RAW REALTIME CONTENT MUST NOT BE EXPOSED",
                }),
                "en",
              );

            expect(
              response.metadata.status,
            ).toBe(
              "evidence-unverified",
            );

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
          "does not expose failed market content",
          () => {
            const response =
              formatRealtimeResponse(
                createBridgeResult({
                  capability: "market",
                  success: false,
                  evidenceAvailable: false,
                  evidenceVerified: false,
                  code:
                    "REALTIME_CHAT_FAILED",
                  content:
                    "Current market price: 123.45",
                }),
                "en",
              );

            expect(
              response.metadata.status,
            ).toBe("failed");

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

        it(
          "never promotes evidence availability to verification",
          () => {
            const responses:
              RealtimeResponse[] =
              [
                formatRealtimeResponse(
                  createBridgeResult({
                    evidenceAvailable: true,
                    evidenceVerified: false,
                    success: false,
                    code:
                      "REALTIME_CHAT_EVIDENCE_UNVERIFIED",
                  }),
                  "en",
                ),
                formatRealtimeResponse(
                  createBridgeResult({
                    evidenceAvailable: false,
                    evidenceVerified: false,
                    success: false,
                    code:
                      "REALTIME_CHAT_FAILED",
                  }),
                  "en",
                ),
              ];

            for (
              const response of responses
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
            }
          },
        );
      },
    );

    describe(
      "API contract invariant",
      () => {
        it(
          "keeps the realtime response boundary explicit",
          () => {
            const verified =
              formatRealtimeResponse(
                createBridgeResult({
                  success: true,
                  evidenceAvailable: true,
                  evidenceVerified: true,
                  code:
                    "REALTIME_CHAT_EVIDENCE_VERIFIED",
                  content:
                    "Verified realtime information.",
                }),
                "en",
              );

            expect(
              verified.metadata,
            ).toEqual(
              expect.objectContaining({
                capability: "weather",
                execution:
                  "external-evidence-required",
                requiresExternalEvidence: true,
                evidenceVerified: true,
                evidenceAvailable: true,
                status:
                  "evidence-verified",
              }),
            );

            const failed =
              formatRealtimeResponse(
                createBridgeResult({
                  success: false,
                  evidenceAvailable: false,
                  evidenceVerified: false,
                  code:
                    "REALTIME_CHAT_FAILED",
                }),
                "en",
              );

            expect(
              failed.metadata,
            ).toEqual(
              expect.objectContaining({
                capability: "weather",
                execution:
                  "external-evidence-required",
                requiresExternalEvidence: true,
                evidenceVerified: false,
                evidenceAvailable: false,
                status: "failed",
              }),
            );

            expect(
              isRealtimeResponseVerified(
                verified,
              ),
            ).toBe(true);

            expect(
              isRealtimeResponseVerified(
                failed,
              ),
            ).toBe(false);
          },
        );
      },
    );
  },
);
