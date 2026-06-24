import { makeDetect } from "./detect";
import { Dictionary, type FallbackHandler } from "./dictionary";
import { makeHooks } from "./hooks";
import { installPluralRulesPolyfill } from "./polyfill";
import { makeProvider } from "./provider";
import { Template } from "./template";
import type { Formatter, Input, Merged, Variants } from "./types";

export type I18nConfig<L extends string> = {
  locales: readonly L[];
  onFallback?: FallbackHandler<L>;
};

export type ResolvedDictionary<L extends string, D extends Input<L>> = Merged<
  L,
  D
>;

export class I18n<const L extends string> {
  readonly locales: readonly L[];
  readonly LocaleProvider: ReturnType<typeof makeProvider<L>>["LocaleProvider"];
  readonly useLocale: ReturnType<typeof makeProvider<L>>["useLocale"];
  readonly useI18n: ReturnType<typeof makeHooks<L>>["useI18n"];
  readonly detectLocale: ReturnType<typeof makeDetect<L>>["detectLocale"];
  readonly isLocale: ReturnType<typeof makeDetect<L>>["isLocale"];

  readonly #onFallback?: FallbackHandler<L>;

  constructor(config: I18nConfig<L>) {
    if (config.locales.length === 0) {
      throw new Error(
        "Reacti8n: I18n requires at least one locale in config.locales.",
      );
    }
    this.locales = config.locales;
    this.#onFallback = config.onFallback;
    const initial = config.locales[0]!;
    const provider = makeProvider<L>(initial);
    this.LocaleProvider = provider.LocaleProvider;
    this.useLocale = provider.useLocale;
    const hooks = makeHooks<L>(provider.useLocale);
    this.useI18n = hooks.useI18n;
    const detect = makeDetect<L>(config.locales, initial);
    this.detectLocale = detect.detectLocale;
    this.isLocale = detect.isLocale;
    void installPluralRulesPolyfill(config.locales).catch(() => {});
  }

  dictionary<D extends Input<L>>(entries: D): Dictionary<L, D> {
    return new Dictionary<L, D>(this.locales, entries, this.#onFallback);
  }

  template<Args>(
    variants: Variants<L, Formatter<Args>>,
  ): Template<L, Args> {
    return new Template<L, Args>(variants);
  }
}
