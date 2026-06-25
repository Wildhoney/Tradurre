<p align="center">
  <img src="./media/logo.png" alt="Reacti8n — Tower of Babel" width="640" />
</p>

# Reacti8n

> Tiny, type-safe, message-first i18n for React. No DSL, no ICU runtime, no codegen — translations are plain TypeScript functions.

- Plain TS / JS — interpolation is template literals; `Intl.NumberFormat`, `Intl.DateTimeFormat`, and `Intl.PluralRules` are injected per formatter.
- Type-safe arguments — `template<{ name: string }>({...})` enforces the argument shape across every locale.
- Message-first nesting — each message lives next to its translations.
- At-least-one locale — the type system rejects empty entries; the runtime walks the configured `locales` list in order to find a defined variant.
- Strict mode opt-in — pass `Mode.Strict` and the type system enforces every locale on every message.
- Rich messages — formatters return `ReactNode`, so JSX (links, styled spans, icons) embeds inline without a wrapper component.
- Fallback observability — register a callback fired whenever the requested locale falls back to another.
- No runtime DSL — drop the `intl-messageformat` parser entirely.

## Contents

- [Getting started](#getting-started)
- [Detecting from explicit candidates](#detecting-from-explicit-candidates)
- [Defining messages](#defining-messages)
- [Consuming messages](#consuming-messages)
- [Helpers](#helpers)
  - [Plurals](#plurals)
  - [Currency and numbers](#currency-and-numbers)
  - [Dates and times](#dates-and-times)
- [Partial coverage](#partial-coverage)
- [Rendering rich messages](#rendering-rich-messages)
- [Strict mode](#strict-mode)
- [Fallback observability](#fallback-observability)

## Getting started

Install the package — plus the optional `@formatjs` packages if you need CLDR plural data on older runtimes:

```sh
pnpm add reacti8n
pnpm add @formatjs/intl-pluralrules @formatjs/intl-localematcher
```

Configure once in your app entry. The class returns a typed instance scoped to your locale list — no module-level globals. The fallback chain is the order of `locales`: lookup walks left-to-right and stops at the first defined variant. The type system requires at least one locale per message, so a message that is undefined in every locale is a compile error.

```ts
import { I18n } from "reacti8n";

export const i18n = new I18n({
  locales: ["en", "fr", "de"] as const,
  onFallback(event) {
    Sentry.captureMessage(
      `i18n fallback: ${event.key} (${event.requested} → ${event.resolved ?? "null"})`,
      "warning",
    );
  },
});
```

Detect the active locale at boot and wrap your app in the provider. `detect()` reads `navigator.languages` (or `navigator.language`), matches each candidate's primary tag against the configured `locales`, and returns the first hit — falling back to `locales[0]` if nothing matches.

```tsx
import { i18n } from "./i18n";

const detected = i18n.detect();

createRoot(document.getElementById("root")!).render(
  <i18n.Provider locale={detected}>
    <App />
  </i18n.Provider>,
);
```

The `locale` prop on `<i18n.Provider>` is controlled — pass it to drive the active locale externally (from a router, a cookie, a user preference). Omit it and the provider manages locale state internally, starting at `locales[0]`. Consumers can switch the locale at any time:

```tsx
function LanguageSwitcher() {
  const { locale, setLocale } = i18n.useLocale();

  return (
    <select
      value={locale}
      onChange={(event) => {
        const next = event.target.value;
        if (i18n.isLocale(next)) setLocale(next);
        else
          Sentry.captureMessage(
            `i18n: unsupported locale "${next}"`,
            "warning",
          );
      }}
    >
      {i18n.locales.map((locale) => (
        <option key={locale} value={locale}>
          {locale}
        </option>
      ))}
    </select>
  );
}
```

`i18n.isLocale(value)` is a type guard returning `value is L`, so `next` narrows to the locale union inside the branch — no casts needed.

## Detecting from explicit candidates

`detect()` accepts an explicit list of BCP-47 candidates when the locale shouldn't come from `navigator` — useful for cookies, query strings, server-rendered headers, or a stored user preference taking precedence over the browser:

```ts
const detected = i18n.detect([
  cookies.get("locale"),
  request.headers["accept-language"],
  user?.preferences.locale,
]);
```

Candidates are tried in order. Non-strings are skipped, primary tags (`fr-CA` → `fr`) match before exact codes, and if nothing matches the function returns `locales[0]`. The same matching pipeline is used whether candidates come from `navigator` or from your own pipeline.

## Defining messages

A dictionary is a flat record of message-id → variants. Each entry is either a plain `{ en, fr, ... }` map or an `i18n.template<Args>({ ... })` wrapper for messages that take arguments. Template formatters receive a single `{ tokens, helpers }` payload — `tokens` is the typed args object you pass at the call site; `helpers` is locale-bound and exposes `numberFormat`, `dateTimeFormat`, and `pluralRules` factories that return `Intl` instances.

```ts
import { i18n } from "./i18n";

namespace Template {
  type Greet = { name: string };
}

export const translations = i18n.dictionary({
  ok: { en: "OK", fr: "OK", de: "OK" },

  greet: i18n.template<Template.Greet>({
    en({ tokens }) {
      return `Hello, ${tokens.name}`;
    },
    fr({ tokens }) {
      return `Bonjour, ${tokens.name}`;
    },
    de({ tokens }) {
      return `Hallo, ${tokens.name}`;
    },
  }),
});
```

## Consuming messages

```tsx
import { i18n } from "./i18n";
import { translations } from "./translations";

type WelcomeProps = {
  name: string;
};

export function Welcome({ name }: WelcomeProps) {
  const copy = i18n.useI18n(translations);

  return (
    <section>
      <h1>{copy.greet({ name })}</h1>
      <p>{copy.ok}</p>
    </section>
  );
}
```

Plain string entries become strings on the resolved object. Template entries become callables typed with their declared `Args` — the `helpers` are bound automatically based on the active locale.

## Helpers

Every template formatter receives a `helpers` object scoped to the active locale. Each factory returns a fresh `Intl` instance configured for that locale — no setup, no caching to manage. The sections below show each helper as a single dictionary entry you'd add alongside the rest.

### Plurals

`helpers.pluralRules()` returns an `Intl.PluralRules` for the active locale. Branch on the category to pick the right form per language.

```ts
items: i18n.template<{ count: number }>({
  en({ tokens, helpers }) {
    const category = helpers.pluralRules().select(tokens.count);
    return category === "one" ? "1 item" : `${tokens.count} items`;
  },
  fr({ tokens, helpers }) {
    const category = helpers.pluralRules().select(tokens.count);
    return category === "one"
      ? `${tokens.count} article`
      : `${tokens.count} articles`;
  },
  de({ tokens, helpers }) {
    const category = helpers.pluralRules().select(tokens.count);
    return category === "one" ? "1 Eintrag" : `${tokens.count} Einträge`;
  },
}),
```

### Currency and numbers

`helpers.numberFormat(options)` returns an `Intl.NumberFormat`. Pass it standard `Intl.NumberFormatOptions` — currency, percentage, units, anything the spec supports.

```ts
balance: i18n.template<{ amount: number }>({
  en({ tokens, helpers }) {
    return `Balance: ${helpers
      .numberFormat({ style: "currency", currency: "USD" })
      .format(tokens.amount)}`;
  },
  fr({ tokens, helpers }) {
    return `Solde : ${helpers
      .numberFormat({ style: "currency", currency: "EUR" })
      .format(tokens.amount)}`;
  },
}),
```

### Dates and times

`helpers.dateTimeFormat(options)` returns an `Intl.DateTimeFormat`. Use the `dateStyle` / `timeStyle` presets or any granular option.

```ts
sentOn: i18n.template<{ when: Date }>({
  en({ tokens, helpers }) {
    return `Sent on ${helpers
      .dateTimeFormat({ dateStyle: "long" })
      .format(tokens.when)}`;
  },
  fr({ tokens, helpers }) {
    return `Envoyé le ${helpers
      .dateTimeFormat({ dateStyle: "long" })
      .format(tokens.when)}`;
  },
}),
```

## Partial coverage

In the default `Mode.Loose`, partial coverage is fine — the runtime walks the configured `locales` list in order, and the type system only requires at least one variant to be defined. A request for a missing locale resolves via the fallback chain and fires the `onFallback` callback.

```ts
auRevoir: { fr: "Au revoir" },
```

A consumer requesting `en` resolves `auRevoir` to the `fr` variant and the callback fires with `{ key: "auRevoir", requested: "en", resolved: "fr" }`.

## Rendering rich messages

Template formatters return `ReactNode`, so you can return JSX directly — wrap a count in a styled element, drop a `<Link>` inline, whatever. There is no dedicated `<Trans>` component because there is nothing to wrap: a message _is_ a `(args) => ReactNode` function, so you call it in JSX:

```tsx
export const translations = i18n.dictionary({
  articles: i18n.template<{ count: number }>({
    en({ tokens, helpers }) {
      const category = helpers.pluralRules().select(tokens.count);
      return category === "one" ? (
        <P>{tokens.count} article</P>
      ) : (
        <P>{tokens.count} articles</P>
      );
    },
    fr({ tokens, helpers }) {
      const category = helpers.pluralRules().select(tokens.count);
      return category === "one" ? (
        <P>{tokens.count} article</P>
      ) : (
        <P>{tokens.count} articles</P>
      );
    },
  }),
});

type ArticleCountProps = {
  count: number;
};

function ArticleCount({ count }: ArticleCountProps) {
  const copy = i18n.useI18n(translations);
  return <>{copy.articles({ count })}</>;
}
```

String returns inline as text, JSX returns render their tree. The arg type is inferred from the message, so passing the wrong shape is a compile error.

## Strict mode

By default (`Mode.Loose`), the type system requires at least one locale per message — partial coverage compiles and falls back at runtime. Pass `Mode.Strict` as the second generic argument and every dictionary entry must define every locale, with templates needing a formatter for each one.

In the snippet below, the locale set is `"en" | "fr"`. `auRevoir` only defines `fr`, which the compiler rejects in strict mode — the same code is valid under the default `Mode.Loose`.

```ts
import { I18n, Mode } from "reacti8n";

export const i18n = new I18n<"en" | "fr", Mode.Strict>({
  locales: ["en", "fr"] as const,
});

i18n.dictionary({
  auRevoir: { fr: "Au revoir" },
});
```

Strict mode is purely a compile-time constraint — the runtime is identical. Reach for it once the locale set is stable to catch missing translations at build time rather than via the `onFallback` callback.

## Fallback observability

A common operational worry with i18n is "missing translations shipped quietly." Reacti8n calls the `onFallback` handler (registered on `new I18n()`) every time a dictionary entry resolves to a non-requested locale, or to `null` when the key is missing entirely.

Each event reports three fields. `key` is the message id that fell back. `requested` is the locale the consumer asked for. `resolved` is the locale actually used — or `null` when nothing was found anywhere.

```ts
type FallbackEvent<L> = {
  key: string;
  requested: L;
  resolved: L | null;
};
```

Pipe these into Sentry / Datadog / your logger of choice:

```ts
new I18n({
  locales: ["en", "fr", "de"] as const,
  onFallback({ key, requested, resolved }) {
    if (resolved === null) {
      Sentry.captureException(
        new Error(`i18n key "${key}" is missing in every locale`),
      );
    } else {
      Sentry.captureMessage(
        `i18n key "${key}" missing for ${requested}; served ${resolved}`,
        "warning",
      );
    }
  },
});
```

The callback is invoked synchronously inside `Dictionary.resolve()`, so keep it cheap — typically just a logger call.
