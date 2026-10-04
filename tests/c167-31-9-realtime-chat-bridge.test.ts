import {
  describe,
  expect,
  it,
} from "vitest";

import {
  executeRealtimeChatBridge,
  hasVerifiedRealtimeEvidence,
  inspectRealtimeChatCapability,
  requiresRealtimeExternalEvidence,
  shouldContinueAfterRealtimeBridge,
  shouldHandleRealtimeChat,
} from "@/lib/runtime/realtime-chat-bridge";

describe(
  "C167.31.9 Realtime Chat Bridge",
  () => {
    describe(
      "time capability",
      () => {
        it(
          "handles time directly through runtime",
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
              result.evidenceAvailable,
            ).toBe(false);

            expect(
              result.evidenceVerified,
            ).toBe(false);

            expect(
              result.code,
            ).toBe(
              "REALTIME_CHAT_COMPLETED",
            );

            expect(
              result.realtime?.success,
            ).toBe(true);
          },
        );

        it(
          "does not continue normal Runtime after successful time execution",
          async () => {
            const result =
              await executeRealtimeChatBridge(
                "What time is it in Tokyo?",
                "en",
              );

            expect(
              shouldContinueAfterRealtimeBridge(
                result,
              ),
            ).toBe(false);
          },
        );

        it(
          "does not require external evidence for time",
          async () => {
            const result =
              await executeRealtimeChatBridge(
                "What time is it in Tokyo?",
                "en",
              );

            expect(
              requiresRealtimeExternalEvidence(
                result,
              ),
            ).toBe(false);
          },
        );
      },
    );

    describe(
      "external realtime boundary",
      () => {
        it(
          "routes weather through external evidence",
          async () => {
            const result =
              await executeRealtimeChatBridge(
                "What is the weather in Tokyo now?",
                "en",
              );

            expect(
              result.detected,
            ).toBe(true);

            expect(
              result.handled,
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
              result.code,
            ).toMatch(
              /^REALTIME_CHAT_/,
            );
          },
        );

        it(
          "routes news through external evidence",
          async () => {
            const result =
              await executeRealtimeChatBridge(
                "What are the latest news today?",
                "en",
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
          },
        );

        it(
          "routes exchange rates through external evidence",
          async () => {
            const result =
              await executeRealtimeChatBridge(
                "What is the current USD JPY exchange rate?",
                "en",
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
          },
        );

        it(
          "routes market requests through the evidence boundary",
          async () => {
            const result =
              await executeRealtimeChatBridge(
                "What is the current stock price?",
                "en",
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
          },
        );
      },
    );

    describe(
      "evidence safety boundary",
      () => {
        it(
          "never reports unverified external evidence as verified",
          async () => {
            const result =
              await executeRealtimeChatBridge(
                "What is the current stock price?",
                "en",
              );

            if (
              result.requiresExternalEvidence
            ) {
              expect(
                result.evidenceVerified,
              ).toBe(
                result.evidenceVerified ===
                  true,
              );
            }

            if (
              !result.evidenceVerified
            ) {
              expect(
                result.code,
              ).not.toBe(
                "REALTIME_CHAT_EVIDENCE_VERIFIED",
              );
            }
          },
        );

        it(
          "verified evidence helper matches bridge state",
          async () => {
            const result =
              await executeRealtimeChatBridge(
                "What is the weather in Tokyo now?",
                "en",
              );

            const verified =
              await hasVerifiedRealtimeEvidence(
                "What is the weather in Tokyo now?",
                "en",
              );

            expect(
              verified,
            ).toBe(
              result.evidenceVerified,
            );
          },
        );

        it(
          "does not expose model-memory execution for external realtime data",
          async () => {
            const result =
              await executeRealtimeChatBridge(
                "What is the current BTC price?",
                "en",
              );

            expect(
              result.requiresExternalEvidence,
            ).toBe(true);

            if (
              !result.evidenceVerified
            ) {
              expect(
                result.success,
              ).toBe(false);
            }
          },
        );
      },
    );

    describe(
      "ordinary Runtime boundary",
      () => {
        it(
          "does not handle ordinary prompts as realtime",
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
              result.code,
            ).toBe(
              "REALTIME_CHAT_NOT_DETECTED",
            );

            expect(
              result.shouldContinueRuntime,
            ).toBe(true);

            expect(
              shouldHandleRealtimeChat(
                "Help me plan my next business task.",
              ),
            ).toBe(false);
          },
        );

        it(
          "does not require realtime evidence for ordinary prompts",
          async () => {
            const result =
              await executeRealtimeChatBridge(
                "Create a business plan for my next product.",
                "en",
              );

            expect(
              requiresRealtimeExternalEvidence(
                result,
              ),
            ).toBe(false);

            expect(
              shouldContinueAfterRealtimeBridge(
                result,
              ),
            ).toBe(true);
          },
        );
      },
    );

    describe(
      "capability inspection",
      () => {
        it(
          "inspects time capability",
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
          },
        );

        it(
          "inspects weather capability",
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
          },
        );

        it(
          "inspects Chinese realtime requests",
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
          "inspects Japanese realtime requests",
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
      "empty input boundary",
      () => {
        it(
          "does not handle empty prompts",
          async () => {
            const result =
              await executeRealtimeChatBridge(
                "   ",
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
              result.code,
            ).toBe(
              "REALTIME_CHAT_NOT_DETECTED",
            );
          },
        );
      },
    );
  },
);
