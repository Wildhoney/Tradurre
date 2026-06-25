import type { ReactNode } from "react";

import { makeHelpers } from "../helpers/index.ts";
import { Template } from "../template/index.ts";
import { Mode } from "../types.ts";
import type { FallbackHandler, Helpers, Input, Merged } from "../types.ts";

type Formatter = (payload: { tokens: unknown; helpers: Helpers }) => ReactNode;

export class Dictionary<L extends string, D extends Input<L, Mode>> {
  readonly #entries: D;
  readonly #locales: readonly L[];
  readonly #onFallback?: FallbackHandler<L>;
  readonly #cache = new Map<L, Merged<L, D>>();

  constructor(
    locales: readonly L[],
    entries: D,
    onFallback?: FallbackHandler<L>,
  ) {
    this.#locales = locales;
    this.#entries = entries;
    this.#onFallback = onFallback;
  }

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

  #pick(entry: unknown, key: string, locale: L, helpers: Helpers): unknown {
    if (entry instanceof Template) {
      const formatter = this.#fromVariants(
        entry.variants as Record<string, unknown>,
        key,
        locale,
      );
      if (typeof formatter === "function") {
        return (tokens: unknown) =>
          (formatter as Formatter)({ tokens, helpers });
      }
      return formatter;
    }
    if (isObject(entry)) {
      return this.#fromVariants(entry as Record<string, unknown>, key, locale);
    }
    return entry;
  }

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

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function makeDictionary<L extends string>(
  locales: readonly L[],
  onFallback?: FallbackHandler<L>,
) {
  return function dictionary<D extends Input<L>>(entries: D): Dictionary<L, D> {
    return new Dictionary<L, D>(locales, entries, onFallback);
  };
}
