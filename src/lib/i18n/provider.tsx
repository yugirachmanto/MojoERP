"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import {
  translate,
  type Language,
  type TranslationKey,
} from "@/lib/i18n";

type I18nContextValue = {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  lang: initialLang,
  children,
}: {
  lang: Language;
  children: ReactNode;
}) {
  const [lang, setLang] = useState<Language>(initialLang);
  const [prevLang, setPrevLang] = useState(initialLang);
  if (initialLang !== prevLang) {
    setPrevLang(initialLang);
    setLang(initialLang);
  }
  const t = (key: TranslationKey, vars?: Record<string, string | number>) =>
    translate(lang, key, vars);

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within <I18nProvider>");
  }
  return ctx;
}