import type { Helpers } from "../types.ts";

export function makeHelpers(locale: string): Helpers {
  return {
    numberFormat: (options) => new Intl.NumberFormat(locale, options),
    dateTimeFormat: (options) => new Intl.DateTimeFormat(locale, options),
    pluralRules: (options) => new Intl.PluralRules(locale, options),
  };
}
