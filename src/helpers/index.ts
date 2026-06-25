import type { Helpers } from "../types.ts";

/**
 * Builds a {@link Helpers} object bound to `locale`. Each factory returns a
 * fresh `Intl` instance configured for that locale — no caching is performed
 * here; the dictionary memoises the helpers object itself per-locale.
 *
 * @param locale - Active locale string.
 * @returns A locale-bound {@link Helpers} object passed to every formatter.
 */
export function makeHelpers(locale: string): Helpers {
  return {
    numberFormat: (options) => new Intl.NumberFormat(locale, options),
    dateTimeFormat: (options) => new Intl.DateTimeFormat(locale, options),
    pluralRules: (options) => new Intl.PluralRules(locale, options),
  };
}
