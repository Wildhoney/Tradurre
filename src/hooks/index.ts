import type { Dictionary } from "../dictionary/index.ts";
import type { Input, ResolvedDictionary } from "../types.ts";

/**
 * Factory that binds a hook closure to a specific provider's `useLocale`
 * implementation. Called once during {@link I18n} construction so that
 * `useI18n` always reads from the same React context as the surrounding
 * provider.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @param useLocale - Hook returning the active locale handle for the
 * surrounding provider — its display `locale` and resolved `formatLocale`.
 * @returns An object exposing a typed `useI18n` hook.
 */
export function makeHooks<L extends string>(
  useLocale: () => { locale: L; formatLocale: string },
) {
  /**
   * Resolves a {@link Dictionary} against the active locale.
   *
   * Reads the locale from the surrounding `<i18n.Provider>` and returns the
   * memoised `{ copy, locale }` bundle.
   *
   * @typeParam D - Dictionary input type.
   * @param dictionary - Dictionary built via `i18n.dictionary(...)`.
   * @returns A `{ copy, locale }` bundle keyed by the active locale.
   */
  function useI18n<D extends Input<L>>(
    dictionary: Dictionary<L, D>,
  ): ResolvedDictionary<L, D> {
    const { locale, formatLocale } = useLocale();
    return dictionary.resolve(locale, formatLocale);
  }

  return { useI18n };
}
