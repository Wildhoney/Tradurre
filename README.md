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
- [RTL / LTR](#rtl--ltr)
- [Detection](#detection)
- [Messages](#messages)
- [Usage](#usage)
- [Format](#format)
  - [Plurals](#plurals)
  - [Numbers](#numbers)
  - [Dates](#dates)
- [Components](#components)
- [Testing](#testing)

## Benefits

- Plain TS / JS — interpolation is template literals; every locale-scoped `Intl` type (`NumberFormat`, `DateTimeFormat`, `PluralRules`, `Collator`, `DisplayNames`, `DurationFormat`, `ListFormat`, `RelativeTimeFormat`, `Segmenter`) is injected per formatter.
- Type-safe arguments — `template<{ name: string }>({...})` enforces the argument shape across every locale.
- Message-first nesting — each message lives next to its translations.
- Full coverage enforced — every dictionary entry must define every configured locale; partial coverage is a compile-time error.
- Rich messages — formatters return `ReactNode`, so JSX (links, styled spans, icons) embeds inline without a wrapper component.
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

## RTL / LTR

Every `useI18n(...)` result carries the active locale as an `Intl.Locale`, and text direction comes from the standard `getTextInfo()` method. Wire it into your root element once and every RTL-aware layout falls out for free — Arabic, Hebrew, Persian, Urdu all flip, and every other locale stays LTR:

```tsx
export function App() {
  const intl = i18n.useI18n(translations);
  const direction = intl.locale.getTextInfo().direction;

  useEffect(() => {
    document.documentElement.dir = direction;
    document.documentElement.lang = intl.locale.baseName;
  }, [direction, intl.locale]);

  return <YourApp />;
}
```

`direction` is `"ltr"` or `"rtl"` — pass it into `<html dir>`, CSS-in-JS, or any UI kit that accepts a `direction` prop (Ant Design, MUI, Chakra, etc.). Because every dictionary entry defines every configured locale, `intl.locale` is always the active locale, so `direction` is always correct for the copy you're rendering. Everything else on the standard `Intl.Locale` API — `region`, `script`, `numberingSystem`, `getWeekInfo()`, `getCalendars()`, `getHourCycles()` — is reachable the same way.

## Detection

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

## Messages

A dictionary is a flat record of message-id → entry. Every configured locale must be defined on every entry — partial coverage is a compile error.

Two entry kinds:

- **`i18n.constant({...})`** — token-less. Consumed as a plain property: `intl.copy.signIn`.
- **`i18n.template<Args>({...})`** — takes typed tokens. Consumed as a call: `intl.copy.greet({ name })`.

Template formatters receive a single `{ tokens, format }` payload — `tokens` is the typed args object you pass at the call site; `format` is locale-bound and exposes every `Intl` factory (`number`, `dateTime`, `plural`, `list`, `relativeTime`, `displayNames`, `duration`, `collator`, `segmenter`). Constant variants are plain `ReactNode` values by default, or `({ format }) => ReactNode` when they need `format` access without tokens.

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

`useI18n(...)` returns `{ copy, locale }`. `copy` is the fully resolved dictionary — constants land as plain `ReactNode` properties (`intl.copy.signIn`); templates land as typed callables (`intl.copy.greet({ name })`). `locale` is the active `Intl.Locale`; reach direction via `intl.locale.getTextInfo().direction` and every other locale-specific bit via the standard `Intl.Locale` API. `format` inside formatters is bound automatically to the active locale.

## Format

Every template formatter receives a `format` object scoped to the active locale. Each factory returns a fresh `Intl` instance configured for that locale — no setup, no caching to manage. The sections below show each factory as a single dictionary entry you'd add alongside the rest. Beyond the three below, `format` also exposes `list`, `relativeTime`, `displayNames`, `duration`, `collator`, and `segmenter` — the full locale-scoped `Intl` surface.

### Plurals

`format.plural()` returns an `Intl.PluralRules` for the active locale. Branch on the category to pick the right form per language.

```ts
namespace Tokens {
  type Items = { count: number };
}

items: i18n.template<Tokens.Items>({
  [Locale.En]({ tokens, format }) {
    const category = format.plural().select(tokens.count);
    return category === "one" ? "1 item" : `${tokens.count} items`;
  },
  [Locale.Fr]({ tokens, format }) {
    const category = format.plural().select(tokens.count);
    return category === "one"
      ? `${tokens.count} article`
      : `${tokens.count} articles`;
  },
  [Locale.De]({ tokens, format }) {
    const category = format.plural().select(tokens.count);
    return category === "one" ? "1 Eintrag" : `${tokens.count} Einträge`;
  },
}),
```

### Numbers

`format.number(options)` returns an `Intl.NumberFormat`. Pass it standard `Intl.NumberFormatOptions` — currency, percentage, units, anything the spec supports.

```ts
namespace Tokens {
  type Balance = { amount: number };
}

balance: i18n.template<Tokens.Balance>({
  [Locale.En]({ tokens, format }) {
    return `Balance: ${format
      .number({ style: "currency", currency: "USD" })
      .format(tokens.amount)}`;
  },
  [Locale.Fr]({ tokens, format }) {
    return `Solde : ${format
      .number({ style: "currency", currency: "EUR" })
      .format(tokens.amount)}`;
  },
  [Locale.De]({ tokens, format }) {
    return `Saldo: ${format
      .number({ style: "currency", currency: "EUR" })
      .format(tokens.amount)}`;
  },
}),
```

### Dates

`format.dateTime(options)` returns an `Intl.DateTimeFormat`. Use the `dateStyle` / `timeStyle` presets or any granular option.

```ts
namespace Tokens {
  type SentOn = { when: Date };
}

sentOn: i18n.template<Tokens.SentOn>({
  [Locale.En]({ tokens, format }) {
    return `Sent on ${format
      .dateTime({ dateStyle: "long" })
      .format(tokens.when)}`;
  },
  [Locale.Fr]({ tokens, format }) {
    return `Envoyé le ${format
      .dateTime({ dateStyle: "long" })
      .format(tokens.when)}`;
  },
  [Locale.De]({ tokens, format }) {
    return `Gesendet am ${format
      .dateTime({ dateStyle: "long" })
      .format(tokens.when)}`;
  },
}),
```

## Components

Template formatters return `ReactNode`, so you can return JSX directly — wrap a count in a styled element, drop a `<Link>` inline, whatever. There is no dedicated `<Trans>` component because there is nothing to wrap: a message _is_ a `(args) => ReactNode` function, so you call it in JSX:

```tsx
namespace Tokens {
  type Articles = { count: number };
}

export const translations = i18n.dictionary({
  articles: i18n.template<Tokens.Articles>({
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

String returns inline as text, JSX returns render their tree. The arg type is inferred from the message, so passing the wrong shape is a compile error.

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
