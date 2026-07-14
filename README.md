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
- [Preferred languages](#preferred-languages)
- [Text direction](#text-direction)
- [Locale detection](#locale-detection)
- [Writing messages](#writing-messages)
- [Usage](#usage)
- [Components](#components)
- [Testing](#testing)

## Benefits

- Plain TS / JS — interpolation is template literals; every locale-scoped `Intl` type (`NumberFormat`, `DateTimeFormat`, `PluralRules`, `Collator`, `DisplayNames`, `DurationFormat`, `ListFormat`, `RelativeTimeFormat`, `Segmenter`) is injected per formatter.
- Type-safe arguments — `template<{ name: string }>({...})` enforces the argument shape across every locale.
- Message-first nesting — each message lives next to its translations.
- Full coverage enforced — every dictionary entry must define every configured locale; partial coverage is a compile-time error.
- String-first, JSX-ready — messages resolve to `string` by default, so they drop straight into `alt` / `title` / `aria-label`; widen the output to `ReactNode` with one type parameter when a message embeds JSX (links, styled spans, icons) — no wrapper component.
- RTL / LTR ready — every resolved bundle carries a full `Intl.Locale`, so `intl.locale.getTextInfo().direction` gives you `"ltr"` or `"rtl"` for the active locale directly.
- No runtime DSL — drop the `intl-messageformat` parser entirely.

For runtimes without native `Intl.PluralRules` / `Intl.NumberFormat` / `Intl.DateTimeFormat` (older embedded webviews, some Hermes builds), Tradurre accepts a per-formatter `polyfills` map on `new I18n({...})` — see the [Intl polyfills recipe](./recipes/intl-polyfills.md).

## Getting started

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

## Preferred languages

`useLocale()` returns the active `locale` **and** the ordered preference list behind it. `setLocale(next)` sets a single language; `setLocales(next)` sets a ranked list where the first entry is the favourite (and becomes the active locale). The two never diverge — `locale` is always `locales[0]`.

The handle also carries `acceptLanguage()`, which serialises the current preference list into a standard `Accept-Language` header — hand it straight to `fetch` / `axios` to echo the user's language ranking back to your APIs. `favourite` is typed against your own `Locale` union (the one you configured `I18n` with), so the picker stays exhaustive.

```tsx
function LanguagePreferences() {
  const { locale, locales, setLocales, acceptLanguage } = i18n.useLocale();

  // Move the chosen locale to the front, keeping the rest as ordered fallbacks.
  function prefer(favourite: Locale) {
    setLocales([
      favourite,
      ...locales.filter((existing) => existing !== favourite),
    ]);
  }

  async function save() {
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Accept-Language": acceptLanguage() },
    });
    // locales = [Locale.Fr, Locale.En, Locale.De] → "fr, en;q=0.667, de;q=0.333"
  }

  return (
    <MyRankedPicker
      value={locales}
      active={locale}
      onPrefer={prefer}
      onSave={save}
    />
  );
}
```

The favourite is emitted bare (implicit `q=1`); each fallback gets a strictly-decreasing quality weight. Blank entries are dropped and duplicates collapse, so the header is always valid. Because `acceptLanguage()` reads the live list, `setLocale` / `setLocales` keep it in sync automatically. Going the other way, a server can hydrate the provider from a request's own `Accept-Language` via the controlled `locales` prop on `<i18n.Provider>`.

## Text direction

Every `useI18n(...)` result carries the active locale as an `Intl.Locale`, and text direction comes from the standard `getTextInfo()` method. Wire it into your root element once and every RTL-aware layout falls out for free — Arabic, Hebrew, Persian, Urdu all flip, and every other locale stays LTR:

```tsx
export function App() {
  const intl = i18n.useI18n(translations);

  useEffect(() => {
    document.documentElement.dir = intl.locale.getTextInfo().direction;
    document.documentElement.lang = intl.locale.baseName;
  }, [intl.locale]);

  return <YourApp />;
}
```

`getTextInfo().direction` is `"ltr"` or `"rtl"` — pass it into `<html dir>`, CSS-in-JS, or any UI kit that accepts a `direction` prop (Ant Design, MUI, Chakra, etc.). Because every dictionary entry defines every configured locale, `intl.locale` is always the active locale, so the resolved direction is always correct for the copy you're rendering. Everything else on the standard `Intl.Locale` API — `region`, `script`, `numberingSystem`, `getWeekInfo()`, `getCalendars()`, `getHourCycles()` — is reachable the same way.

## Locale detection

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

## Writing messages

A dictionary is a flat record of message-id → entry. Every configured locale must be defined on every entry — partial coverage is a compile error.

Two entry kinds:

- **`i18n.constant({...})`** — token-less. Consumed as a plain property: `intl.copy.signIn`.
- **`i18n.template<Args>({...})`** — takes typed tokens. Consumed as a call: `intl.copy.greet({ name })`.

Template formatters receive a single `{ tokens, format }` payload — `tokens` is the typed args object you pass at the call site; `format` is locale-bound and exposes every `Intl` factory (`number`, `dateTime`, `plural`, `list`, `relativeTime`, `displayNames`, `duration`, `collator`, `segmenter`). Both kinds produce a `string` by default (widen to `ReactNode` via the type parameter — `i18n.constant<ReactNode>(...)` / `i18n.template<Args, ReactNode>(...)` — for JSX); constant variants can also be `({ format }) => …` when they need `format` access without tokens. See the [Format factories recipe](./recipes/format.md) for a worked example of each.

```ts
import { i18n } from "./i18n";

namespace Tokens {
  type Greet = { name: string };
}

export const translations = i18n.dictionary({
  signIn: i18n.constant({
    [Locale.En]: "Sign in",
    [Locale.Fr]: "Se connecter",
    [Locale.De]: "Anmelden",
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

Constants and templates are plain values, so hoist common copy — button labels (`Save`, `Cancel`, `Submit`), validation messages, shared microcopy — into their own modules and reuse them across dictionaries. Type inference flows across the import boundary, so `intl.copy.greet({ name })` stays fully typed. Let TypeScript infer the return; don't widen the export to `Entry<L>` or the `Args` generic gets erased.

```ts
export const signIn = i18n.constant({
  [Locale.En]: "Sign in",
  [Locale.Fr]: "Se connecter",
  [Locale.De]: "Anmelden",
});

export const greet = i18n.template<Tokens.Greet>({
  [Locale.En]({ tokens }) {
    return `Hello, ${tokens.name}`;
  },
  [Locale.Fr]({ tokens }) {
    return `Bonjour, ${tokens.name}`;
  },
  [Locale.De]({ tokens }) {
    return `Hallo, ${tokens.name}`;
  },
});

export const translations = i18n.dictionary({ signIn, greet });
```

## Usage

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
      <p>{intl.copy.signIn}</p>
    </section>
  );
}
```

`useI18n(...)` returns `{ copy, locale }`. `copy` is the fully resolved dictionary — constants land as plain `string` properties (`intl.copy.signIn`); templates land as typed callables (`intl.copy.greet({ name })`, returning `string`). Both default to `string` and widen to `ReactNode` on demand — see [Components](#components). `locale` is the active `Intl.Locale`; reach direction via `intl.locale.getTextInfo().direction` and every other locale-specific bit via the standard `Intl.Locale` API. `format` inside formatters is bound automatically to the active locale.

## Components

### Strings for attributes

Messages resolve to a `string` by default, so a message drops straight into a plain-string attribute — `alt`, `title`, `placeholder`, `aria-label` — as readily as it does into element children. No cast, no coercion:

```tsx
export const translations = i18n.dictionary({
  logoAlt: i18n.constant({
    [Locale.En]: "Company logo",
    [Locale.Fr]: "Logo de l'entreprise",
    [Locale.De]: "Firmenlogo",
  }),
  removeLabel: i18n.template<{ name: string }>({
    [Locale.En]: ({ tokens }) => `Remove ${tokens.name}`,
    [Locale.Fr]: ({ tokens }) => `Retirer ${tokens.name}`,
    [Locale.De]: ({ tokens }) => `${tokens.name} entfernen`,
  }),
});

function Logo({ name }: { name: string }) {
  const intl = i18n.useI18n(translations);
  return (
    <img
      src="/logo.png"
      alt={intl.copy.logoAlt} // string — assigns straight in
      aria-label={intl.copy.removeLabel({ name })} // (args) => string
    />
  );
}
```

A token-less string message can also be written `i18n.template<void, string>(...)` — `void` tokens resolve to a no-argument callable (`intl.copy.close()`).

Because the default output is `string`, returning JSX from a message is a **compile error** — a React element (or a stringified `[object Object]`) can never leak into an attribute that only accepts text. The output type never widens by inference either: it stays `string` until _you_ write `ReactNode`, so the attribute-safe default is never silently lost.

### Rich messages

When a message genuinely renders JSX — a styled span, an inline `<Link>`, an icon — widen the output type to `ReactNode` with the second type parameter: `i18n.template<Args, ReactNode>(...)`, or `i18n.constant<ReactNode>(...)` for a token-less one. There is no dedicated `<Trans>` component because there is nothing to wrap: a widened message _is_ a `(args) => ReactNode` function, so you call it in JSX:

```tsx
import type { ReactNode } from "react";

namespace Tokens {
  type Articles = { count: number };
}

export const translations = i18n.dictionary({
  articles: i18n.template<Tokens.Articles, ReactNode>({
    [Locale.En]({ tokens, format }) {
      const category = format.plural().select(tokens.count);
      return category === "one" ? (
        <P>{tokens.count} article</P>
      ) : (
        <P>{tokens.count} articles</P>
      );
    },
    [Locale.Fr]({ tokens, format }) {
      const category = format.plural().select(tokens.count);
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

A widened message can still return a bare string from any variant (`string` is a `ReactNode`), so mixing plain text and JSX across locales is fine. The arg type is inferred from the message, so passing the wrong shape is a compile error.

## Testing

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
