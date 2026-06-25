import { createElement, type ReactElement, type ReactNode } from "react";

import { makeDetect } from "../detect/index.ts";
import { Dictionary } from "../dictionary/index.ts";
import { makeHooks } from "../hooks/index.ts";
import { installPluralRulesPolyfill } from "../polyfill/index.ts";
import { makeProvider } from "../provider/index.tsx";
import { Template } from "../template/index.ts";
import type {
  FallbackHandler,
  Formatter,
  I18nConfig,
  Input,
  Mode,
  Variants,
} from "../types.ts";

/**
 * Locale-scoped i18n runtime. One {@link I18n} instance per application,
 * configured once with the supported locale list and an optional fallback
 * handler. All other public API — dictionary, template, hooks, provider,
 * detect — lives as methods or fields on the instance.
 *
 * @typeParam L - Locale union; usually narrowed via `as const` on
 * `config.locales`.
 * @typeParam M - Coverage strictness. Defaults to {@link Mode.Loose}; pass
 * {@link Mode.Strict} explicitly to require every dictionary entry to define
 * every locale.
 *
 * @example
 * ```ts
 * enum Locale { En, Fr, De }
 *
 * export const i18n = new I18n({
 *   locales: [Locale.En, Locale.Fr, Locale.De] as const,
 *   onFallback(details) {
 *     console.warn(`fallback ${details.key}: ${details.requested} -> ${details.resolved}`);
 *   },
 * });
 * ```
 */
export class I18n<const L extends string, M extends Mode = Mode.Loose> {
  /**
   * Phantom field used to carry {@link Mode} through the type system. Never
   * read at runtime.
   *
   * @internal
   */
  declare readonly __mode: M;

  /** Locale list this instance was configured with, in fallback-chain order. */
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

  readonly #onFallback?: FallbackHandler<L>;

  /**
   * Constructs a locale-scoped runtime.
   *
   * @param config - Locale list and optional fallback handler. The first
   * locale is used both as the provider's initial value and as the default
   * returned by `detect()` when no candidate matches.
   *
   * @throws {@link Error} When `config.locales` is empty.
   */
  constructor(config: I18nConfig<L>) {
    const [initial] = config.locales;
    if (initial === undefined) {
      throw new Error(
        "Reacti8n: I18n requires at least one locale in config.locales.",
      );
    }
    this.locales = config.locales;
    this.#onFallback = config.onFallback;
    const provider = makeProvider<L>(initial);
    this.Provider = provider.Provider;
    this.useLocale = provider.useLocale;
    const hooks = makeHooks<L>(provider.useLocale);
    this.useI18n = hooks.useI18n;
    const detector = makeDetect<L>(config.locales, initial);
    this.detect = detector.detect;
    this.isLocale = detector.isLocale;
    void installPluralRulesPolyfill(config.locales).catch(() => {});
  }

  /**
   * Builds a typed {@link Dictionary} from a flat record of message-id →
   * entry.
   *
   * @typeParam D - Inferred dictionary shape; preserves per-key argument
   * types.
   * @param entries - Object literal whose values are either plain
   * locale-variant maps or {@link Template} wrappers produced by
   * {@link I18n.template}.
   * @returns A {@link Dictionary} instance that `useI18n` will resolve
   * against the active locale.
   */
  dictionary<D extends Input<L, M>>(entries: D): Dictionary<L, D> {
    return new Dictionary<L, D>(this.locales, entries, this.#onFallback);
  }

  /**
   * Wraps a per-locale set of {@link Formatter}s into a {@link Template}
   * suitable for inclusion in `dictionary({ ... })`. The `Args` generic is
   * preserved at the call site so consumers get typed arguments when
   * invoking the resolved message.
   *
   * @typeParam Args - Shape of the tokens object accepted by every variant.
   * @param variants - Map from locale key to a formatter that turns
   * `{ tokens, helpers }` into a `ReactNode`.
   * @returns A {@link Template} that the dictionary will resolve into a
   * typed callable at lookup time.
   */
  template<Args>(variants: Variants<L, Formatter<Args>, M>): Template<L, Args> {
    return new Template<L, Args>(variants as Variants<L, Formatter<unknown>>);
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
