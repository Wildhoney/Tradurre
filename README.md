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
- [Partial coverage](#partial-coverage)
- [Interpolating components](#interpolating-components)
- [Resolved-locale metadata](#resolved-locale-metadata)
- [Strict mode](#strict-mode)
- [Unit testing](#unit-testing)
- [Fallback observability](#fallback-observability)
- [Intl polyfills](#intl-polyfills)

## Benefits

- Plain TS / JS — interpolation is template literals; `Intl.NumberFormat`, `Intl.DateTimeFormat`, and `Intl.PluralRules` are injected per formatter.
- Type-safe arguments — `template<{ name: string }>({...})` enforces the argument shape across every locale.
- Message-first nesting — each message lives next to its translations.
- At-least-one locale — the type system rejects empty entries; the runtime walks the configured `locales` list in order to find a defined variant.
- Strict mode opt-in — pass `Mode.Strict` and the type system enforces every locale on every message.
- Rich messages — formatters return `ReactNode`, so JSX (links, styled spans, icons) embeds inline without a wrapper component.
- Fallback observability — register a callback fired whenever the requested locale falls back to another.
- No runtime DSL — drop the `intl-messageformat` parser entirely.

## Getting started

Install the package. The `@formatjs/intl-*` polyfills are only needed if you have to support a runtime that lacks native `Intl.PluralRules` / `Intl.NumberFormat` / `Intl.DateTimeFormat` for your locales — see [Intl polyfills](#intl-polyfills).

```sh
pnpm add tradurre
```

Configure once in your app entry. The class returns a typed instance scoped to your locale list — no module-level globals. The fallback chain is the order of `locales`: lookup walks left-to-right and stops at the first defined variant. The type system requires at least one locale per message, so a message that is undefined in every locale is a compile error.

```ts
import { I18n } from "tradurre";

enum Locale {
  En,
  Fr,
  De,
}

export const i18n = new I18n({
  locales: [Locale.En, Locale.Fr, Locale.De] as const,
  onFallback(details) {
    Sentry.captureMessage(
      `i18n fallback: ${details.key} (${details.requested} → ${details.resolved ?? "null"})`,
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
  user?.preferences.locale,
  cookies.get("locale"),
  request.headers["accept-language"],
  ...navigator.languages,
]);
```

Candidates are tried in order. Non-strings are skipped, primary tags (`fr-CA` → `fr`) match before exact codes, and if nothing matches the function returns `locales[0]`. The same matching pipeline is used whether candidates come from `navigator` or from your own pipeline.

## Defining messages

A dictionary is a flat record of message-id → `i18n.template<Args>({ ... })`. Every entry must be a template — even a token-less constant string — so every resolved value is a callable carrying `.direction` / `.locale` metadata. The `Args` generic defaults to `object`, so messages with no tokens omit both the generic and the call-site arguments. Template formatters receive a single `{ tokens, helpers }` payload — `tokens` is the typed args object you pass at the call site; `helpers` is locale-bound and exposes `numberFormat`, `dateTimeFormat`, and `pluralRules` factories that return `Intl` instances.

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
      <p>{copy.ok()}</p>
    </section>
  );
}
```

Every resolved entry is a callable typed by its declared `Args`. Token-less messages (`copy.ok()`) take no arguments; templated messages (`copy.greet({ name })`) require their typed `tokens` object. `helpers` are bound automatically based on the active locale.

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
}),
```

## Partial coverage

In the default `Mode.Loose`, partial coverage is fine — the runtime walks the configured `locales` list in order, and the type system only requires at least one variant to be defined. A request for a missing locale resolves via the fallback chain and fires the `onFallback` callback.

```ts
auRevoir: i18n.template({ [Locale.Fr]: () => "Au revoir" }),
```

A consumer requesting `en` resolves `auRevoir` to the `fr` variant and the callback fires with `{ key: "auRevoir", requested: Locale.En, resolved: Locale.Fr }`.

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
  const copy = i18n.useI18n(translations);
  return <>{copy.articles({ count })}</>;
}
```

String returns inline as text, JSX returns render their tree. The arg type is inferred from the message, so passing the wrong shape is a compile error.

## Resolved-locale metadata

Every resolved template callable carries two read-only properties — `direction` and `locale` — describing the locale that _actually_ backed the resolution. When a consumer asks for Arabic but a message is only defined in French, `copy.greet.direction` is `"ltr"` (French) and `copy.greet.locale.language` is `"fr"`, regardless of `i18n.useLocale().locale`. This is the right value to pass into a `<h1 dir={...}>` because the rendered text matches its actual source locale.

```tsx
const copy = i18n.useI18n(translations);

return (
  <article>
    <h1 dir={copy.greet.direction}>{copy.greet({ name: "Imogen" })}</h1>
    <p>script: {copy.greet.locale.script ?? "—"}</p>
    <p>region: {copy.greet.locale.region ?? "—"}</p>
    <p>numbering: {copy.greet.locale.numberingSystem}</p>
    <p>first day of week: {copy.greet.locale.weekInfo?.firstDay ?? "—"}</p>
  </article>
);
```

The `locale` field is a full `Intl.Locale` instance, so every locale-specific bit (text direction, week info, numbering system, calendar, hour cycle, language, region, script, …) is reachable via the standard browser API:

```ts
type ResolvedTemplateMeta = {
  readonly locale: Intl.Locale;
  readonly direction: "ltr" | "rtl";
};
```

`direction` is a flat shortcut for `locale.textInfo.direction` — the common case is "swap the layout for RTL," which is one read.

Because every dictionary entry is an `i18n.template({ ... })`, this metadata is always present — even on token-less messages. The `Args` generic defaults to `object`, so you can omit both the type parameter and the call-site arguments:

```tsx
export const translations = i18n.dictionary({
  appTitle: i18n.template({
    [Locale.En]: () => "Coffee Menu",
    [Locale.Ar]: () => "قائمة القهوة",
  }),
});

function Heading() {
  const copy = i18n.useI18n(translations);
  return <h1 dir={copy.appTitle.direction}>{copy.appTitle()}</h1>;
}
```

Token-less templates are called as `copy.foo()` — no `{}` placeholder needed. Add tokens (`i18n.template<{ name: string }>({...})`) and the call site is required to pass them; the type system flips the parameter from optional to required automatically.

## Strict mode

By default (`Mode.Loose`), the type system requires at least one locale per message — partial coverage compiles and falls back at runtime. Pass `Mode.Strict` as the second generic argument and every dictionary entry must define every locale, with templates needing a formatter for each one.

In the snippet below, the locale set is `Locale.En | Locale.Fr`. `auRevoir` only defines `fr`, which the compiler rejects in strict mode — the same code is valid under the default `Mode.Loose`.

```ts
import { I18n, Mode } from "tradurre";

namespace Locale {
  export type Set = Locale.En | Locale.Fr;
}

export const i18n = new I18n<Locale.Set, Mode.Strict>({
  locales: [Locale.En, Locale.Fr] as const,
});

i18n.dictionary({
  auRevoir: i18n.template({ [Locale.Fr]: () => "Au revoir" }),
});
```

Strict mode is purely a compile-time constraint — the runtime is identical. Reach for it once the locale set is stable to catch missing translations at build time rather than via the `onFallback` callback.

## Unit testing

### Wrapping the provider

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

### Asserting fallback events

When a test exercises a code path that resolves to a non-requested locale, you usually want to confirm the fallback fired rather than rely on the rendered string alone. Spin up a scoped `I18n` instance with `onFallback` wired to a spy — the production instance stays untouched, and you get a precise record of what fell back where:

```tsx
import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { I18n } from "tradurre";

it("renders the French copy and reports the fallback", () => {
  const onFallback = vi.fn();
  const scoped = new I18n({
    locales: [Locale.En, Locale.Fr] as const,
    onFallback,
  });
  const translations = scoped.dictionary({
    auRevoir: scoped.template({ [Locale.Fr]: () => "Au revoir" }),
  });

  function Probe() {
    const copy = scoped.useI18n(translations);
    return <span>{copy.auRevoir()}</span>;
  }

  render(scoped.withI18n(Locale.En, <Probe />));

  expect(screen.getByText("Au revoir")).toBeInTheDocument();
  expect(onFallback).toHaveBeenCalledWith({
    key: "auRevoir",
    requested: Locale.En,
    resolved: Locale.Fr,
  });
});
```

The callback fires synchronously inside `Dictionary.resolve()`, so the spy is populated by the time `render` returns. Use the same pattern with `resolved: null` to assert that a key was missing from every locale — a stronger guarantee than checking the rendered DOM for an empty string.

## Fallback observability

A common operational worry with i18n is "missing translations shipped quietly." Tradurre calls the `onFallback` handler (registered on `new I18n()`) every time a dictionary entry resolves to a non-requested locale, or to `null` when the key is missing entirely.

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
  locales: [Locale.En, Locale.Fr, Locale.De] as const,
  onFallback(details) {
    if (details.resolved === null)
      Sentry.captureException(
        new Error(`i18n key "${details.key}" is missing in every locale`),
      );
    else
      Sentry.captureMessage(
        `i18n key "${details.key}" missing for ${details.requested}; served ${details.resolved}`,
        "warning",
      );
  },
});
```

The callback is invoked synchronously inside `Dictionary.resolve()`, so keep it cheap — typically just a logger call.

## Intl polyfills

`Intl.PluralRules`, `Intl.NumberFormat`, and `Intl.DateTimeFormat` ship natively in every modern browser, in Node ≥13, and in Hermes — so most apps need nothing here. If you have to support a runtime that lacks native support for some of your locales (older embedded webviews, exotic CI runtimes), pass a `polyfills` map to `new I18n({ ... })`. Each slot is independent; the constructor installs the engine and CLDR data only when — and only for the specific formatter where — the native check fails.

Loaders live in your code (not in Tradurre) on purpose. Bundlers handle dynamic-import specifiers differently — Vite and webpack tolerate template literals, Metro (React Native) rejects them at transform time — so the only sound contract is for the call site to decide. The `data` parameter is typed as your configured locale union, so a `switch (locale)` is exhaustive: Tradurre's fallback chain means any configured locale can end up rendering a message, so data must be loaded for **all** of them, not just the active one.

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

If you do need data for a locale Hermes doesn't cover, supply loaders whose `data()` switches on `locale` to static specifiers. Tradurre walks the fallback chain through every configured locale, so the switch must cover all of them — TypeScript narrows `locale` to your `locales` union so missing cases are a compile error when the switch is exhaustive:

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
