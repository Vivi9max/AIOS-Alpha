"use client";

import type { ReactNode } from "react";
import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import Header from "./Header";
import Sidebar from "./Sidebar";
import ProductWorkflowNav from "./ProductWorkflowNav";

import { useLanguage } from "@/components/i18n/LanguageProvider";

interface ScrollSnapshot {
  element: HTMLElement;
  top: number;
  left: number;
}

function isDeleteButton(
  element: HTMLElement,
): boolean {
  const button =
    element.closest(
      "button[aria-label]",
    );

  if (!button) {
    return false;
  }

  const label =
    button
      .getAttribute("aria-label")
      ?.toLowerCase() ?? "";

  return (
    label.includes("delete") ||
    label.includes("删除") ||
    label.includes("削除")
  );
}

function captureScrollState(
  target: HTMLElement,
): ScrollSnapshot[] {
  const snapshots: ScrollSnapshot[] = [];
  const visited =
    new Set<HTMLElement>();

  let current:
    | HTMLElement
    | null = target;

  while (current) {
    if (
      !visited.has(current) &&
      (
        current.scrollHeight >
          current.clientHeight ||
        current.scrollWidth >
          current.clientWidth
      )
    ) {
      snapshots.push({
        element: current,
        top: current.scrollTop,
        left: current.scrollLeft,
      });

      visited.add(current);
    }

    current =
      current.parentElement;
  }

  const scrollingElement =
    document.scrollingElement;

  if (
    scrollingElement instanceof
      HTMLElement &&
    !visited.has(
      scrollingElement,
    )
  ) {
    snapshots.push({
      element:
        scrollingElement,
      top:
        scrollingElement.scrollTop,
      left:
        scrollingElement.scrollLeft,
    });
  }

  return snapshots;
}

function restoreScrollState(
  snapshots: ScrollSnapshot[],
): void {
  for (
    const snapshot of snapshots
  ) {
    snapshot.element.scrollTop =
      snapshot.top;

    snapshot.element.scrollLeft =
      snapshot.left;
  }
}

export default function WorkspaceShell({
  children,
}: {
  children: ReactNode;
}) {
  const { t } = useLanguage();
  const pathname =
    usePathname();

  const [menuOpen, setMenuOpen] =
    useState(false);

  const closeMenu = useCallback(
    () => {
      setMenuOpen(false);
    },
    [],
  );

  const toggleMenu = useCallback(
    () => {
      setMenuOpen(
        (current) => !current,
      );
    },
    [],
  );

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

  /*
   * Preserve both the outer workspace scroll
   * and the inner chat scroll when a message
   * delete action changes the message list height.
   */
  useEffect(() => {
    let pending:
      | ScrollSnapshot[]
      | null = null;

    function scheduleRestore() {
      if (!pending) {
        return;
      }

      const snapshots =
        pending;

      window.requestAnimationFrame(
        () => {
          restoreScrollState(
            snapshots,
          );
        },
      );

      window.setTimeout(
        () => {
          restoreScrollState(
            snapshots,
          );
        },
        0,
      );

      window.setTimeout(
        () => {
          restoreScrollState(
            snapshots,
          );
        },
        180,
      );
    }

    function handlePointerDown(
      event: PointerEvent,
    ) {
      const target =
        event.target;

      if (
        !(target instanceof
          HTMLElement) ||
        !isDeleteButton(
          target,
        )
      ) {
        return;
      }

      pending =
        captureScrollState(
          target,
        );
    }

    function handleClick(
      event: MouseEvent,
    ) {
      const target =
        event.target;

      if (
        !(target instanceof
          HTMLElement) ||
        !isDeleteButton(
          target,
        )
      ) {
        return;
      }

      if (!pending) {
        pending =
          captureScrollState(
            target,
          );
      }

      scheduleRestore();

      window.setTimeout(
        () => {
          pending = null;
        },
        220,
      );
    }

    document.addEventListener(
      "pointerdown",
      handlePointerDown,
      true,
    );

    document.addEventListener(
      "click",
      handleClick,
      true,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handlePointerDown,
        true,
      );

      document.removeEventListener(
        "click",
        handleClick,
        true,
      );
    };
  }, []);

  const showProductWorkflow =
    pathname === "/planner" ||
    pathname.startsWith(
      "/planner/",
    ) ||
    pathname === "/dashboard" ||
    pathname === "/tasks" ||
    pathname === "/execution" ||
    pathname.startsWith(
      "/execution/",
    );

  return (
    <div
      className={
        menuOpen
          ? "aios-workspace-shell menu-open"
          : "aios-workspace-shell"
      }
    >
      <Header />

      {showProductWorkflow ? (
        <ProductWorkflowNav />
      ) : null}

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
          onClick={closeMenu}
          aria-label={t("nav.close")}
          tabIndex={
            menuOpen ? 0 : -1
          }
        />

        <main className="aios-workspace-main">
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
        onClick={toggleMenu}
        aria-label={
          menuOpen
            ? t("nav.close")
            : t("nav.open")
        }
        aria-expanded={menuOpen}
        aria-controls="aios-mobile-sidebar"
      >
        <span aria-hidden="true">
          {menuOpen
            ? "×"
            : "☰"}
        </span>
      </button>

      <style jsx global>{`
        /*
         * Shared chat input controls.
         * This intentionally lives at the workspace shell level
         * so Global and CN use the same productized controls.
         */
        .aios-chat-surface
          .aios-input-actions,
        .aios-cn-chat-section
          .aios-input-actions {
          display: flex !important;
          flex-wrap: wrap !important;
          align-items: center !important;
          gap: 6px !important;
          width: 100%;
        }

        .aios-chat-surface
          .aios-input-action,
        .aios-cn-chat-section
          .aios-input-action {
          appearance: none !important;
          -webkit-appearance: none !important;
          box-sizing: border-box !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 5px !important;
          min-width: 0 !important;
          min-height: 36px !important;
          height: 36px !important;
          padding: 0 10px !important;
          border: 1px solid #d8e0e8 !important;
          border-radius: 10px !important;
          background: #ffffff !important;
          color: #334155 !important;
          font-size: 11px !important;
          line-height: 1 !important;
          font-weight: 800 !important;
          box-shadow:
            0 1px 2px
            rgba(15, 23, 42, 0.03) !important;
          cursor: pointer !important;
        }

        .aios-chat-surface
          .aios-input-action:hover:not(
            :disabled
          ),
        .aios-cn-chat-section
          .aios-input-action:hover:not(
            :disabled
          ) {
          border-color: #cbd5e1 !important;
          background: #f8fafc !important;
        }

        .aios-chat-surface
          .aios-input-action:disabled,
        .aios-cn-chat-section
          .aios-input-action:disabled {
          opacity: 0.55 !important;
          cursor: not-allowed !important;
        }

        .aios-chat-surface
          .aios-input-action-icon,
        .aios-cn-chat-section
          .aios-input-action-icon {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: 18px !important;
          height: 18px !important;
          flex: 0 0 18px !important;
          border-radius: 6px !important;
          background: #f1f5f9 !important;
          color: #64748b !important;
          font-size: 9px !important;
          line-height: 1 !important;
          font-weight: 900 !important;
        }

        .aios-chat-surface
          .aios-input-action-label,
        .aios-cn-chat-section
          .aios-input-action-label {
          display: inline-block !important;
          min-width: 0 !important;
          white-space: nowrap !important;
        }

        /*
         * CN hero:
         * remove the oversized marketing slogan and keep
         * the workspace identification compact.
         */
        .aios-cn-hero-copy h2,
        .aios-cn-hero-copy p {
          display: none !important;
        }

        .aios-cn-hero-copy {
          padding-top: 20px !important;
          padding-bottom: 20px !important;
        }

        /*
         * CN media tools:
         * ChatInput stays full width.
         * Video analysis and audio processing become
         * two compact sibling controls below it.
         */
        .aios-cn-chat-section
          section
          > div:last-child {
          display: grid !important;
          grid-template-columns:
            repeat(
              2,
              minmax(0, 1fr)
            ) !important;
          gap: 8px !important;
          align-items: start !important;
        }

        .aios-cn-chat-section
          section
          > div:last-child
          > div:first-child {
          grid-column: 1 / -1 !important;
          min-width: 0 !important;
        }

        .aios-cn-chat-section
          section
          > div:last-child
          > div:nth-child(2),
        .aios-cn-chat-section
          section
          > div:last-child
          > div:nth-child(3) {
          min-width: 0 !important;
          margin-top: 0 !important;
          padding: 8px !important;
          border:
            1px solid #e5eaf0 !important;
          border-radius: 12px !important;
          background: #f8fafc !important;
        }

        .aios-cn-chat-section
          section
          > div:last-child
          > div:nth-child(2)
          button,
        .aios-cn-chat-section
          section
          > div:last-child
          > div:nth-child(3)
          button,
        .aios-cn-chat-section
          section
          > div:last-child
          > div:nth-child(3)
          select {
          min-height: 34px !important;
          height: 34px !important;
          box-sizing: border-box !important;
          border-radius: 9px !important;
          font-size: 11px !important;
        }

        .aios-cn-chat-section
          section
          > div:last-child
          > div:nth-child(2)
          button,
        .aios-cn-chat-section
          section
          > div:last-child
          > div:nth-child(3)
          button {
          width: 100% !important;
          padding: 0 9px !important;
          border:
            1px solid #d8e0e8 !important;
          background: #ffffff !important;
          color: #334155 !important;
          font-weight: 800 !important;
        }

        .aios-cn-chat-section
          section
          > div:last-child
          > div:nth-child(3)
          select {
          flex: 1 1 110px !important;
          min-width: 0 !important;
          padding: 0 7px !important;
          border:
            1px solid #d8e0e8 !important;
          background: #ffffff !important;
          color: #334155 !important;
          font-weight: 700 !important;
        }

        @media (max-width: 700px) {
          .aios-chat-surface
            .aios-input-action,
          .aios-cn-chat-section
            .aios-input-action {
            flex: 1 1 calc(25% - 5px);
            min-width: 0 !important;
            padding: 0 7px !important;
            font-size: 10px !important;
          }

          .aios-chat-surface
            .aios-input-action-icon,
          .aios-cn-chat-section
            .aios-input-action-icon {
            width: 16px !important;
            height: 16px !important;
            flex-basis: 16px !important;
            font-size: 8px !important;
          }

          .aios-cn-chat-section
            section
            > div:last-child {
            grid-template-columns:
              repeat(
                2,
                minmax(0, 1fr)
              ) !important;
            gap: 6px !important;
          }

          .aios-cn-chat-section
            section
            > div:last-child
            > div:nth-child(2),
          .aios-cn-chat-section
            section
            > div:last-child
            > div:nth-child(3) {
            padding: 7px !important;
            border-radius: 10px !important;
          }

          .aios-cn-chat-section
            section
            > div:last-child
            > div:nth-child(2)
            button,
          .aios-cn-chat-section
            section
            > div:last-child
            > div:nth-child(3)
            button,
          .aios-cn-chat-section
            section
            > div:last-child
            > div:nth-child(3)
            select {
            min-height: 32px !important;
            height: 32px !important;
            font-size: 10px !important;
          }
        }
      `}</style>
    </div>
  );
}
