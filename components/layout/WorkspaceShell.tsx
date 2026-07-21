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

export default function WorkspaceShell({
  children,
}: {
  children:
    ReactNode;
}) {
  const pathname =
    usePathname();

  const [
    menuOpen,
    setMenuOpen,
  ] =
    useState(
      false
    );

  const openMenu =
    useCallback(
      () => {
        setMenuOpen(
          true
        );
      },
      []
    );

  const closeMenu =
    useCallback(
      () => {
        setMenuOpen(
          false
        );
      },
      []
    );

  const toggleMenu =
    useCallback(
      () => {
        setMenuOpen(
          (
            current
          ) =>
            !current
        );
      },
      []
    );

  useEffect(() => {
    closeMenu();
  }, [
    pathname,
    closeMenu,
  ]);

  useEffect(() => {
    if (
      !menuOpen
    ) {
      return;
    }

    const previousOverflow =
      document.body.style
        .overflow;

    document.body.style.overflow =
      "hidden";

    function handleKeyDown(
      event:
        KeyboardEvent
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
      handleKeyDown
    );

    return () => {
      document.body.style.overflow =
        previousOverflow;

      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    menuOpen,
    closeMenu,
  ]);

  function handleMenuPointerDown(
    event:
      React.PointerEvent<HTMLButtonElement>
  ) {
    event.stopPropagation();

    if (
      event.pointerType ===
      "touch"
    ) {
      toggleMenu();
    }
  }

  function handleMenuClick(
    event:
      React.MouseEvent<HTMLButtonElement>
  ) {
    event.stopPropagation();

    if (
      event.detail === 0
    ) {
      toggleMenu();

      return;
    }

    const pointerSupported =
      typeof window !==
        "undefined" &&
      "PointerEvent" in
        window;

    if (
      !pointerSupported
    ) {
      toggleMenu();
    }
  }

  return (
    <div
      className={
        menuOpen
          ? "aios-workspace-shell menu-open"
          : "aios-workspace-shell"
      }
    >
      <Header />

      <button
        type="button"
        className={
          menuOpen
            ? "aios-mobile-menu-button is-open"
            : "aios-mobile-menu-button"
        }
        onPointerDown={
          handleMenuPointerDown
        }
        onClick={
          handleMenuClick
        }
        aria-label={
          menuOpen
            ? "关闭导航菜单"
            : "打开导航菜单"
        }
        aria-expanded={
          menuOpen
        }
        aria-controls="aios-mobile-sidebar"
      >
        <span
          aria-hidden="true"
        >
          {menuOpen
            ? "×"
            : "☰"}
        </span>
      </button>

      <div className="aios-workspace-body">
        <aside
          id="aios-mobile-sidebar"
          className={[
            "aios-sidebar-container",
            menuOpen
              ? "is-open"
              : "",
          ]
            .filter(
              Boolean
            )
            .join(
              " "
            )}
          aria-hidden={
            !menuOpen
          }
        >
          <Sidebar />
        </aside>

        <button
          type="button"
          className={[
            "aios-sidebar-overlay",
            menuOpen
              ? "is-visible"
              : "",
          ]
            .filter(
              Boolean
            )
            .join(
              " "
            )}
          onPointerDown={(
            event
          ) => {
            event.preventDefault();
            event.stopPropagation();
            closeMenu();
          }}
          onClick={
            closeMenu
          }
          aria-label="关闭导航菜单"
          tabIndex={
            menuOpen
              ? 0
              : -1
          }
        />

        <main className="aios-workspace-main">
          {children}
        </main>
      </div>
    </div>
  );
}