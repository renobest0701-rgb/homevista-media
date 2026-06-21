"use client";

import { createContext, useContext, useState, useEffect } from "react";
import { t, type Lang } from "./translations";

type Translations = typeof t.ja | typeof t.zh;

const LangContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  tr: Translations;
}>({ lang: "ja", setLang: () => {}, tr: t.ja });

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("ja");

  useEffect(() => {
    const saved = localStorage.getItem("hv-lang") as Lang | null;
    if (saved === "zh" || saved === "ja") setLangState(saved);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("hv-lang", l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, tr: t[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
