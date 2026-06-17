/**
 * i18n bootstrap for ProCann Edu.
 *
 * Launch-scope languages: en, es, zh (Simplified Chinese).
 * Resolution order on load (matches the i18n launch package spec):
 *   1. Authenticated user's stored `preferred_language` (applied later via setLanguage())
 *   2. localStorage value (`procann_language`)
 *   3. Browser language (navigator.language → es* / zh*)
 *   4. Default 'en'
 *
 * Missing-key fallback: silently fall back to English; never render the raw key.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import es from "./locales/es.json";
import zh from "./locales/zh.json";

export const SUPPORTED_LANGUAGES = ["en", "es", "zh"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_STORAGE_KEY = "procann_language";

export const LANGUAGE_LABELS: Record<SupportedLanguage, { code: string; native: string; english: string }> = {
  en: { code: "EN", native: "English", english: "English" },
  es: { code: "ES", native: "Español", english: "Spanish" },
  zh: { code: "ZH", native: "中文", english: "Simplified Chinese" },
};

export function isSupportedLanguage(value: unknown): value is SupportedLanguage {
  return typeof value === "string" && (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      zh: { translation: zh },
    },
    fallbackLng: "en",
    supportedLngs: [...SUPPORTED_LANGUAGES],
    nonExplicitSupportedLngs: true, // map es-MX → es, zh-CN → zh
    load: "languageOnly",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
      caches: ["localStorage"],
    },
    returnNull: false,
  });

export function setLanguage(lng: SupportedLanguage) {
  if (!isSupportedLanguage(lng)) return;
  i18n.changeLanguage(lng);
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  } catch {
    // localStorage may be unavailable (private mode); silent fail is fine.
  }
}

export function getCurrentLanguage(): SupportedLanguage {
  const raw = i18n.resolvedLanguage ?? i18n.language ?? "en";
  const base = raw.split("-")[0];
  return isSupportedLanguage(base) ? base : "en";
}

export default i18n;
