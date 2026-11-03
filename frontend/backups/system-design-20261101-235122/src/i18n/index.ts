import { en } from "./en";
import { fa } from "./fa";
import { ps } from "./ps";

export type Language = "en" | "fa" | "ps";

const translations = {
  en,
  fa,
  ps,
};

export type TranslationKeys = typeof en;

export function getTranslation(lang: Language): TranslationKeys {
  return translations[lang] || en;
}

export const languages: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "fa", label: "دری" },
  { code: "ps", label: "پښتو" },
];
