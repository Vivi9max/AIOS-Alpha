"use client";

import type {
  ReactNode,
} from "react";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  usePathname,
} from "next/navigation";

import Header from "./Header";
import Sidebar from "./Sidebar";

import {
  useLanguage,
} from "@/components/i18n/LanguageProvider";

export default function WorkspaceShell({
  children,
}: {
  children: ReactNode;
}) {
  const {
    t,
  } = useLanguage();

  const pathname =
    usePathname();

  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);

  const closeMenu =
    useCallback(() => {
      setMenuOpen(false);
    }, []);

  const toggleMenu =
    useCallback(() => {
      setMenuOpen(
        (current) => !current,
      );
    }, []);

  useEffect(() => {
    closeMenu();
  }, [
    pathname,
    closeMenu,
  ]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event: KeyboardEvent,
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        closeMenu();
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [
    menuOpen,
    closeMenu,
  ]);

  return (
    <div
      className={
        menuOpen
          ? "aios-workspace-shell menu-open"
          : "aios-workspace-shell"
      }
    >
      <Header />

      <div className="aios-workspace-body">
        <aside
          id="aios-mobile-sidebar"
          className={
            menuOpen
              ? "aios-sidebar-container is-open"
              : "aios-sidebar-container"
          }
        >
          <Sidebar />
        </aside>

        <button
          type="button"
          className={
            menuOpen
              ? "aios-sidebar-overlay is-visible"
              : "aios-sidebar-overlay"
          }
          onClick={
            closeMenu
          }
          aria-label={t(
            "nav.close",
          )}
          tabIndex={
            menuOpen
              ? 0
              : -1
        }
        />

        <main
          className="aios-workspace-main"
        >
          {children}
        </main>
      </div>

      <button
        type="button"
        className={
          menuOpen
            ? "aios-mobile-menu-button is-open"
            : "aios-mobile-menu-button"
        }
        onClick={
          toggleMenu
        }
        aria-label={
          menuOpen
            ? t("nav.close")
            : t("nav.open")
        }
        aria-expanded={
          menuOpen
        }
        aria-controls={
          "aios-mobile-sidebar"
        }
      >
        <span
          aria-hidden="true"
        >
          {menuOpen
            ? "×"
            : "☰"}
        </span>
      </button>
    </div>
  );
}
