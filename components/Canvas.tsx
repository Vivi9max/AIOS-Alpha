"use client";

import { useState } from "react";
import { runBrain } from "../lib/brain";
import { getMemories } from "../lib/memory";

export default function Canvas() {
  const [intent, setIntent] = useState("");
  const [state, setState] = useState("");
  const [title, setTitle] = useState("");
  const [result, setResult] = useState("");
  const [history, setHistory] = useState(getMemories());

  function handleRun() {
    const brain = runBrain(intent);

    setState(brain.state);
    setTitle(brain.title);
    setResult(brain.nextMove);
    setHistory([...getMemories()]);
  }

  return (
    <div
      style={{
        marginTop: 40,
        width: 360
      }}
    >
      <input
        value={intent}
        onChange={(e) => setIntent(e.target.value)}
        placeholder="今天，你想推进什么？"
        style={{
          width: "100%",
          padding: 16,
          borderRadius: 14,
          border: "1px solid #ddd",
          fontSize: 16,
          outline: "none"
        }}
      />

      <button
        onClick={handleRun}
        style={{
          width: "100%",
          marginTop: 16,
          padding: 16,
          borderRadius: 14,
          border: "none",
          background: "#111",
          color: "#fff",
          fontSize: 16
        }}
      >
        ▶ Run AIOS
      </button>

      {result && (
        <div
          style={{
            marginTop: 24,
            padding: 20,
            borderRadius: 16,
            background: "#f5f5f5"
          }}
        >
          <div style={{ fontSize: 12, color: "#888" }}>
            Current State
          </div>

          <div style={{ fontWeight: 600, marginTop: 4 }}>
            {state}
          </div>

          <div
            style={{
              marginTop: 18,
              fontSize: 12,
              color: "#888"
            }}
          >
            Decision
          </div>

          <div style={{ fontWeight: 600, marginTop: 4 }}>
            {title}
          </div>

          <div
            style={{
              marginTop: 18,
              fontSize: 12,
              color: "#888"
            }}
          >
            Next Move
          </div>

          <div style={{ marginTop: 4 }}>
            {result}
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div
          style={{
            marginTop: 32
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 12
            }}
          >
            Timeline
          </div>

          {history.map((item, index) => (
            <div
              key={index}
              style={{
                padding: 14,
                border: "1px solid #eee",
                borderRadius: 12,
                marginBottom: 12
              }}
            >
              <div style={{ fontWeight: 600 }}>
                {item.intent}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "#666",
                  marginTop: 6
                }}
              >
                {item.state}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
