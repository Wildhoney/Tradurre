import { makeFormat } from "../format/index.ts";
import { Constant, Template } from "../template/index.ts";
import type {
  ConstantVariant,
  Format,
  Formatter,
  Input,
  Merged,
  ResolvedDictionary,
} from "../types.ts";

/**
 * Typed message bundle — pairs a dictionary input with per-locale resolution.
 * Built by `i18n.dictionary(...)`; consumers never construct this directly.
 *
 * Internally caches the resolved object per-locale, so a re-render with the
 * same active locale returns the same reference.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @typeParam D - Original dictionary input shape — used to preserve per-key
 * typing through resolution.
 */
export class Dictionary<L extends string, D extends Input<L>> {
  readonly #entries: D;
  readonly #cache = new Map<L, ResolvedDictionary<L, D>>();

  /**
   * @param entries - The dictionary input object passed to
   * `i18n.dictionary(...)`.
   */
  constructor(entries: D) {
    this.#entries = entries;
  }

  /**
   * Resolves every entry against `locale`, returning the `{ copy, locale }`
   * bundle consumers see from `useI18n(...)`. Result is memoised per-locale.
   *
   * @param locale - Active locale to resolve against.
   * @returns A `{ copy, locale }` bundle where `copy` is the typed resolved
   * dictionary and `locale` is the active locale as an `Intl.Locale`.
   */
  resolve(locale: L): ResolvedDictionary<L, D> {
    const cached = this.#cache.get(locale);
    if (cached !== undefined) return cached;
    const format = makeFormat(locale);
    const copy = Object.fromEntries(
      Object.entries(this.#entries).map(([key, entry]) => [
        key,
        this.#pick(entry, locale, format),
      ]),
    ) as Merged<L, D>;
    const bundle: ResolvedDictionary<L, D> = {
      copy,
      locale: new Intl.Locale(locale),
    };
    this.#cache.set(locale, bundle);
    return bundle;
  }

  /**
   * Resolves a single entry: {@link Template} → typed callable bound to the
   * active locale's formatter; {@link Constant} → eagerly-resolved
   * {@link import("react").ReactNode} (plain value passed through as-is, or
   * `({ format }) => ...` invoked once against the active locale).
   */
  #pick(entry: Input<L>[string], locale: L, format: Format) {
    if (entry instanceof Constant) {
      const variant = (entry.variants as Record<string, ConstantVariant>)[
        locale
      ];
      return typeof variant === "function" ? variant({ format }) : variant;
    }
    const template = entry as Template<L, unknown>;
    const formatter = (template.variants as Record<string, unknown>)[locale];
    return (tokens: unknown = {}) =>
      (formatter as Formatter<unknown>)({ tokens, format });
  }
}

/**
 * Curried alternative to constructing {@link Dictionary} directly — captures
 * the locale set and returns a function that accepts dictionary entries.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @returns A `dictionary(entries)` function that builds a typed
 * {@link Dictionary}.
 */
export function makeDictionary<L extends string>() {
  return function dictionary<D extends Input<L>>(entries: D): Dictionary<L, D> {
    return new Dictionary<L, D>(entries);
  };
}
