import type { ReactNode } from "react";

import type { Template } from "./template/index.ts";

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
 * A single dictionary entry: either a {@link Template} wrapper (for messages
 * with typed arguments) or a plain {@link Variants} map (for static strings
 * or other constant values).
 *
 * @typeParam L - Locale union for this i18n instance.
 * @typeParam M - Coverage strictness — defaults to {@link Mode.Loose}.
 */
export type Entry<L extends string, M extends Mode = Mode.Loose> =
  | Template<L, unknown>
  | Variants<L, unknown, M>;

/**
 * Shape of the object passed to `i18n.dictionary(...)`: a flat record of
 * message-id → entry.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @typeParam M - Coverage strictness — defaults to {@link Mode.Loose}.
 */
export type Input<L extends string, M extends Mode = Mode.Loose> = Record<
  string,
  Entry<L, M>
>;

/**
 * Resolves a single dictionary entry into the value consumers see on the
 * `useI18n(...)` result: callables for {@link Template} entries, the raw
 * value for plain variants.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @typeParam E - Entry type to resolve.
 */
export type Resolved<L extends string, E> =
  E extends Template<L, infer Args>
    ? (args: Args) => ReactNode
    : E extends Variants<L, infer V>
      ? V
      : E;

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
 * Hooks called by the runtime to install the `Intl.PluralRules` polyfill from
 * `@formatjs/intl-pluralrules` when the host environment is missing native
 * support. Exposed primarily so tests can substitute their own loader.
 */
export type PolyfillLoader = {
  /**
   * Load and install the polyfill itself (e.g.
   * `@formatjs/intl-pluralrules/polyfill.js`).
   */
  polyfill(): Promise<void>;
  /**
   * Load CLDR locale data for `locale` (e.g.
   * `@formatjs/intl-pluralrules/locale-data/${locale}.js`).
   */
  data(locale: string): Promise<void>;
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
