import type { CSSProperties, ReactNode } from "react";

import type { Constant, Template } from "./template/index.ts";

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
       * Returns text direction information for this locale — `direction` is
       * `"ltr"` or `"rtl"`. Part of the stage-3 Intl Locale Info API; shipped
       * in modern Chromium, Firefox, Safari, and Node.
       */
      getTextInfo(): { readonly direction: "ltr" | "rtl" };
      /**
       * Returns week-related info for this locale: first day, weekend days,
       * minimum days in week one. Part of the stage-3 Intl Locale Info API.
       */
      getWeekInfo(): {
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
 * Locale-bound `Intl` factories handed to every template formatter. Each
 * method returns a fresh `Intl` instance configured for the active locale
 * — call inline; the runtime handles per-locale memoisation.
 *
 * Covers every locale-scoped `Intl` type in the spec — from the widely-shipped
 * `number` / `dateTime` / `plural` / `collator` / `displayNames` / `list` /
 * `relativeTime` / `segmenter` to the stage-3 `duration` (Intl.DurationFormat).
 */
export type Format = {
  /** Returns an `Intl.NumberFormat` for the active locale. */
  number(options?: Intl.NumberFormatOptions): Intl.NumberFormat;
  /** Returns an `Intl.DateTimeFormat` for the active locale. */
  dateTime(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat;
  /** Returns an `Intl.PluralRules` for the active locale. */
  plural(options?: Intl.PluralRulesOptions): Intl.PluralRules;
  /** Returns an `Intl.Collator` for the active locale. */
  collator(options?: Intl.CollatorOptions): Intl.Collator;
  /**
   * Returns an `Intl.DisplayNames` for the active locale. The `type` option
   * is required by the spec — pass `"language"`, `"region"`, `"script"`,
   * `"currency"`, `"calendar"`, or `"dateTimeField"`.
   */
  displayNames(options: Intl.DisplayNamesOptions): Intl.DisplayNames;
  /** Returns an `Intl.DurationFormat` for the active locale (stage-3). */
  duration(options?: Intl.DurationFormatOptions): Intl.DurationFormat;
  /** Returns an `Intl.ListFormat` for the active locale. */
  list(options?: Intl.ListFormatOptions): Intl.ListFormat;
  /** Returns an `Intl.RelativeTimeFormat` for the active locale. */
  relativeTime(
    options?: Intl.RelativeTimeFormatOptions,
  ): Intl.RelativeTimeFormat;
  /** Returns an `Intl.Segmenter` for the active locale. */
  segmenter(options?: Intl.SegmenterOptions): Intl.Segmenter;
};

/**
 * Payload a template formatter receives at the call site.
 *
 * @typeParam Args - Shape of the tokens object passed when invoking the
 * message.
 */
export type FormatterPayload<Args> = { tokens: Args; format: Format };

/**
 * A function that turns a typed `{ tokens, format }` payload into the
 * rendered output. `Out` defaults to `string` — the common case, and exactly
 * what plain-string attributes (`alt`, `title`, `aria-label`, `placeholder`)
 * require. Widen it to {@link ReactNode} via `i18n.template<Args, ReactNode>(...)`
 * for messages that embed JSX. Used inside {@link Variants} when the dictionary
 * entry is created via `i18n.template<Args, Out>(...)`.
 *
 * @typeParam Args - Shape of the tokens this formatter expects.
 * @typeParam Out - Rendered output type. Defaults to `string`; widen to
 * {@link ReactNode} for messages that return JSX.
 */
export type Formatter<Args, Out = string> = (
  payload: FormatterPayload<Args>,
) => Out;

/**
 * Value accepted by each locale slot of `i18n.constant(...)`. Either a plain
 * value of the output type `Out` — resolved verbatim — or a
 * `({ format }) => Out` function for cases that need locale-bound `Intl`
 * factories without accepting call-site tokens. `Out` defaults to `string`;
 * widen it to {@link ReactNode} via `i18n.constant<ReactNode>(...)` for
 * constants that hold JSX.
 *
 * @typeParam Out - Value each variant produces. Defaults to `string`; widen to
 * {@link ReactNode} for JSX-bearing constants.
 */
export type ConstantVariant<Out = string> =
  | Out
  | ((payload: { format: Format }) => Out);

/**
 * Map from locale key to variant value — every configured locale must define
 * a variant.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @typeParam V - Value type of each variant (a string, a {@link Formatter},
 * etc.).
 */
export type Variants<L extends string, V> = Record<L, V>;

/**
 * Constraint used by {@link Input} to accept a dictionary entry — either a
 * {@link Template} wrapper (arg-taking, consumed as `intl.copy.foo({ ... })`)
 * or a {@link Constant} wrapper (token-less, consumed as `intl.copy.foo`).
 *
 * Deliberately matches only the `__locale` phantom rather than the full
 * `Template | Constant` union. That union would place each entry's output
 * type `Out` in an inferable position, and — because `dictionary({ ... })`
 * supplies this as the contextual type for every inline `i18n.constant(...)` /
 * `i18n.template(...)` call — would pin `Out` to `unknown`, defeating the
 * `string` default. Branding on `__locale: (locale: L) => void` alone keeps
 * locale coverage enforced (an entry that omits a configured locale is
 * rejected) while leaving `Out` free to fall back to its default.
 *
 * @typeParam L - Locale union for this i18n instance.
 */
export type Entry<L extends string> = {
  readonly __locale: (locale: L) => void;
};

/**
 * Shape of the object passed to `i18n.dictionary(...)`: a flat record of
 * message-id → {@link Entry}.
 *
 * @typeParam L - Locale union for this i18n instance.
 */
export type Input<L extends string> = Record<string, Entry<L>>;

/**
 * Resolves a single dictionary entry into the value consumers see on
 * `intl.copy`. {@link Template} entries become typed callables
 * (`(args) => Out`); {@link Constant} entries become a plain property of type
 * `Out`. `Out` is the entry's declared output type — `string` by default, or
 * {@link ReactNode} when the entry opted in via `<..., ReactNode>`.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @typeParam E - Entry type to resolve.
 */
export type Resolved<L extends string, E> =
  E extends Template<L, infer Args, infer Out>
    ? (args: Args) => Out
    : E extends Constant<L, infer Out>
      ? Out
      : never;

/**
 * Resolves every entry of a dictionary input into its consumer-facing shape
 * — this is what lives on the `.copy` field of the `useI18n(...)` return
 * value.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @typeParam D - Dictionary input type.
 */
export type Merged<L extends string, D extends Input<L>> = {
  [K in keyof D]: Resolved<L, D[K]>;
};

/**
 * Handle returned by `i18n.useLocale()` — the active locale, the ordered
 * preference list behind it, the setters that change either, and a helper
 * that serialises the list for your APIs.
 *
 * `locale` is always the head of `locales`; the two never diverge. Use
 * `setLocale` when a single choice is all you have and `setLocales` when you
 * have a ranked list (a user's language preferences, `navigator.languages`,
 * a parsed `Accept-Language`).
 *
 * @typeParam L - Locale union for this i18n instance.
 */
export type LocaleHandle<L extends string> = {
  /** Currently active locale — always the first entry of {@link LocaleHandle.locales}. */
  locale: L;
  /**
   * Ordered preferred locales, most-preferred first. A single-entry list
   * after `setLocale`; the full ranked list after `setLocales`.
   */
  locales: readonly L[];
  /**
   * Switch to a single preferred locale — shorthand for
   * `setLocales([next])`, collapsing any existing preference list.
   */
  setLocale(next: L): void;
  /**
   * Replace the ordered preference list; the first entry becomes the active
   * locale. An empty list is ignored — the active locale can never be empty.
   */
  setLocales(next: readonly L[]): void;
  /**
   * Serialises the current {@link LocaleHandle.locales} into an HTTP
   * `Accept-Language` header value — hand it straight to `fetch` / `axios`
   * to echo the user's preference order back to your APIs. Reflects whichever
   * setter last ran, so `setLocale`/`setLocales` keep it in sync.
   *
   * @returns The header value (e.g. `"fr, en;q=0.667, de;q=0.333"`).
   */
  acceptLanguage(): string;
  /**
   * CSS `transform` value for flipping direction-dependent icons under RTL
   * locales — `"scaleX(-1)"` when the active {@link LocaleHandle.locale} reads
   * right-to-left, `undefined` otherwise (so a class-supplied transform is left
   * intact under LTR). Derived from the locale's text direction
   * (`Intl.Locale.getTextInfo()`), so every RTL locale the platform's CLDR
   * knows resolves correctly with no hand-maintained list.
   *
   * Apply it to directional glyphs (arrows, chevrons, back/next) whose meaning
   * depends on reading order — `style={{ transform }}` — and leave
   * direction-neutral icons (checkmarks, spinners, logos) alone. Being a plain
   * value, it drops into any style object: `style={{ fontSize: 20, transform }}`.
   */
  transform: CSSProperties["transform"];
};

/**
 * Props accepted by the `i18n.Provider` React component.
 *
 * Supply `locales` (a ranked list) or `locale` (a single locale) to run the
 * provider controlled — the parent owns the value and the head of the list
 * is the active locale. Omit both and the provider manages the preference
 * list internally, starting from the first entry of the configured `locales`.
 * A controlled `locales` array should be stable (memoised by the parent) to
 * avoid needless re-renders, as with any controlled array prop.
 *
 * @typeParam L - Locale union for this i18n instance.
 */
export type ProviderProps<L extends string> = {
  /** Active locale when used as a controlled component. Ignored if `locales` is set. */
  locale?: L;
  /**
   * Ordered preference list when used as a controlled component, most-preferred
   * first. Takes precedence over `locale`; its first entry is the active locale.
   */
  locales?: readonly L[];
  /** Notified with the new active locale whenever it changes via either setter. */
  onLocaleChange?(next: L): void;
  /** Notified with the full preference list whenever it changes via either setter. */
  onLocalesChange?(next: readonly L[]): void;
  /** React subtree that should see this locale via `useI18n` / `useLocale`. */
  children: ReactNode;
};

/**
 * Hooks called by the runtime to install one of the `Intl` formatter
 * polyfills from `@formatjs/*` when the host environment is missing native
 * support. The library does not embed dynamic-import specifiers itself —
 * consumers own the `import()` so each bundler's static-analysis rules are
 * satisfied at the call site.
 *
 * @typeParam L - Locale union for the parent {@link I18n} instance.
 * Narrowing `data(locale: L)` instead of `string` makes the consumer's
 * `switch (locale)` exhaustive over every configured locale.
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
  plural?: PolyfillLoader<L>;
  /** Loader for `Intl.NumberFormat` (e.g. `@formatjs/intl-numberformat`). */
  number?: PolyfillLoader<L>;
  /** Loader for `Intl.DateTimeFormat` (e.g. `@formatjs/intl-datetimeformat`). */
  dateTime?: PolyfillLoader<L>;
};

/**
 * Configuration accepted by the {@link I18n} constructor.
 *
 * @typeParam L - Locale union — usually narrowed via `as const` on the array
 * literal.
 */
export type I18nConfig<L extends string> = {
  /** Ordered list of supported locales — the first entry is the initial locale. */
  locales: readonly L[];
  /**
   * Optional per-formatter polyfills. Each slot — `plural`, `number`,
   * `dateTime` — accepts its own
   * {@link PolyfillLoader}, invoked only when the matching native check
   * fails for the configured locales. Omit any slot you don't need; omit
   * the whole field on runtimes with native support (modern browsers,
   * Hermes) to keep Metro/React Native from choking on a non-literal
   * `import()` specifier the library would otherwise have to embed.
   */
  polyfills?: Polyfills<L>;
};

/**
 * Object returned by `i18n.useI18n(...)`. Pairs the resolved dictionary
 * (`copy`) with the active {@link Intl.Locale} instance. Every locale-specific
 * bit consumers might want — direction, region, script, week info, numbering
 * system, calendar, hour cycle — is reachable via the standard `Intl.Locale`
 * API on `locale`, so no per-message metadata is needed.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @typeParam D - Dictionary input type.
 */
export type ResolvedDictionary<L extends string, D extends Input<L>> = {
  /** Fully resolved dictionary — each entry a typed callable. */
  copy: Merged<L, D>;
  /**
   * Active locale as an {@link Intl.Locale} instance. Reach direction via
   * `locale.getTextInfo().direction`, calendars via `locale.getCalendars()`,
   * region via `locale.region`, etc.
   */
  locale: Intl.Locale;
};
