import { createContext, useContext, useMemo, useState } from "react";

import { acceptLanguage as toAcceptLanguage } from "../accept-language/index.ts";
import type {
  Formatting,
  LocaleHandle,
  MirrorTransform,
  ProviderProps,
} from "../types.ts";

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
   * Provider component. Pass `locales` (a ranked list) or `locale` (a single
   * locale) for controlled mode — the parent owns the value — or omit both
   * for uncontrolled, where the preference list starts at `initialLocale` and
   * changes via `setLocale` / `setLocales`.
   *
   * @param props - {@link ProviderProps} controlling locale source and the
   * subtree.
   */
  function Provider({
    locale,
    locales,
    formatting,
    onLocaleChange,
    onLocalesChange,
    onFormattingChange,
    children,
  }: ProviderProps<L>) {
    const [internal, setInternal] = useState<readonly L[]>(() =>
      controlled(locales, locale, [initialLocale]),
    );
    const [internalFormatting, setInternalFormatting] = useState<Formatting>(
      () => formatting ?? {},
    );
    // A present `locales` / `locale` prop is authoritative (controlled);
    // otherwise the internally-managed list wins (uncontrolled).
    const active = useMemo<readonly L[]>(
      () => controlled(locales, locale, internal),
      [locales, locale, internal],
    );
    // Same rule for formatting: a controlled `formatting` prop wins, else the
    // internally-managed overrides.
    const activeFormatting = formatting ?? internalFormatting;
    const handle = useMemo<LocaleHandle<L>>(() => {
      const [head = initialLocale] = active;
      return {
        locale: head,
        locales: active,
        setLocale(next: L) {
          setInternal([next]);
          onLocaleChange?.(next);
          onLocalesChange?.([next]);
        },
        setLocales(next: readonly L[]) {
          const [first] = next;
          if (first === undefined) return;
          setInternal(next);
          onLocaleChange?.(first);
          onLocalesChange?.(next);
        },
        acceptLanguage() {
          return toAcceptLanguage(active);
        },
        transform: mirrorTransform(head),
        formatting: activeFormatting,
        setFormatting(next: Formatting) {
          setInternalFormatting(next);
          onFormattingChange?.(next);
        },
        formatLocale: resolveFormatLocale(head, activeFormatting),
      };
    }, [
      active,
      activeFormatting,
      onLocaleChange,
      onLocalesChange,
      onFormattingChange,
    ]);
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
        "Tradurre: useLocale() called outside of an <i18n.Provider>.",
      );
    }
    return handle;
  }

  return { Provider, useLocale };
}

/**
 * Resolves the effective preference list from the (optional) controlled
 * props, preferring a non-empty `locales` list, then a single `locale`, and
 * finally `fallback` (the uncontrolled internal state or the initial list).
 * Kept outside the render body so the resolution rule is shared by the
 * `useState` initialiser and the per-render `useMemo`.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @param locales - Controlled ranked list, if supplied.
 * @param locale - Controlled single locale, if supplied.
 * @param fallback - List to use when neither controlled prop is present.
 * @returns The non-empty preference list to expose on the handle.
 */
function controlled<L extends string>(
  locales: readonly L[] | undefined,
  locale: L | undefined,
  fallback: readonly L[],
): readonly L[] {
  if (locales && locales.length > 0) return locales;
  if (locale !== undefined) return [locale];
  return fallback;
}

/**
 * Builds the icon-mirroring `transform` for a locale — `{ scaleX: -1 }` when
 * the locale reads right-to-left, `undefined` otherwise (so an LTR icon is
 * left intact). Direction is read from the locale's own {@link Intl.Locale}
 * text-direction data, so every RTL locale the platform's CLDR knows resolves
 * correctly with no hand-kept list.
 *
 * @param locale - Active locale to derive direction from.
 * @returns The React Native transform entry for flipping directional icons, or
 * `undefined` under LTR.
 */
function mirrorTransform(locale: string): MirrorTransform | undefined {
  const rtl = new Intl.Locale(locale).getTextInfo().direction === "rtl";
  if (!rtl) return undefined;
  return { scaleX: -1 };
}

/**
 * Composes the formatting locale from a display locale and its
 * {@link Formatting} overrides — the tag `Intl` factories are built from.
 * Uses {@link Intl.Locale} so region, calendar, numbering system, and hour
 * cycle land in the right subtags / Unicode extensions (e.g.
 * `("en", { region: "AE", calendar: "islamic" })` → `"en-AE-u-ca-islamic"`).
 * With no overrides it returns the display locale unchanged.
 *
 * @param locale - Active display locale.
 * @param formatting - Overrides layered onto it; `undefined` fields inherit.
 * @returns The resolved formatting locale as a BCP-47 tag.
 */
function resolveFormatLocale(locale: string, formatting: Formatting): string {
  return new Intl.Locale(locale, formatting).toString();
}
