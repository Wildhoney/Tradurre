import type { ConstantVariant, Formatter, Variants } from "../types.ts";

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
 * Type-only wrapper for a per-locale set of no-argument variants. Built via
 * `i18n.constant(...)` and embedded as a value in a {@link Dictionary} input.
 * Consumers reach the resolved value as a plain property on `intl.copy` — no
 * call needed.
 *
 * Variants can be plain {@link ReactNode} values, or `({ format }) =>
 * ReactNode` functions when the copy needs locale-bound `Intl` factories.
 *
 * @typeParam L - Locale union for this i18n instance.
 */
export class Constant<L extends string> {
  constructor(public readonly variants: Variants<L, ConstantVariant>) {}
}

/**
 * Curried alternative to `i18n.template<Args>(...)` — captures the locale
 * union, returns a `template(variants)` function. Useful when defining
 * templates outside the {@link I18n} instance scope (e.g. helper modules).
 *
 * @typeParam L - Locale union for this i18n instance.
 * @returns A `template<Args>(variants)` function that builds a typed
 * {@link Template}.
 */
export function makeTemplate<L extends string>() {
  return function template<Args>(
    variants: Variants<L, Formatter<Args>>,
  ): Template<L, Args> {
    return new Template<L, Args>(variants as Variants<L, Formatter<unknown>>);
  };
}

/**
 * Curried alternative to `i18n.constant(...)` — captures the locale union,
 * returns a `constant(variants)` function. Useful when defining messages
 * outside the {@link I18n} instance scope.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @returns A `constant(variants)` function that builds a typed
 * {@link Constant}.
 */
export function makeConstant<L extends string>() {
  return function constant(
    variants: Variants<L, ConstantVariant>,
  ): Constant<L> {
    return new Constant<L>(variants);
  };
}
