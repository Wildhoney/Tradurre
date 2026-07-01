<p align="center">
  <img src="./media/logo.png" alt="Tradurre — Tower of Babel" width="640" />
</p>

<h1 align="center">Tradurre</h1>

<p align="center">
  <em>Tiny, type-safe, message-first i18n for React. No DSL, no ICU runtime, no codegen — translations are plain TypeScript functions.</em>
</p>

<p align="center">
  <a href="https://github.com/Wildhoney/Tradurre/actions/workflows/checks.yml">
    <img src="https://github.com/Wildhoney/Tradurre/actions/workflows/checks.yml/badge.svg" alt="Checks" />
  </a>
</p>

<p align="center">
  <a href="https://wildhoney.github.io/Tradurre/"><strong>View demo →</strong></a>
</p>

## Contents

- [Benefits](#benefits)
- [Getting started](#getting-started)
- [Detecting from explicit candidates](#detecting-from-explicit-candidates)
- [Defining messages](#defining-messages)
- [Consuming messages](#consuming-messages)
- [Helpers](#helpers)
  - [Plurals](#plurals)
  - [Currency and numbers](#currency-and-numbers)
  - [Dates and times](#dates-and-times)
- [Interpolating components](#interpolating-components)
- [Active locale metadata](#active-locale-metadata)
- [Unit testing](#unit-testing)
- [Intl polyfills](#intl-polyfills)

## Benefits

- Plain TS / JS — interpolation is template literals; `Intl.NumberFormat`, `Intl.DateTimeFormat`, and `Intl.PluralRules` are injected per formatter.
- Type-safe arguments — `template<{ name: string }>({...})` enforces the argument shape across every locale.
- Message-first nesting — each message lives next to its translations.
- Full coverage enforced — every dictionary entry must define every configured locale; partial coverage is a compile-time error.
- Rich messages — formatters return `ReactNode`, so JSX (links, styled spans, icons) embeds inline without a wrapper component.
- Locale metadata built in — `useI18n(...)` returns `{ copy, locale }` where `locale` is a full `Intl.Locale`, so direction (`locale.getTextInfo().direction`), region, script, week info, numbering system, etc. are one call away.
- No runtime DSL — drop the `intl-messageformat` parser entirely.

## Getting started

Install the package. The `@formatjs/intl-*` polyfills are only needed if you have to support a runtime that lacks native `Intl.PluralRules` / `Intl.NumberFormat` / `Intl.DateTimeFormat` for your locales — see [Intl polyfills](#intl-polyfills).

```sh
pnpm add tradurre
```

Configure once in your app entry. The class returns a typed instance scoped to your locale list — no module-level globals. Every dictionary entry must define every locale in this list; a missing variant is a compile error.

```ts
import { I18n } from "tradurre";

enum Locale {
  En,
  Fr,
  De,
}

export const i18n = new I18n({
  locales: [Locale.En, Locale.Fr, Locale.De] as const,
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
  user?.preferences.locale,
  cookies.get("locale"),
  request.headers["accept-language"],
  ...navigator.languages,
]);
```

Candidates are tried in order. Non-strings are skipped, primary tags (`fr-CA` → `fr`) match before exact codes, and if nothing matches the function returns `locales[0]`.

## Defining messages

A dictionary is a flat record of message-id → `i18n.template<Args>({ ... })`. Every entry must be a template — even a token-less constant string — and every configured locale must be defined on every template. The `Args` generic defaults to `object`, so messages with no tokens omit both the generic and the call-site arguments. Template formatters receive a single `{ tokens, helpers }` payload — `tokens` is the typed args object you pass at the call site; `helpers` is locale-bound and exposes `numberFormat`, `dateTimeFormat`, and `pluralRules` factories that return `Intl` instances.

```ts
import { i18n } from "./i18n";

namespace Tokens {
  type Greet = { name: string };
}

export const translations = i18n.dictionary({
  ok: i18n.template({
    [Locale.En]: () => "OK",
    [Locale.Fr]: () => "OK",
    [Locale.De]: () => "OK",
  }),

  greet: i18n.template<Tokens.Greet>({
    [Locale.En]({ tokens }) {
      return `Hello, ${tokens.name}`;
    },
    [Locale.Fr]({ tokens }) {
      return `Bonjour, ${tokens.name}`;
    },
    [Locale.De]({ tokens }) {
      return `Hallo, ${tokens.name}`;
    },
  }),
});
```

Omitting any locale from a template is a compile error — the type system enforces full coverage across the configured `locales`.

## Consuming messages

```tsx
import { i18n } from "./i18n";
import { translations } from "./translations";

type WelcomeProps = {
  name: string;
};

export function Welcome({ name }: WelcomeProps) {
  const intl = i18n.useI18n(translations);

  return (
    <section>
      <h1>{intl.copy.greet({ name })}</h1>
      <p>{intl.copy.ok()}</p>
    </section>
  );
}
```

`useI18n(...)` returns `{ copy, locale }`. `copy` is the fully resolved dictionary — every entry a typed callable. Token-less messages (`intl.copy.ok()`) take no arguments; templated messages (`intl.copy.greet({ name })`) require their typed `tokens` object. `locale` is the active `Intl.Locale`; reach direction via `intl.locale.getTextInfo().direction` and every other locale-specific bit via the standard `Intl.Locale` API (see [Active locale metadata](#active-locale-metadata)). `helpers` inside formatters are bound automatically based on the active locale.

## Helpers

Every template formatter receives a `helpers` object scoped to the active locale. Each factory returns a fresh `Intl` instance configured for that locale — no setup, no caching to manage. The sections below show each helper as a single dictionary entry you'd add alongside the rest.

### Plurals

`helpers.pluralRules()` returns an `Intl.PluralRules` for the active locale. Branch on the category to pick the right form per language.

```ts
namespace Tokens {
  type Items = { count: number };
}

items: i18n.template<Tokens.Items>({
  [Locale.En]({ tokens, helpers }) {
    const category = helpers.pluralRules().select(tokens.count);
    return category === "one" ? "1 item" : `${tokens.count} items`;
  },
  [Locale.Fr]({ tokens, helpers }) {
    const category = helpers.pluralRules().select(tokens.count);
    return category === "one"
      ? `${tokens.count} article`
      : `${tokens.count} articles`;
  },
  [Locale.De]({ tokens, helpers }) {
    const category = helpers.pluralRules().select(tokens.count);
    return category === "one" ? "1 Eintrag" : `${tokens.count} Einträge`;
  },
}),
```

### Currency and numbers

`helpers.numberFormat(options)` returns an `Intl.NumberFormat`. Pass it standard `Intl.NumberFormatOptions` — currency, percentage, units, anything the spec supports.

```ts
namespace Tokens {
  type Balance = { amount: number };
}

balance: i18n.template<Tokens.Balance>({
  [Locale.En]({ tokens, helpers }) {
    return `Balance: ${helpers
      .numberFormat({ style: "currency", currency: "USD" })
      .format(tokens.amount)}`;
  },
  [Locale.Fr]({ tokens, helpers }) {
    return `Solde : ${helpers
      .numberFormat({ style: "currency", currency: "EUR" })
      .format(tokens.amount)}`;
  },
  [Locale.De]({ tokens, helpers }) {
    return `Saldo: ${helpers
      .numberFormat({ style: "currency", currency: "EUR" })
      .format(tokens.amount)}`;
  },
}),
```

### Dates and times

`helpers.dateTimeFormat(options)` returns an `Intl.DateTimeFormat`. Use the `dateStyle` / `timeStyle` presets or any granular option.

```ts
namespace Tokens {
  type SentOn = { when: Date };
}

sentOn: i18n.template<Tokens.SentOn>({
  [Locale.En]({ tokens, helpers }) {
    return `Sent on ${helpers
      .dateTimeFormat({ dateStyle: "long" })
      .format(tokens.when)}`;
  },
  [Locale.Fr]({ tokens, helpers }) {
    return `Envoyé le ${helpers
      .dateTimeFormat({ dateStyle: "long" })
      .format(tokens.when)}`;
  },
  [Locale.De]({ tokens, helpers }) {
    return `Gesendet am ${helpers
      .dateTimeFormat({ dateStyle: "long" })
      .format(tokens.when)}`;
  },
}),
```

## Interpolating components

Template formatters return `ReactNode`, so you can return JSX directly — wrap a count in a styled element, drop a `<Link>` inline, whatever. There is no dedicated `<Trans>` component because there is nothing to wrap: a message _is_ a `(args) => ReactNode` function, so you call it in JSX:

```tsx
namespace Tokens {
  type Articles = { count: number };
}

export const translations = i18n.dictionary({
  articles: i18n.template<Tokens.Articles>({
    [Locale.En]({ tokens, helpers }) {
      const category = helpers.pluralRules().select(tokens.count);
      return category === "one" ? (
        <P>{tokens.count} article</P>
      ) : (
        <P>{tokens.count} articles</P>
      );
    },
    [Locale.Fr]({ tokens, helpers }) {
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
  const intl = i18n.useI18n(translations);
  return <>{intl.copy.articles({ count })}</>;
}
```

String returns inline as text, JSX returns render their tree. The arg type is inferred from the message, so passing the wrong shape is a compile error.

## Active locale metadata

`useI18n(...)` returns `{ copy, locale }`. `locale` is a full `Intl.Locale` instance, so every locale-specific bit — text direction, week info, numbering system, calendar, hour cycle, language, region, script, … — is reachable via the standard browser API:

```tsx
function Heading({ name }: { name: string }) {
  const intl = i18n.useI18n(translations);
  const direction = intl.locale.getTextInfo().direction;

  return (
    <article dir={direction}>
      <h1>{intl.copy.greet({ name })}</h1>
      <p>script: {intl.locale.script ?? "—"}</p>
      <p>region: {intl.locale.region ?? "—"}</p>
      <p>numbering: {intl.locale.numberingSystem}</p>
      <p>first day of week: {intl.locale.getWeekInfo().firstDay}</p>
    </article>
  );
}
```

`getTextInfo()` and `getWeekInfo()` come from the stage-3 Intl Locale Info API — modern Chromium, Firefox, Safari, and Node ship them. Because every dictionary entry defines every configured locale, there is never a divergence between "the locale you asked for" and "the locale that actually resolved" — `intl.locale` is always the active locale.

## Unit testing

`i18n.withI18n(locale, element)` wraps any React element in the provider, bound to the given locale. It returns a `ReactElement` you can pass straight to your renderer of choice — no wrapper boilerplate, no separate `<Provider>` import in every test file:

```tsx
import { render, screen } from "@testing-library/react";
import { i18n } from "./i18n";
import { Welcome } from "./Welcome";

it("greets in French", () => {
  render(i18n.withI18n(Locale.Fr, <Welcome name="Imogen" />));
  expect(screen.getByRole("heading")).toHaveTextContent("Bonjour, Imogen");
});

it("greets in German", () => {
  render(i18n.withI18n(Locale.De, <Welcome name="Imogen" />));
  expect(screen.getByRole("heading")).toHaveTextContent("Hallo, Imogen");
});
```

`locale` is typed against your configured locale union, so passing an unsupported locale is a compile error. The helper is just `createElement(this.Provider, { locale }, element)` under the hood — no dependency on `@testing-library/react`, so it composes with any React renderer (RTL, `react-test-renderer`, Ink, etc.).

## Intl polyfills

`Intl.PluralRules`, `Intl.NumberFormat`, and `Intl.DateTimeFormat` ship natively in every modern browser, in Node ≥13, and in Hermes — so most apps need nothing here. If you have to support a runtime that lacks native support for some of your locales (older embedded webviews, exotic CI runtimes), pass a `polyfills` map to `new I18n({ ... })`. Each slot is independent; the constructor installs the engine and CLDR data only when — and only for the specific formatter where — the native check fails.

Loaders live in your code (not in Tradurre) on purpose. Bundlers handle dynamic-import specifiers differently — Vite and webpack tolerate template literals, Metro (React Native) rejects them at transform time — so the only sound contract is for the call site to decide. The `data` parameter is typed as your configured locale union, so a `switch (locale)` is exhaustive.

For Vite or webpack — template literals are fine:

```sh
pnpm add @formatjs/intl-pluralrules @formatjs/intl-numberformat @formatjs/intl-datetimeformat
```

```ts
new I18n({
  locales: ["en", "ar", "en-GB"] as const,
  polyfills: {
    pluralRules: {
      async polyfill() {
        await import("@formatjs/intl-pluralrules/polyfill.js");
      },
      async data(locale) {
        await import(
          /* @vite-ignore */ `@formatjs/intl-pluralrules/locale-data/${locale}.js`
        );
      },
    },
    numberFormat: {
      async polyfill() {
        await import("@formatjs/intl-numberformat/polyfill.js");
      },
      async data(locale) {
        await import(
          /* @vite-ignore */ `@formatjs/intl-numberformat/locale-data/${locale}.js`
        );
      },
    },
    dateTimeFormat: {
      async polyfill() {
        await import("@formatjs/intl-datetimeformat/polyfill.js");
      },
      async data(locale) {
        await import(
          /* @vite-ignore */ `@formatjs/intl-datetimeformat/locale-data/${locale}.js`
        );
      },
    },
  },
});
```

For React Native (Metro), omit `polyfills` entirely — Hermes exposes all three `Intl` formatters natively for the locales it ships with:

```ts
new I18n({
  locales: ["en", "ar", "en-GB"] as const,
});
```

If you do need data for a locale Hermes doesn't cover, supply loaders whose `data()` switches on `locale` to static specifiers — TypeScript narrows `locale` to your `locales` union so missing cases are a compile error when the switch is exhaustive:

```ts
new I18n({
  locales: ["en", "ar", "en-GB"] as const,
  polyfills: {
    pluralRules: {
      async polyfill() {
        await import("@formatjs/intl-pluralrules/polyfill.js");
      },
      async data(locale) {
        switch (locale) {
          case "en":
            await import("@formatjs/intl-pluralrules/locale-data/en.js");
            return;
          case "ar":
            await import("@formatjs/intl-pluralrules/locale-data/ar.js");
            return;
          case "en-GB":
            await import("@formatjs/intl-pluralrules/locale-data/en-GB.js");
            return;
        }
      },
    },
  },
});
```

Loader rejections are swallowed inside the constructor — a failed polyfill never crashes app boot, but it does mean the affected formatter will fall through to whatever native support exists.
