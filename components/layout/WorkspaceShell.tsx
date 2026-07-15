"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import Header from "./Header";
import Sidebar from "./Sidebar";

export default function WorkspaceShell({
  children,
}: {
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] =
    useState(false);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        background: "#f6f7fb",
      }}
    >
      <Header />

      <button
        type="button"
        className="aios-mobile-menu-button"
        onClick={() =>
          setMenuOpen((current) => !current)
        }
        aria-label="打开导航"
      >
        ☰
      </button>

      <div
        style={{
          display: "flex",
          flex: 1,
          minWidth: 0,
          position: "relative",
        }}
      >
        <div
          className={[
            "aios-sidebar-container",
            menuOpen ? "is-open" : "",
          ].join(" ")}
        >
          <Sidebar />
        </div>

        {menuOpen && (
          <button
            type="button"
            className="aios-sidebar-overlay"
            onClick={() => setMenuOpen(false)}
            aria-label="关闭导航"
          />
        )}

        <main
          style={{
            flex: 1,
            minWidth: 0,
            padding: "32px 18px 48px",
            overflowX: "hidden",
            overflowY: "auto",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}