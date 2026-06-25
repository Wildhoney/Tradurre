import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { LocaleHandle } from "../types.ts";

export function makeProvider<L extends string>(initialLocale: L) {
  const Context = createContext<LocaleHandle<L> | null>(null);

  function Provider({
    locale,
    onLocaleChange,
    children,
  }: {
    locale?: L;
    onLocaleChange?(next: L): void;
    children: ReactNode;
  }) {
    const [internal, setInternal] = useState<L>(locale ?? initialLocale);
    const active = locale ?? internal;
    const handle = useMemo<LocaleHandle<L>>(
      () => ({
        locale: active,
        setLocale(next: L) {
          setInternal(next);
          onLocaleChange?.(next);
        },
      }),
      [active, onLocaleChange],
    );
    return <Context.Provider value={handle}>{children}</Context.Provider>;
  }

  function useLocale(): LocaleHandle<L> {
    const handle = useContext(Context);
    if (handle === null) {
      throw new Error(
        "Reacti8n: useLocale() called outside of an <i18n.Provider>.",
      );
    }
    return handle;
  }

  return { Provider, useLocale };
}
