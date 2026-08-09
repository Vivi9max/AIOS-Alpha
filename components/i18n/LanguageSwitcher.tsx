"use client";

import { localeNames, supportedLocales, type Locale } from "@/lib/i18n";
import { useLanguage } from "./LanguageProvider";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLanguage();

  return (
    <label style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
      <span className="aios-language-label">{t("language.label")}</span>
      <select
        aria-label={t("language.label")}
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        style={{
          maxWidth: 132,
          minHeight: 38,
          padding: "7px 28px 7px 10px",
          border: "1px solid #475569",
          borderRadius: 10,
          background: "#1f2937",
          color: "#ffffff",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {supportedLocales.map((item) => (
          <option key={item} value={item}>{localeNames[item]}</option>
        ))}
      </select>
    </label>
  );
}
