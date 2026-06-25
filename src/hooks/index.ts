import type { Dictionary } from "../dictionary/index.ts";
import type { Input, Merged } from "../types.ts";

/**
 * Factory that binds a hook closure to a specific provider's `useLocale`
 * implementation. Called once during {@link I18n} construction so that
 * `useI18n` always reads from the same React context as the surrounding
 * provider.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @param useLocale - Hook returning the active locale handle for the
 * surrounding provider.
 * @returns An object exposing a typed `useI18n` hook.
 */
export function makeHooks<L extends string>(useLocale: () => { locale: L }) {
  /**
   * Resolves a {@link Dictionary} against the active locale.
   *
   * Reads the locale from the surrounding `<i18n.Provider>` and returns the
   * memoised resolved view typed by {@link Merged}.
   *
   * @typeParam D - Dictionary input type.
   * @param dictionary - Dictionary built via `i18n.dictionary(...)`.
   * @returns A fully resolved object whose keys are the message ids.
   */
  function useI18n<D extends Input<L>>(
    dictionary: Dictionary<L, D>,
  ): Merged<L, D> {
    return dictionary.resolve(useLocale().locale);
  }

  return { useI18n };
}
