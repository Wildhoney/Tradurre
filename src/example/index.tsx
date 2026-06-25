import "@ant-design/v5-patch-for-react-19";
import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app";
import { Locale, i18n } from "./i18n";

const root = document.getElementById("root");
if (root === null) {
  throw new Error('Reacti8n example: missing <div id="root" />.');
}

const STORAGE_KEY = "reacti8n.example.locale";
const LOCALES = Object.values(Locale) as Locale[];
const isLocale = (value: string): value is Locale =>
  (LOCALES as string[]).includes(value);

function initialLocale(): Locale {
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (stored !== null && isLocale(stored)) return stored;
  return i18n.detect();
}

function Root() {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  return (
    <i18n.Provider
      locale={locale}
      onLocaleChange={(next) => {
        sessionStorage.setItem(STORAGE_KEY, next);
        setLocale(next);
      }}
    >
      <App />
    </i18n.Provider>
  );
}

createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
