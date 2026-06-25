import type { Formatter, Mode, Variants } from "../types.ts";

/**
 * Type-only wrapper that pairs a per-locale set of {@link Formatter}s with
 * the shape of arguments they accept. Built via `i18n.template<Args>(...)`
 * and embedded as a value in a {@link Dictionary} input.
 *
 * The phantom `__args` field is the only mechanism by which `Args` survives
 * structurally — without it, two templates with different argument shapes
 * would be assignment-compatible.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @typeParam Args - Shape of the tokens object every variant expects.
 */
export class Template<L extends string, Args> {
  /**
   * Phantom field carrying `Args` through the type system. Never read at
   * runtime.
   *
   * @internal
   */
  declare readonly __args: () => Args;

  /**
   * @param variants - Map from locale key to {@link Formatter}. Stored as
   * `Formatter<unknown>` because the dictionary resolves them generically;
   * the original `Args` is recovered via the phantom `__args` field.
   */
  constructor(public readonly variants: Variants<L, Formatter<unknown>>) {}
}

/**
 * Curried alternative to `i18n.template<Args>(...)` — captures the locale
 * union and strictness, returns a `template(variants)` function. Useful when
 * defining templates outside the {@link I18n} instance scope (e.g. helper
 * modules).
 *
 * @typeParam L - Locale union for this i18n instance.
 * @typeParam M - Coverage strictness — defaults to {@link Mode.Loose}.
 * @returns A `template<Args>(variants)` function that builds a typed
 * {@link Template}.
 */
export function makeTemplate<L extends string, M extends Mode = Mode.Loose>() {
  return function template<Args = object>(
    variants: Variants<L, Formatter<Args>, M>,
  ): Template<L, Args> {
    return new Template<L, Args>(variants as Variants<L, Formatter<unknown>>);
  };
}
