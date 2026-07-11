"use client";

import { useEffect, useState } from "react";

import Header from "@/components/layout/Header";
import Sidebar from "@/components/layout/Sidebar";

interface MemoryItem {
  id: number;
  text: string;
}

export default function MemoryPage() {

  const [items, setItems] =
    useState<MemoryItem[]>([]);

  useEffect(() => {

    const data =
      JSON.parse(
        localStorage.getItem("aios-memory") ?? "[]"
      );

    setItems(data);

  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
      }}
    >
      <Header />

      <div
        style={{
          display: "flex",
          flex: 1,
        }}
      >
        <Sidebar />

        <main
          style={{
            flex: 1,
            padding: 40,
          }}
        >
          <h1>🧠 Memory</h1>

          {items.length === 0 ? (

            <p>No Memory</p>

          ) : (

            items.map(item => (

              <div
                key={item.id}
                style={{
                  marginTop: 16,
                  padding: 16,
                  background: "#f5f5f5",
                  borderRadius: 10,
                }}
              >
                {item.text}
              </div>

            ))

          )}

        </main>

      </div>

    </div>
  );
}