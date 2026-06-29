import type { ReactNode } from "react";

import type { Template } from "./template/index.ts";

/**
 * Augments {@link Intl.Locale} with the Locale Info API fields TypeScript's
 * lib hasn't shipped yet (`textInfo`, `weekInfo`, `region`, `script`). All
 * are implemented in modern Chromium, Firefox, Safari, and Node 18+ — this
 * declaration just teaches the compiler about them.
 */
declare global {
  namespace Intl {
    // eslint-disable-next-line @typescript-eslint/consistent-type-definitions -- module augmentation requires an interface
    interface Locale {
      /**
       * Text direction information — `direction` is `"ltr"` or `"rtl"`.
       * Optional: not every runtime ships the Intl Locale Info API (older
       * Chrome / Safari); call sites should handle the `undefined` case.
       */
      readonly textInfo?: { readonly direction: "ltr" | "rtl" };
      /** Week-related info: first day, weekend days, minimum days in week one. */
      readonly weekInfo?: {
        readonly firstDay: number;
        readonly weekend: readonly number[];
        readonly minimalDays: number;
      };
      /** Region subtag (e.g. `"GB"` for `en-GB`), when present. */
      readonly region?: string;
      /** Script subtag (e.g. `"Cyrl"` for `uk-Cyrl`), when present. */
      readonly script?: string;
    }
  }
}

/**
 * Coverage strictness for dictionary entries.
 *
 * In {@link Mode.Loose} (the default) each message must define at least one
 * locale variant; the runtime walks the configured locale list at lookup time
 * to find a defined one. In {@link Mode.Strict} every dictionary entry must
 * define every configured locale — partial coverage becomes a compile-time
 * error.
 */
export enum Mode {
  /**
   * At least one locale variant required per message; the runtime falls back
   * if the active locale is missing.
   */
  Loose = "loose",
  /**
   * Every locale variant required for every message; missing locales are a
   * compile-time error.
   */
  Strict = "strict",
}

/**
 * Locale-bound `Intl` factories handed to every template formatter.
 *
 * Each method returns a fresh `Intl` instance configured for the active
 * locale; the formatter calls these inline rather than receiving cached
 * instances, which keeps any locale-bound caching internal to the runtime.
 */
export type Helpers = {
  /** Returns an `Intl.NumberFormat` for the active locale. */
  numberFormat(options?: Intl.NumberFormatOptions): Intl.NumberFormat;
  /** Returns an `Intl.DateTimeFormat` for the active locale. */
  dateTimeFormat(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat;
  /** Returns an `Intl.PluralRules` for the active locale. */
  pluralRules(options?: Intl.PluralRulesOptions): Intl.PluralRules;
};

/**
 * Payload a template formatter receives at the call site.
 *
 * @typeParam Args - Shape of the tokens object passed when invoking the
 * message.
 */
export type FormatterPayload<Args> = { tokens: Args; helpers: Helpers };

/**
 * A function that turns a typed `{ tokens, helpers }` payload into the
 * rendered output (a string or any `ReactNode`). Used inside {@link Variants}
 * when the dictionary entry is created via `i18n.template<Args>(...)`.
 *
 * @typeParam Args - Shape of the tokens this formatter expects.
 */
export type Formatter<Args> = (payload: FormatterPayload<Args>) => ReactNode;

/**
 * Variant of {@link Partial} that requires at least one property to be
 * defined.
 *
 * Used to enforce the "every message defines at least one locale" rule in
 * {@link Mode.Loose}: the type system rejects an empty object literal but
 * permits any non-empty subset of the locale keys.
 *
 * @typeParam T - Source object type whose keys form the eligible set.
 */
export type AtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Omit<T, K>>;
}[keyof T];

/**
 * Map from locale key to variant value, with coverage strictness controlled
 * by {@link Mode}.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @typeParam V - Value type of each variant (a string, a {@link Formatter},
 * etc.).
 * @typeParam M - Coverage strictness — defaults to {@link Mode.Loose}.
 */
export type Variants<
  L extends string,
  V,
  M extends Mode = Mode.Loose,
> = M extends Mode.Strict ? Record<L, V> : AtLeastOne<Record<L, V>>;

/**
 * A single dictionary entry: a {@link Template} wrapper. Every message — even
 * a token-less constant string — must be wrapped in `i18n.template({ ... })`
 * so the resolved value is always a callable carrying the
 * {@link ResolvedTemplateMeta} sidecar (`.direction`, `.locale`).
 *
 * @typeParam L - Locale union for this i18n instance.
 */
export type Entry<L extends string> = Template<L, unknown>;

/**
 * Shape of the object passed to `i18n.dictionary(...)`: a flat record of
 * message-id → {@link Template}.
 *
 * @typeParam L - Locale union for this i18n instance.
 */
export type Input<L extends string> = Record<string, Entry<L>>;

/**
 * Metadata attached to a resolved {@link Template} callable, describing the
 * locale that actually backed the resolution.
 *
 * Useful when the requested locale fell back: a consumer asking for Arabic
 * but served the French variant should render an LTR `<h1 dir="...">`, not
 * RTL — and `direction` reflects that resolved locale, not the active one.
 *
 * `locale` is a full {@link Intl.Locale} instance, so every locale-specific
 * field (text direction, week info, numbering system, calendar, hour cycle,
 * language, region, …) is reachable via the standard API.
 */
export type ResolvedTemplateMeta = {
  /** Locale that actually backed the resolution. Falls back to the active
   * locale only when at least one variant defined the message. */
  readonly locale: Intl.Locale;
  /**
   * Shortcut for `locale.textInfo.direction`. `"rtl"` for Arabic, Hebrew,
   * Persian, Urdu, etc.; `"ltr"` for everything else.
   */
  readonly direction: "ltr" | "rtl";
};

/**
 * Resolves a single dictionary entry into the value consumers see on the
 * `useI18n(...)` result: a callable for the {@link Template} entry, carrying
 * a {@link ResolvedTemplateMeta} sidecar (`.direction`, `.locale`) on the
 * function itself.
 *
 * The callable's `args` parameter is optional when `Args` is satisfied by
 * `{}` — i.e. token-less templates (default `Args = object`) and templates
 * whose tokens are all optional. As soon as a template declares a required
 * token, the parameter becomes required at the call site.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @typeParam E - Entry type to resolve (must be a {@link Template}).
 */
export type Resolved<L extends string, E> =
  E extends Template<L, infer Args>
    ? Record<string, never> extends Args
      ? ((args?: Args) => ReactNode) & ResolvedTemplateMeta
      : ((args: Args) => ReactNode) & ResolvedTemplateMeta
    : never;

/**
 * Resolves every entry of a dictionary input into its consumer-facing shape
 * — this is what `i18n.useI18n(dictionary)` returns.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @typeParam D - Dictionary input type.
 */
export type Merged<L extends string, D extends Input<L>> = {
  [K in keyof D]: Resolved<L, D[K]>;
};

/**
 * Handle returned by `i18n.useLocale()` — the active locale and a setter to
 * change it.
 *
 * @typeParam L - Locale union for this i18n instance.
 */
export type LocaleHandle<L extends string> = {
  /** Currently active locale. */
  locale: L;
  /** Switch the active locale to `next`. */
  setLocale(next: L): void;
};

/**
 * Props accepted by the `i18n.Provider` React component.
 *
 * If `locale` is supplied the provider runs in controlled mode and the parent
 * owns the active locale; omit it and the provider manages locale state
 * internally, starting from the first entry of the configured `locales` list.
 *
 * @typeParam L - Locale union for this i18n instance.
 */
export type ProviderProps<L extends string> = {
  /** Active locale when used as a controlled component. */
  locale?: L;
  /** Notified whenever a consumer calls `setLocale(...)`. */
  onLocaleChange?(next: L): void;
  /** React subtree that should see this locale via `useI18n` / `useLocale`. */
  children: ReactNode;
};

/**
 * Notification fired whenever a dictionary entry resolves to a non-requested
 * locale, or when the key is missing from every configured locale.
 *
 * @typeParam L - Locale union for this i18n instance.
 */
export type FallbackEvent<L extends string> = {
  /** Message id that fell back. */
  key: string;
  /** Locale the consumer asked for. */
  requested: L;
  /**
   * Locale actually used to resolve the message, or `null` when no locale
   * defined the key.
   */
  resolved: L | null;
};

/**
 * Callback registered on {@link I18nConfig.onFallback}. Invoked synchronously
 * inside `Dictionary.resolve()` — keep it cheap, typically a logger call.
 *
 * @typeParam L - Locale union for this i18n instance.
 */
export type FallbackHandler<L extends string> = (
  event: FallbackEvent<L>,
) => void;

/**
 * Hooks called by the runtime to install one of the `Intl` formatter
 * polyfills from `@formatjs/*` when the host environment is missing native
 * support. The library does not embed dynamic-import specifiers itself —
 * consumers own the `import()` so each bundler's static-analysis rules are
 * satisfied at the call site.
 *
 * @typeParam L - Locale union for the parent {@link I18n} instance.
 * Narrowing `data(locale: L)` instead of `string` makes the consumer's
 * `switch (locale)` exhaustive over every configured locale — important
 * because Tradurre loads data for every locale in the fallback chain, not
 * just the active one.
 */
export type PolyfillLoader<L extends string> = {
  /**
   * Load and install the polyfill engine itself (e.g.
   * `@formatjs/intl-pluralrules/polyfill.js`).
   */
  polyfill(): Promise<void>;
  /**
   * Load CLDR locale data for `locale` (e.g.
   * `@formatjs/intl-pluralrules/locale-data/${locale}.js`). Invoked once
   * per locale in {@link I18nConfig.locales}.
   */
  data(locale: L): Promise<void>;
};

/**
 * Per-formatter polyfill loaders. Each slot is independent: a present
 * loader runs only when the matching native check fails, and an absent
 * loader is silently skipped.
 *
 * @typeParam L - Locale union for the parent {@link I18n} instance.
 */
export type Polyfills<L extends string> = {
  /** Loader for `Intl.PluralRules` (e.g. `@formatjs/intl-pluralrules`). */
  pluralRules?: PolyfillLoader<L>;
  /** Loader for `Intl.NumberFormat` (e.g. `@formatjs/intl-numberformat`). */
  numberFormat?: PolyfillLoader<L>;
  /** Loader for `Intl.DateTimeFormat` (e.g. `@formatjs/intl-datetimeformat`). */
  dateTimeFormat?: PolyfillLoader<L>;
};

/**
 * Configuration accepted by the {@link I18n} constructor.
 *
 * @typeParam L - Locale union — usually narrowed via `as const` on the array
 * literal.
 */
export type I18nConfig<L extends string> = {
  /** Ordered list of supported locales — defines the fallback chain. */
  locales: readonly L[];
  /** Optional callback fired when an entry falls back to another locale. */
  onFallback?: FallbackHandler<L>;
  /**
   * Optional per-formatter polyfills. Each slot — `pluralRules`,
   * `numberFormat`, `dateTimeFormat` — accepts its own
   * {@link PolyfillLoader}, invoked only when the matching native check
   * fails for the configured locales. Omit any slot you don't need; omit
   * the whole field on runtimes with native support (modern browsers,
   * Hermes) to keep Metro/React Native from choking on a non-literal
   * `import()` specifier the library would otherwise have to embed.
   */
  polyfills?: Polyfills<L>;
};

/**
 * Output of resolving a dictionary against an active locale — the typed
 * object returned by `i18n.useI18n(...)`. Structurally identical to
 * {@link Merged}; exported under its own name as part of the public type
 * surface for consumers who want to annotate intermediate variables.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @typeParam D - Dictionary input type.
 */
export type ResolvedDictionary<L extends string, D extends Input<L>> = Merged<
  L,
  D
>;
