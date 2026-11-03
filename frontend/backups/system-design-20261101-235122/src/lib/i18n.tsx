import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { en } from "../i18n/en";
import { fa } from "../i18n/fa";
import { ps } from "../i18n/ps";

export type Language = "en" | "fa" | "ps";
export type TranslationKeys = typeof en;

const translations: Record<Language, TranslationKeys> = {
  en,
  fa,
  ps,
};

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: TranslationKeys;
  rtl: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const STORAGE_KEY = "hqnatex.erp.lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as Language) || "en";
  });

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(STORAGE_KEY, lang);
  }, []);

  const rtl = language !== "en";
  const t = translations[language];

  useEffect(() => {
    document.documentElement.dir = rtl ? "rtl" : "ltr";
    document.documentElement.lang = language;
  }, [language, rtl]);

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, rtl }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useTranslation must be used within an I18nProvider");
  }
  return context;
}
