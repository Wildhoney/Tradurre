import { createElement, type ReactElement, type ReactNode } from "react";

import { makeDetect } from "../detect/index.ts";
import { Dictionary } from "../dictionary/index.ts";
import { makeHooks } from "../hooks/index.ts";
import { installPolyfills } from "../polyfill/index.ts";
import { makeProvider } from "../provider/index.tsx";
import { Constant, Template } from "../template/index.ts";
import type {
  ConstantVariant,
  Formatter,
  I18nConfig,
  Input,
  Variants,
} from "../types.ts";

/**
 * Locale-scoped i18n runtime. One {@link I18n} instance per application,
 * configured once with the supported locale list. All other public API —
 * dictionary, template, hooks, provider, detect — lives as methods or fields
 * on the instance.
 *
 * @typeParam L - Locale union; usually narrowed via `as const` on
 * `config.locales`.
 *
 * @example
 * ```ts
 * enum Locale { En, Fr, De }
 *
 * export const i18n = new I18n({
 *   locales: [Locale.En, Locale.Fr, Locale.De] as const,
 * });
 * ```
 */
export class I18n<const L extends string> {
  /** Locale list this instance was configured with — first entry is the initial locale. */
  readonly locales: readonly L[];

  /** React context provider that exposes the active locale to descendants. */
  readonly Provider: ReturnType<typeof makeProvider<L>>["Provider"];

  /** Hook returning the active locale handle from the current provider. */
  readonly useLocale: ReturnType<typeof makeProvider<L>>["useLocale"];

  /** Hook that resolves a {@link Dictionary} against the active locale. */
  readonly useI18n: ReturnType<typeof makeHooks<L>>["useI18n"];

  /**
   * Picks the active locale from an explicit candidate list (cookies,
   * preferences, headers) or — when called with no arguments — from
   * `navigator.languages` / `navigator.language`. Returns `locales[0]` if
   * nothing matches.
   */
  readonly detect: ReturnType<typeof makeDetect<L>>["detect"];

  /** Type guard narrowing an arbitrary string to the locale union `L`. */
  readonly isLocale: ReturnType<typeof makeDetect<L>>["isLocale"];

  /**
   * Constructs a locale-scoped runtime.
   *
   * @param config - Locale list (and optional polyfills). The first locale is
   * used both as the provider's initial value and as the default returned by
   * `detect()` when no candidate matches.
   *
   * @throws {@link Error} When `config.locales` is empty.
   */
  constructor(config: I18nConfig<L>) {
    const [initial] = config.locales;
    if (initial === undefined) {
      throw new Error(
        "Tradurre: I18n requires at least one locale in config.locales.",
      );
    }
    this.locales = config.locales;
    const provider = makeProvider<L>(initial);
    this.Provider = provider.Provider;
    this.useLocale = provider.useLocale;
    const hooks = makeHooks<L>(provider.useLocale);
    this.useI18n = hooks.useI18n;
    const detector = makeDetect<L>(config.locales, initial);
    this.detect = detector.detect;
    this.isLocale = detector.isLocale;
    void installPolyfills(config.locales, config.polyfills).catch(() => {});
  }

  /**
   * Builds a typed {@link Dictionary} from a flat record of message-id →
   * {@link Template}. Every entry must be wrapped in {@link I18n.template} —
   * plain `{ en: "OK" }` maps are rejected at compile time.
   *
   * @typeParam D - Inferred dictionary shape; preserves per-key argument
   * types.
   * @param entries - Object literal whose values are {@link Template}
   * wrappers produced by {@link I18n.template}.
   * @returns A {@link Dictionary} instance that `useI18n` will resolve
   * against the active locale.
   */
  dictionary<D extends Input<L>>(entries: D): Dictionary<L, D> {
    return new Dictionary<L, D>(entries);
  }

  /**
   * Wraps a per-locale set of {@link Formatter}s into a {@link Template}
   * suitable for inclusion in `dictionary({ ... })`. Every configured locale
   * must supply a formatter; partial coverage is a compile-time error. The
   * `Args` generic is preserved at the call site so consumers get typed
   * arguments when invoking the resolved message. Defaults to `object` so
   * token-less messages can be written as `i18n.template({ ... })`.
   *
   * @typeParam Args - Shape of the tokens object accepted by every variant.
   * Defaults to `object`.
   * @param variants - Map from locale key to a formatter that turns
   * `{ tokens, format }` into a `ReactNode`.
   * @returns A {@link Template} that the dictionary will resolve into a
   * typed callable at lookup time.
   */
  template<Args>(variants: Variants<L, Formatter<Args>>): Template<L, Args> {
    return new Template<L, Args>(variants as Variants<L, Formatter<unknown>>);
  }

  /**
   * Wraps a per-locale set of no-argument variants into a {@link Constant}
   * — resolved eagerly and read as a plain property on `intl.copy` (no call
   * at the consumer site). Variants can be plain {@link ReactNode} values or
   * `({ format }) => ReactNode` functions when the copy needs locale-bound
   * `Intl` factories without tokens.
   *
   * @param variants - Map from locale key to a {@link ReactNode} value or a
   * `({ format }) => ReactNode` function.
   * @returns A {@link Constant} that the dictionary resolves into a
   * {@link ReactNode} property at lookup time.
   */
  constant(variants: Variants<L, ConstantVariant>): Constant<L> {
    return new Constant<L>(variants);
  }

  /**
   * Test helper that wraps `element` in {@link I18n.Provider} bound to
   * `locale`. Returns a `ReactElement` that any React renderer (RTL,
   * `react-test-renderer`, Ink, …) can mount directly.
   *
   * @param locale - Locale the wrapped subtree should see.
   * @param element - React subtree to wrap.
   * @returns The wrapped React element.
   *
   * @example
   * ```tsx
   * render(i18n.withI18n(Locale.Fr, <Welcome name="Imogen" />));
   * ```
   */
  withI18n(locale: L, element: ReactNode): ReactElement {
    // eslint-disable-next-line react/no-children-prop -- typed createElement overload requires children in the props object.
    return createElement(this.Provider, { locale, children: element });
  }
}
