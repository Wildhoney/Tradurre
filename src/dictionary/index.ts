import { makeHelpers } from "../helpers/index.ts";
import { Template } from "../template/index.ts";
import { Mode } from "../types.ts";
import type {
  FallbackHandler,
  Formatter,
  Helpers,
  Input,
  Merged,
} from "../types.ts";

/**
 * Typed message bundle — pairs a locale list with a dictionary input and
 * resolves entries against any locale in that list. Built by
 * `i18n.dictionary(...)`; consumers never construct this directly.
 *
 * Internally caches the resolved object per-locale, so a re-render with the
 * same active locale returns the same reference.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @typeParam D - Original dictionary input shape — used to preserve per-key
 * typing through resolution.
 */
export class Dictionary<L extends string, D extends Input<L, Mode>> {
  readonly #entries: D;
  readonly #locales: readonly L[];
  readonly #onFallback?: FallbackHandler<L>;
  readonly #cache = new Map<L, Merged<L, D>>();

  /**
   * @param locales - Configured locale list, in fallback-chain order.
   * @param entries - The dictionary input object passed to
   * `i18n.dictionary(...)`.
   * @param onFallback - Optional callback fired when an entry falls back to
   * a non-requested locale, or to `null` when the key is missing from every
   * locale.
   */
  constructor(
    locales: readonly L[],
    entries: D,
    onFallback?: FallbackHandler<L>,
  ) {
    this.#locales = locales;
    this.#entries = entries;
    this.#onFallback = onFallback;
  }

  /**
   * Resolves every entry against `locale`, building the typed object
   * consumers see from `useI18n(...)`. Result is memoised per-locale.
   *
   * @param locale - Active locale to resolve against.
   * @returns A fully resolved dictionary view typed by {@link Merged}.
   */
  resolve(locale: L): Merged<L, D> {
    const cached = this.#cache.get(locale);
    if (cached !== undefined) return cached;
    const helpers = makeHelpers(locale);
    const resolved = Object.fromEntries(
      Object.entries(this.#entries).map(([key, entry]) => [
        key,
        this.#pick(entry, key, locale, helpers),
      ]),
    ) as Merged<L, D>;
    this.#cache.set(locale, resolved);
    return resolved;
  }

  /**
   * Resolves a single dictionary entry — either a {@link Template} (returns
   * a helpers-bound callable) or a plain variants map (returns the value
   * directly).
   */
  #pick(entry: unknown, key: string, locale: L, helpers: Helpers): unknown {
    if (entry instanceof Template) {
      const formatter = this.#fromVariants(
        entry.variants as Record<string, unknown>,
        key,
        locale,
      );
      if (typeof formatter === "function") {
        return (tokens: unknown) =>
          (formatter as Formatter<unknown>)({ tokens, helpers });
      }
      return formatter;
    }
    if (isObject(entry)) {
      return this.#fromVariants(entry as Record<string, unknown>, key, locale);
    }
    return entry;
  }

  /**
   * Walks the configured locale list to find a defined variant, firing
   * `onFallback` whenever the requested locale was missing.
   *
   * Returns `null` when no locale defines the key — the resolved value the
   * consumer sees in that case is `null` too.
   */
  #fromVariants(
    variants: Record<string, unknown>,
    key: string,
    locale: L,
  ): unknown {
    const active = variants[locale];
    if (active !== undefined && active !== null) return active;
    for (const candidate of this.#locales) {
      if (candidate === locale) continue;
      const value = variants[candidate];
      if (value !== undefined && value !== null) {
        this.#onFallback?.({ key, requested: locale, resolved: candidate });
        return value;
      }
    }
    this.#onFallback?.({ key, requested: locale, resolved: null });
    return null;
  }
}

/**
 * Narrow type guard distinguishing a plain object from arrays, primitives,
 * and `null`. Used by {@link Dictionary} to decide whether an entry is a
 * variants map.
 */
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * Curried alternative to constructing {@link Dictionary} directly — captures
 * the locales (and optional fallback handler) and returns a function that
 * accepts dictionary entries.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @param locales - Configured locale list in fallback-chain order.
 * @param onFallback - Optional fallback handler.
 * @returns A `dictionary(entries)` function that builds a typed
 * {@link Dictionary}.
 */
export function makeDictionary<L extends string>(
  locales: readonly L[],
  onFallback?: FallbackHandler<L>,
) {
  return function dictionary<D extends Input<L>>(entries: D): Dictionary<L, D> {
    return new Dictionary<L, D>(locales, entries, onFallback);
  };
}
