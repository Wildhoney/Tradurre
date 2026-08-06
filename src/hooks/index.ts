import { useMemo } from "react";

import type { Dictionary } from "../dictionary/index.ts";
import type { Input, ResolvedDictionaries } from "../types.ts";

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
   * Resolves one or more {@link Dictionary} bundles against the active locale.
   *
   * Reads the locale from the surrounding `<i18n.Provider>` and returns a
   * memoised `{ copy, locale }` bundle. Pass several dictionaries and their
   * resolved `copy` objects are merged with **last-wins** precedence — a key
   * defined by a later argument overrides the same key in an earlier one, in
   * both the value (`Object.assign`) and the type (see
   * {@link ResolvedDictionaries}) — so shared/common copy can be layered over
   * a screen's own without repetition.
   *
   * @typeParam Ds - Tuple of dictionary input shapes, inferred per argument.
   * @param dictionaries - One or more dictionaries built via
   * `i18n.dictionary(...)`. Later dictionaries win on any shared message id.
   * @returns A `{ copy, locale }` bundle keyed by the active locale, with
   * every dictionary merged into `copy`.
   */
  function useI18n<const Ds extends readonly [Input<L>, ...Input<L>[]]>(
    ...dictionaries: { readonly [Index in keyof Ds]: Dictionary<L, Ds[Index]> }
  ): ResolvedDictionaries<L, Ds> {
    const { locale, formatLocale } = useLocale();
    return useMemo(() => {
      const [head, ...tail] = dictionaries;
      const headBundle = head.resolve(locale, formatLocale);
      // Fast path preserves the dictionary's cached bundle reference for the
      // overwhelmingly common single-dictionary call; only merge when needed.
      if (tail.length === 0) return headBundle as ResolvedDictionaries<L, Ds>;
      const copy = Object.assign(
        {},
        headBundle.copy,
        ...tail.map(
          (dictionary) => dictionary.resolve(locale, formatLocale).copy,
        ),
      );
      return {
        copy,
        locale: headBundle.locale,
      } as ResolvedDictionaries<L, Ds>;
    }, [locale, formatLocale, ...dictionaries]);
  }

  return { useI18n };
}
