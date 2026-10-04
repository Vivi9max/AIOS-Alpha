import {
  describe,
  expect,
  it,
} from "vitest";

import {
  executeRealtimeCapability,
  getRealtimeCapabilityDescription,
  getRealtimeCapabilityExecutionMode,
  isExternalRealtimeCapabilityPrompt,
  isRealtimeCapabilityPrompt,
  routeRealtimeCapability,
} from "@/lib/runtime/realtime-capability-router";

describe("C167.31.5 Realtime Capability Router", () => {
  describe("time capability", () => {
    it("routes current time to direct runtime execution", () => {
      const result =
        routeRealtimeCapability(
          "What time is it in Tokyo?",
        );

      expect(result.detected).toBe(
        true,
      );
      expect(result.capability).toBe(
        "time",
      );
      expect(result.execution).toBe(
        "runtime",
      );
      expect(
        result.requiresExternalEvidence,
      ).toBe(false);
      expect(result.code).toBe(
        "REALTIME_CAPABILITY_COMPLETED",
      );
    });

    it("executes time capability without external evidence", () => {
      const result =
        executeRealtimeCapability(
          "What is the current time in Tokyo?",
          "en",
        );

      expect(result.success).toBe(
        true,
      );
      expect(result.code).toBe(
        "TIME_CAPABILITY_COMPLETED",
      );
      expect(
        result.timeResult?.detected,
      ).toBe(true);
      expect(
        result.timeResult?.success,
      ).toBe(true);
      expect(
        result.timeResult?.timeZone,
      ).toBe("Asia/Tokyo");
    });
  });

  describe("external realtime capabilities", () => {
    it("routes weather to external evidence", () => {
      const result =
        routeRealtimeCapability(
          "What is the weather in Tokyo now?",
        );

      expect(result.detected).toBe(
        true,
      );
      expect(result.capability).toBe(
        "weather",
      );
      expect(result.execution).toBe(
        "external-evidence-required",
      );
      expect(
        result.requiresExternalEvidence,
      ).toBe(true);
      expect(result.code).toBe(
        "REALTIME_CAPABILITY_EXTERNAL_EVIDENCE_REQUIRED",
      );
    });

    it("routes news to external evidence", () => {
      const result =
        routeRealtimeCapability(
          "What are the latest news today?",
        );

      expect(result.detected).toBe(
        true,
      );
      expect(result.capability).toBe(
        "news",
      );
      expect(result.execution).toBe(
        "external-evidence-required",
      );
      expect(
        result.requiresExternalEvidence,
      ).toBe(true);
    });

    it("routes exchange rates to external evidence", () => {
      const result =
        routeRealtimeCapability(
          "What is the current USD JPY exchange rate?",
        );

      expect(result.detected).toBe(
        true,
      );
      expect(result.capability).toBe(
        "exchange-rate",
      );
      expect(result.execution).toBe(
        "external-evidence-required",
      );
      expect(
        result.requiresExternalEvidence,
      ).toBe(true);
    });

    it("routes market prices to external evidence", () => {
      const result =
        routeRealtimeCapability(
          "What is the current stock price?",
        );

      expect(result.detected).toBe(
        true,
      );
      expect(result.capability).toBe(
        "market",
      );
      expect(result.execution).toBe(
        "external-evidence-required",
      );
      expect(
        result.requiresExternalEvidence,
      ).toBe(true);
    });

    it("does not execute external realtime data from model memory", () => {
      const result =
        executeRealtimeCapability(
          "What is the current stock price?",
          "en",
        );

      expect(result.success).toBe(
        false,
      );
      expect(result.code).toBe(
        "REALTIME_CAPABILITY_EXTERNAL_EVIDENCE_REQUIRED",
      );
      expect(
        result.content.length,
      ).toBeGreaterThan(0);
    });
  });

  describe("generic realtime boundary", () => {
    it("detects an unresolved realtime request", () => {
      const result =
        routeRealtimeCapability(
          "Give me the realtime status now.",
        );

      expect(result.detected).toBe(
        true,
      );
      expect(result.capability).toBe(
        "unknown",
      );
      expect(result.execution).toBe(
        "external-evidence-required",
      );
      expect(
        result.requiresExternalEvidence,
      ).toBe(true);
    });

    it("does not treat ordinary prompts as realtime requests", () => {
      const result =
        routeRealtimeCapability(
          "Help me plan my next business task.",
        );

      expect(result.detected).toBe(
        false,
      );
      expect(result.capability).toBe(
        "unknown",
      );
      expect(result.execution).toBe(
        "none",
      );
      expect(
        result.requiresExternalEvidence,
      ).toBe(false);
      expect(result.code).toBe(
        "REALTIME_CAPABILITY_NOT_DETECTED",
      );
    });

    it("does not detect an empty prompt", () => {
      const result =
        routeRealtimeCapability(
          "   ",
        );

      expect(result.detected).toBe(
        false,
      );
      expect(result.code).toBe(
        "REALTIME_CAPABILITY_NOT_DETECTED",
      );
    });
  });

  describe("public detection helpers", () => {
    it("identifies realtime prompts", () => {
      expect(
        isRealtimeCapabilityPrompt(
          "What is the weather now?",
        ),
      ).toBe(true);

      expect(
        isRealtimeCapabilityPrompt(
          "Create a business plan.",
        ),
      ).toBe(false);
    });

    it("identifies prompts requiring external evidence", () => {
      expect(
        isExternalRealtimeCapabilityPrompt(
          "What is the current BTC price?",
        ),
      ).toBe(true);

      expect(
        isExternalRealtimeCapabilityPrompt(
          "What time is it in Tokyo?",
        ),
      ).toBe(false);
    });
  });

  describe("capability metadata", () => {
    it("exposes stable execution modes", () => {
      expect(
        getRealtimeCapabilityExecutionMode(
          "time",
        ),
      ).toBe("runtime");

      expect(
        getRealtimeCapabilityExecutionMode(
          "weather",
        ),
      ).toBe(
        "external-evidence-required",
      );

      expect(
        getRealtimeCapabilityExecutionMode(
          "news",
        ),
      ).toBe(
        "external-evidence-required",
      );

      expect(
        getRealtimeCapabilityExecutionMode(
          "exchange-rate",
        ),
      ).toBe(
        "external-evidence-required",
      );

      expect(
        getRealtimeCapabilityExecutionMode(
          "market",
        ),
      ).toBe(
        "external-evidence-required",
      );

      expect(
        getRealtimeCapabilityExecutionMode(
          "unknown",
        ),
      ).toBe("none");
    });

    it("exposes capability descriptions", () => {
      expect(
        getRealtimeCapabilityDescription(
          "time",
        ),
      ).toContain("timezone");

      expect(
        getRealtimeCapabilityDescription(
          "weather",
        ),
      ).toContain("weather");

      expect(
        getRealtimeCapabilityDescription(
          "news",
        ),
      ).toContain("news");

      expect(
        getRealtimeCapabilityDescription(
          "exchange-rate",
        ),
      ).toContain(
        "foreign-exchange",
      );

      expect(
        getRealtimeCapabilityDescription(
          "market",
        ),
      ).toContain("market");
    });
  });

  describe("multilingual detection", () => {
    it("detects Chinese realtime weather", () => {
      const result =
        routeRealtimeCapability(
          "现在东京天气怎么样？",
        );

      expect(result.detected).toBe(
        true,
      );
      expect(result.capability).toBe(
        "weather",
      );
      expect(
        result.requiresExternalEvidence,
      ).toBe(true);
    });

    it("detects Chinese realtime market data", () => {
      const result =
        routeRealtimeCapability(
          "现在的股票行情怎么样？",
        );

      expect(result.detected).toBe(
        true,
      );
      expect(result.capability).toBe(
        "market",
      );
      expect(
        result.requiresExternalEvidence,
      ).toBe(true);
    });

    it("detects Japanese realtime weather", () => {
      const result =
        routeRealtimeCapability(
          "東京の現在の天気は？",
        );

      expect(result.detected).toBe(
        true,
      );
      expect(result.capability).toBe(
        "weather",
      );
      expect(
        result.requiresExternalEvidence,
      ).toBe(true);
    });

    it("detects Japanese exchange rates", () => {
      const result =
        routeRealtimeCapability(
          "現在の為替レートを教えてください。",
        );

      expect(result.detected).toBe(
        true,
      );
      expect(result.capability).toBe(
        "exchange-rate",
      );
      expect(
        result.requiresExternalEvidence,
      ).toBe(true);
    });
  });
});
