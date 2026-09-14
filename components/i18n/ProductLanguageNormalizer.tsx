"use client";

import { useEffect } from "react";

import { useLanguage } from "@/components/i18n/LanguageProvider";
import {
  legacyProductCorrections,
} from "@/lib/i18n/product-language";

/**
 * C143.21.3
 *
 * Product Language Runtime Normalizer
 *
 * Purpose:
 * - Correct known legacy product UI wording at runtime.
 * - Apply the canonical product-language layer without replacing
 *   the existing LegacyPageLocalizer.
 * - Prevent known mechanical translations from reaching the user.
 *
 * Safety boundary:
 * - Exact phrase matching only.
 * - No substring replacement.
 * - Never touches form controls.
 * - Never touches editable content.
 * - Never touches code/preformatted content.
 * - Never touches explicitly marked user/generated content.
 *
 * This layer is intentionally narrow.
 * It is a correction layer, not a general-purpose translation engine.
 */

const EXCLUDED_TAGS = new Set([
  "INPUT",
  "TEXTAREA",
  "SELECT",
  "OPTION",
  "BUTTON",
  "CODE",
  "PRE",
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
]);

const EXCLUDED_SELECTORS = [
  "[contenteditable='true']",
  "[data-user-content]",
  "[data-generated-content]",
  "[data-ai-content]",
  "[data-runtime-content]",
];

function shouldSkipTextNode(
  node: Text,
): boolean {
  const parent = node.parentElement;

  if (!parent) {
    return true;
  }

  if (EXCLUDED_TAGS.has(parent.tagName)) {
    return true;
  }

  if (
    parent.closest(
      EXCLUDED_SELECTORS.join(","),
    )
  ) {
    return true;
  }

  return false;
}

function normalizeTextNode(
  node: Text,
  corrections: Record<string, string>,
): boolean {
  if (shouldSkipTextNode(node)) {
    return false;
  }

  const current = node.nodeValue;

  if (!current) {
    return false;
  }

  const normalizedCurrent = current.trim();

  if (!normalizedCurrent) {
    return false;
  }

  const replacement =
    corrections[normalizedCurrent];

  if (
    replacement === undefined ||
    replacement === normalizedCurrent
  ) {
    return false;
  }

  const leadingWhitespace =
    current.slice(
      0,
      current.indexOf(normalizedCurrent),
    );

  const trailingStart =
    current.indexOf(normalizedCurrent) +
    normalizedCurrent.length;

  const trailingWhitespace =
    current.slice(trailingStart);

  node.nodeValue =
    `${leadingWhitespace}${replacement}${trailingWhitespace}`;

  return true;
}

function normalizeRoot(
  root: ParentNode,
  corrections: Record<string, string>,
): void {
  const walker =
    document.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
    );

  const nodes: Text[] = [];

  let current =
    walker.nextNode();

  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }

  for (const node of nodes) {
    normalizeTextNode(
      node,
      corrections,
    );
  }
}

export default function ProductLanguageNormalizer() {
  const { locale } = useLanguage();

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }

    const corrections =
      legacyProductCorrections[locale];

    if (!corrections) {
      return;
    }

    let normalizing = false;

    const normalize = (
      root: ParentNode = document.body,
    ) => {
      if (normalizing) {
        return;
      }

      normalizing = true;

      try {
        normalizeRoot(
          root,
          corrections,
        );
      } finally {
        normalizing = false;
      }
    };

    normalize();

    const observer =
      new MutationObserver(
        (mutations) => {
          if (normalizing) {
            return;
          }

          normalizing = true;

          try {
            for (const mutation of mutations) {
              if (
                mutation.type ===
                "characterData"
              ) {
                normalizeTextNode(
                  mutation.target as Text,
                  corrections,
                );

                continue;
              }

              for (const node of Array.from(
                mutation.addedNodes,
              )) {
                if (
                  node.nodeType ===
                  Node.TEXT_NODE
                ) {
                  normalizeTextNode(
                    node as Text,
                    corrections,
                  );

                  continue;
                }

                if (
                  node.nodeType ===
                  Node.ELEMENT_NODE
                ) {
                  normalizeRoot(
                    node as Element,
                    corrections,
                  );
                }
              }
            }
          } finally {
            normalizing = false;
          }
        },
      );

    observer.observe(
      document.body,
      {
        childList: true,
        characterData: true,
        subtree: true,
      },
    );

    return () => {
      observer.disconnect();
    };
  }, [locale]);

  return null;
}
