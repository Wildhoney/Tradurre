import type { Format } from "../types.ts";

/**
 * Builds a {@link Format} object bound to `locale`. Each factory returns a
 * fresh `Intl` instance configured for that locale — no caching is performed
 * here; the dictionary memoises the format object itself per-locale.
 *
 * @param locale - Active locale string.
 * @returns A locale-bound {@link Format} object passed to every formatter.
 */
export function makeFormat(locale: string): Format {
  return {
    number: (options) => new Intl.NumberFormat(locale, options),
    dateTime: (options) => new Intl.DateTimeFormat(locale, options),
    plural: (options) =>
      new Intl.PluralRules(locale, { ...options, type: "cardinal" }),
    ordinal: (options) =>
      new Intl.PluralRules(locale, { ...options, type: "ordinal" }),
    select(value, cases) {
      const matched = cases[value];
      return matched === undefined ? cases.other : matched;
    },
    collator: (options) => new Intl.Collator(locale, options),
    displayNames: (options) => new Intl.DisplayNames(locale, options),
    duration: (options) => new Intl.DurationFormat(locale, options),
    list: (options) => new Intl.ListFormat(locale, options),
    relativeTime: (options) => new Intl.RelativeTimeFormat(locale, options),
    segmenter: (options) => new Intl.Segmenter(locale, options),
  };
}
