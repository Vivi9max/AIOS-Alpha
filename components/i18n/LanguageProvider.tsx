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

  const [ready, setReady] =
    useState(false);

  useEffect(() => {
    const stored =
      window.localStorage.getItem(
        LOCALE_STORAGE_KEY,
      );

    const initialLocale = isLocale(stored)
      ? stored
      : detectLocale(window.navigator.language);

    setLocaleState(initialLocale);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    document.documentElement.lang = locale;

    window.localStorage.setItem(
      LOCALE_STORAGE_KEY,
      locale,
    );
  }, [locale, ready]);

  const setLocale = useCallback(
    (nextLocale: Locale) => {
      setLocaleState(nextLocale);

      window.localStorage.setItem(
        LOCALE_STORAGE_KEY,
        nextLocale,
      );

      document.documentElement.lang =
        nextLocale;
    },
    [],
  );

  const value =
    useMemo<LanguageContextValue>(
      () => ({
        locale,
        setLocale,
        t: (key) =>
          translate(locale, key),
      }),
      [locale, setLocale],
    );

  if (!ready) {
    return null;
  }

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context =
    useContext(LanguageContext);

  if (!context) {
    throw new Error(
      "useLanguage must be used within LanguageProvider.",
    );
  }

  return context;
}
