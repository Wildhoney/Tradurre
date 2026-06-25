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

export class I18n<const L extends string, M extends Mode = Mode.Loose> {
  declare readonly __mode: M;

  readonly locales: readonly L[];
  readonly Provider: ReturnType<typeof makeProvider<L>>["Provider"];
  readonly useLocale: ReturnType<typeof makeProvider<L>>["useLocale"];
  readonly useI18n: ReturnType<typeof makeHooks<L>>["useI18n"];
  readonly detect: ReturnType<typeof makeDetect<L>>["detect"];
  readonly isLocale: ReturnType<typeof makeDetect<L>>["isLocale"];

  readonly #onFallback?: FallbackHandler<L>;

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

  dictionary<D extends Input<L, M>>(entries: D): Dictionary<L, D> {
    return new Dictionary<L, D>(this.locales, entries, this.#onFallback);
  }

  template<Args>(variants: Variants<L, Formatter<Args>, M>): Template<L, Args> {
    return new Template<L, Args>(variants as Variants<L, Formatter<unknown>>);
  }
}
