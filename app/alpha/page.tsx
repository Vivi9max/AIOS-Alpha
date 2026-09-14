"use client";

import Link from "next/link";
import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

import type {
  Locale,
} from "@/lib/i18n";

import {
  alphaAccessCopy,
} from "@/lib/i18n/alpha-access";

import {
  APP_VERSION,
} from "@/lib/config/app";

export default function AlphaAccessPage() {
  const {
    locale,
  } = useLanguage();

  const [mounted, setMounted] =
    useState(false);

  const [code, setCode] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeLocale: Locale =
    mounted ? locale : "en";

  const copy =
    alphaAccessCopy[activeLocale];

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const cleanCode =
      code.trim();

    if (
      !cleanCode ||
      loading
    ) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/alpha/invite",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
              "x-aios-locale":
                activeLocale,
            },
            credentials:
              "same-origin",
            body: JSON.stringify({
              code: cleanCode,
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.content ||
            data.error ||
            copy.invalidCode
        );
      }

      window.location.href =
        typeof data.redirect ===
        "string"
          ? data.redirect
          : "/workspace";
    } catch (
      submitError
    ) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : copy.invalidCode
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      key={activeLocale}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        boxSizing: "border-box",
        background:
          "linear-gradient(180deg, #0f172a 0%, #111827 46%, #f8fafc 46%)",
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 480,
          padding: 28,
          boxSizing: "border-box",
          borderRadius: 24,
          background: "#ffffff",
          border:
            "1px solid #e2e8f0",
          boxShadow:
            "0 28px 80px rgba(15, 23, 42, 0.24)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "5px 11px",
            borderRadius: 999,
            background: "#eff6ff",
            border:
              "1px solid #bfdbfe",
            color: "#1d4ed8",
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          {copy.badge} · v{APP_VERSION}
        </div>

        <div
          style={{
            width: 58,
            height: 58,
            marginTop: 22,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 18,
            background: "#dbeafe",
            fontSize: 30,
          }}
        >
          🚀
        </div>

        <h1
          style={{
            margin:
              "20px 0 0",
            color: "#0f172a",
            fontSize: 30,
            lineHeight: 1.2,
          }}
        >
          {copy.title}
        </h1>

        <p
          style={{
            margin:
              "12px 0 0",
            color: "#64748b",
            fontSize: 15,
            lineHeight: 1.7,
          }}
        >
          {copy.description}
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            marginTop: 24,
          }}
        >
          <label
            htmlFor="alpha-code"
            style={{
              display: "block",
              marginBottom: 8,
              color: "#334155",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            {copy.inviteLabel}
          </label>

          <input
            id="alpha-code"
            type="text"
            value={code}
            onChange={(event) =>
              setCode(
                event.target.value
              )
            }
            placeholder={
              copy.invitePlaceholder
            }
            autoComplete="off"
            autoCapitalize="characters"
            aria-label={
              copy.inviteLabel
            }
            style={{
              width: "100%",
              height: 52,
              padding:
                "0 16px",
              boxSizing:
                "border-box",
              border:
                "1px solid #cbd5e1",
              borderRadius: 14,
              outline: "none",
              background:
                "#ffffff",
              color: "#0f172a",
              fontSize: 16,
            }}
          />

          {error && (
            <div
              role="alert"
              style={{
                marginTop: 12,
                padding:
                  "11px 13px",
                border:
                  "1px solid #fecaca",
                borderRadius: 12,
                background:
                  "#fff7f7",
                color:
                  "#b91c1c",
                fontSize: 13,
                lineHeight: 1.5,
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={
              !code.trim() ||
              loading
            }
            style={{
              width: "100%",
              height: 52,
              marginTop: 16,
              border: 0,
              borderRadius: 14,
              background:
                code.trim() &&
                !loading
                  ? "#0f172a"
                  : "#cbd5e1",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 800,
              cursor:
                code.trim() &&
                !loading
                  ? "pointer"
                  : "not-allowed",
            }}
          >
            {loading
              ? copy.verifying
              : copy.enter}
          </button>
        </form>

        <p
          style={{
            margin:
              "20px 0 0",
            color: "#94a3b8",
            fontSize: 12,
            lineHeight: 1.6,
            textAlign: "center",
          }}
        >
          {copy.continueText}{" "}
          <Link
            href="/privacy"
            style={{
              color: "#2563eb",
              fontWeight: 700,
              textDecoration:
                "none",
            }}
          >
            {copy.privacy}
          </Link>
        </p>
      </section>
    </main>
  );
}
