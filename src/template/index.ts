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
export class Template<L extends string, Args, Out = string> {
  /**
   * Phantom field branding the entry with its locale union `L`. Never read at
   * runtime; it lets {@link import("../types.ts").Input} enforce locale
   * coverage at the dictionary boundary *without* placing `Out` in an
   * inferable position — see {@link import("../types.ts").Entry}.
   *
   * @internal
   */
  declare readonly __locale: (locale: L) => void;

  /**
   * Phantom field carrying `Args` through the type system. Never read at
   * runtime.
   *
   * @internal
   */
  declare readonly __args: () => Args;

  /**
   * Phantom field carrying the output type `Out` through the type system —
   * `string` by default, {@link import("react").ReactNode} when widened. Never
   * read at runtime; distinguishes a string message from a JSX one so
   * {@link import("../types.ts").Resolved} surfaces the right type.
   *
   * @internal
   */
  declare readonly __out: () => Out;

  /**
   * @param variants - Map from locale key to {@link Formatter}. Stored with
   * `Args` erased to `unknown` because the dictionary resolves them
   * generically; the original `Args` is recovered via the phantom `__args`
   * field, and `Out` via `__out`.
   */
  constructor(public readonly variants: Variants<L, Formatter<unknown, Out>>) {}
}

/**
 * Type-only wrapper for a per-locale set of no-argument variants. Built via
 * `i18n.constant(...)` and embedded as a value in a {@link Dictionary} input.
 * Consumers reach the resolved value as a plain property on `intl.copy` — no
 * call needed.
 *
 * Variants can be plain values of the output type `Out`, or `({ format }) =>
 * Out` functions when the copy needs locale-bound `Intl` factories. `Out`
 * defaults to `string`; widen it to {@link import("react").ReactNode} for
 * constants that hold JSX.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @typeParam Out - Output type of every variant. Defaults to `string`.
 */
export class Constant<L extends string, Out = string> {
  /**
   * Phantom field branding the entry with its locale union `L`. Never read at
   * runtime; lets {@link import("../types.ts").Input} enforce locale coverage
   * at the dictionary boundary without pinning `Out` — see
   * {@link import("../types.ts").Entry}.
   *
   * @internal
   */
  declare readonly __locale: (locale: L) => void;

  /**
   * Phantom field carrying the output type `Out` through the type system.
   * Never read at runtime; lets {@link import("../types.ts").Resolved} tell a
   * string constant from a JSX one.
   *
   * @internal
   */
  declare readonly __out: () => Out;

  constructor(public readonly variants: Variants<L, ConstantVariant<Out>>) {}
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
  return function template<Args, Out = string>(
    variants: Variants<L, Formatter<Args, NoInfer<Out>>>,
  ): Template<L, Args, Out> {
    return new Template<L, Args, Out>(
      variants as Variants<L, Formatter<unknown, Out>>,
    );
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
  return function constant<Out = string>(
    variants: Variants<L, ConstantVariant<NoInfer<Out>>>,
  ): Constant<L, Out> {
    return new Constant<L, Out>(variants as Variants<L, ConstantVariant<Out>>);
  };
}
