"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_LOCALE,
  detectLocale,
  isLocale,
  LOCALE_STORAGE_KEY,
  translate,
  type Locale,
  type MessageKey,
} from "@/lib/i18n";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
}

const LanguageContext =
  createContext<LanguageContextValue | null>(null);

export default function LanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] =
    useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    let initialLocale =
      DEFAULT_LOCALE;

    try {
      const stored =
        window.localStorage.getItem(
          LOCALE_STORAGE_KEY,
        );

      if (isLocale(stored)) {
        initialLocale = stored;
      } else {
        initialLocale = detectLocale(
          window.navigator.language,
        );
      }
    } catch {
      initialLocale =
        DEFAULT_LOCALE;
    }

    setLocaleState(
      initialLocale,
    );

    try {
      document.documentElement.lang =
        initialLocale;

      window.localStorage.setItem(
        LOCALE_STORAGE_KEY,
        initialLocale,
      );
    } catch {
      // Locale persistence is optional.
      // Rendering must never fail because
      // storage or document access is unavailable.
    }
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang =
        locale;

      window.localStorage.setItem(
        LOCALE_STORAGE_KEY,
        locale,
      );
    } catch {
      // Keep the application usable even
      // when browser persistence is unavailable.
    }
  }, [locale]);

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      setLocaleState(
        nextLocale,
      );

      try {
        window.localStorage.setItem(
          LOCALE_STORAGE_KEY,
          nextLocale,
        );

        document.documentElement.lang =
          nextLocale;
      } catch {
        // Locale state remains valid even
        // if persistence is unavailable.
      }
    },
    [],
  );

  const value =
    useMemo<LanguageContextValue>(
      () => ({
        locale,
        setLocale,
        t: (key) =>
          translate(
            locale,
            key,
          ),
      }),
      [
        locale,
        setLocale,
      ],
    );

  /*
   * Never return null while waiting for
   * browser-side locale detection.
   *
   * The application must render immediately
   * with DEFAULT_LOCALE and then switch to
   * the detected/stored locale after mount.
   *
   * This prevents a global white screen when
   * hydration, localStorage, or browser locale
   * detection is delayed or unavailable.
   */
  return (
    <LanguageContext.Provider
      value={value}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context =
    useContext(
      LanguageContext,
    );

  if (!context) {
    throw new Error(
      "useLanguage must be used within LanguageProvider.",
    );
  }

  return context;
}
