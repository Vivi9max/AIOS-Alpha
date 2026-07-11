"use client";

import { useRouter } from "next/navigation";
import Hero from "@/components/Hero";
import RunButton from "@/components/RunButton";

export default function Home() {
  const router = useRouter();

  return (
    <>
      <Hero />

      <RunButton
        onClick={() => router.push("/workspace")}
      />
    </>
  );
}