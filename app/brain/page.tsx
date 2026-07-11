"use client";

import { useState } from "react";

import { runBrain } from "@/lib/brain";

import BrainInput from "@/components/brain/BrainInput";
import BrainResult from "@/components/brain/BrainResult";

export default function BrainPage() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRun() {
    if (!prompt.trim()) return;

    setLoading(true);

    const result = await runBrain({
      provider: "mock",
      prompt,
    });

    setAnswer(result.content);

    setLoading(false);
  }

  return (
    <main
      style={{
        maxWidth: 900,
        margin: "40px auto",
        padding: 24,
      }}
    >
      <h1>🧠 AIOS Runtime</h1>

      <BrainInput
        value={prompt}
        loading={loading}
        onChange={setPrompt}
        onRun={handleRun}
      />

      <BrainResult answer={answer} />
    </main>
  );
}