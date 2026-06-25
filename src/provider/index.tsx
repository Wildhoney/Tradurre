import { createContext, useContext, useMemo, useState } from "react";

import type { LocaleHandle, ProviderProps } from "../types.ts";

/**
 * Factory that builds a locale-scoped React provider and the matching
 * `useLocale` hook bound to it. One pair is created per {@link I18n}
 * instance — they share a private `Context`, so consumers of one provider
 * never collide with another instance's state.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @param initialLocale - Locale used when the provider runs uncontrolled
 * (the `locale` prop is omitted). Typically `locales[0]`.
 * @returns An object with the typed `Provider` component and the matching
 * `useLocale` hook.
 */
export function makeProvider<L extends string>(initialLocale: L) {
  const Context = createContext<LocaleHandle<L> | null>(null);

  /**
   * Provider component. Pass `locale` for controlled mode (locale is owned
   * by the parent) or omit it for uncontrolled (locale starts at
   * `initialLocale` and switches via `setLocale`).
   *
   * @param props - {@link ProviderProps} controlling locale source and the
   * subtree.
   */
  function Provider({ locale, onLocaleChange, children }: ProviderProps<L>) {
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

  /**
   * Hook returning the {@link LocaleHandle} for the nearest provider.
   *
   * @throws {@link Error} When called outside of a `<Provider>` subtree.
   * @returns The active locale and its setter.
   */
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
