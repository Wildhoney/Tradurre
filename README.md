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
- [Formatting locale](#formatting-locale)
- [Locale detection](#locale-detection)
- [Writing messages](#writing-messages)
- [Interpolating components](#interpolating-components)
- [Async copy](#async-copy)
- [Testing helper](#testing-helper)

## Benefits

- Plain TS / JS — interpolation is template literals; every locale-scoped `Intl` type (`NumberFormat`, `DateTimeFormat`, `PluralRules`, `Collator`, `DisplayNames`, `DurationFormat`, `ListFormat`, `RelativeTimeFormat`, `Segmenter`) is injected per formatter.
- Counting & branching — `plural` (cardinal — _1 item_) and `ordinal` (position — _1st_) are separate factories that can't be confused, and `select` does ICU-style gender/enum branching with a required `other` fallback, all in plain TS.
- Type-safe arguments — `template<{ name: string }>({...})` enforces the argument shape across every locale.
- Message-first nesting — each message lives next to its translations.
- Full coverage enforced — every dictionary entry must define every configured locale; partial coverage is a compile-time error.
- String-first, JSX-ready — messages resolve to `string` by default, so they drop straight into `alt` / `title` / `aria-label`; widen the output to `ReactNode` with one type parameter when a message embeds JSX (links, styled spans, icons) — no wrapper component.
- Region ≠ language — a `formatting` override (region, calendar, numbering system, hour cycle) drives every `Intl` factory independently of the message language, so an English UI can format money and dates for the UAE, render Hijri dates, or shape Eastern-Arabic digits.
- RTL / LTR ready — every resolved bundle carries a full `Intl.Locale`, so `intl.locale.getTextInfo().direction` gives you `"ltr"` or `"rtl"` for the active locale directly, and `useLocale().transform` hands back the React Native transform for mirroring directional icons.
- Async copy — `i18n.dictionary.defer(...)` splits a component's copy into one small TS module per locale, written with the same `i18n.constant` / `i18n.template`; only the active language is fetched, every module is type-checked against the source locale, and `intl.loaded` / `intl.error` report progress.
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

### Usage

With the provider mounted, any component reads messages through `useI18n` — hand it the dictionary you defined (see [Writing messages](#writing-messages)):

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

`useI18n(...)` returns `{ copy, locale, loaded, error }`. `copy` is the fully resolved dictionary — constants land as plain `string` properties (`intl.copy.signIn`); templates land as typed callables (`intl.copy.greet({ name })`, returning `string`). Both default to `string` and widen to `ReactNode` on demand — see [Interpolating components](#interpolating-components). `locale` is the active `Intl.Locale`; reach direction via `intl.locale.getTextInfo().direction` and every other locale-specific bit via the standard `Intl.Locale` API. `format` inside formatters is bound automatically to the active locale. `loaded` and `error` only matter for [async copy](#async-copy) — for a dictionary written inline, as above, `loaded` is always `true` and `error` always `undefined`.

### Common copy

Reuse shared microcopy — button labels (`OK`, `Save`, `Cancel`), validation messages, anything common across screens — by keeping it in its own **input map** and spreading it into each screen's dictionary. Dictionary inputs are plain objects, so `{ ...common, ...screen }` merges them with the **last one winning** any shared message id — in both the values _and_ the types — and `i18n.dictionary(...)` builds one typed bundle from the merged input:

```tsx
import { common } from "./common"; // a plain input map: { ok, cancel, … }

export const translations = i18n.dictionary({
  ...common,
  // also defined in `common`, so this screen-specific entry wins — value and type
  ok: i18n.constant({
    [Locale.En]: "Continue",
    [Locale.Fr]: "Continuer",
    [Locale.De]: "Weiter",
  }),
});
```

Keys unique to either side all survive; a collision resolves right-to-left, so entries listed after the spread override the shared ones. Spread the input maps — not the `i18n.dictionary(...)` results, which are opaque wrappers whose entries live in a private field — and the merge runs once at module scope, leaving `useI18n(translations)` a single call with the dictionary's per-locale caching intact.

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

### Mirroring icons

Flipping text is only half of RTL — direction-dependent icons (arrows, chevrons, back/next) need reversing too, while direction-neutral ones (checkmarks, spinners, logos) must stay put. `useLocale()` carries a `transform` for exactly this: `{ scaleX: -1 }` under RTL, `undefined` under LTR. It's a React Native transform entry, so it goes into a transform _array_ — drop it in on the icons that should flip:

```tsx
function BackButton() {
  const { transform } = i18n.useLocale();

  // Reflected under RTL, untouched under LTR:
  return <ArrowLeftIcon style={{ transform: transform && [transform] }} />;
}
```

Because it's a single entry, it also spreads cleanly alongside your own transforms:

```tsx
function BackButton() {
  const { transform } = i18n.useLocale();

  return (
    <ArrowLeftIcon
      style={{
        transform: [{ translateY: 2 }, ...(transform ? [transform] : [])],
      }}
    />
  );
}
```

The entry-not-CSS-string shape is deliberate: React Native styles take an array of transform objects, and RN ≥ 0.74 also accepts the CSS-string form — so `{ scaleX: -1 }` composes on native without assuming the web DOM. On the web, wrap it yourself: `transform: transform ? "scaleX(-1)" : undefined`.

Direction comes straight from the active locale's `Intl.Locale.getTextInfo()`, so Arabic, Hebrew, Persian, Urdu — and any RTL locale the platform's CLDR data knows — all resolve correctly, with no hand-maintained list of RTL languages to keep in sync.

## Formatting locale

The language a message is written in and the conventions its numbers, dates, and currencies follow are two different questions. An English UI in the UAE still wants `AED`, UAE date formats, and — for some users — Hijri dates. Tradurre keeps the two separate: the **display locale** (from your `Locale` union) picks which variant of a message to render, while a **formatting locale** drives every `Intl` factory. They coincide until you set a `formatting` override.

`useLocale()` carries `formatting` (the active overrides), `setFormatting` (to change them at runtime), and `formatLocale` (the resolved tag `Intl` is built from). Each override maps to an `Intl.Locale` option — `region`, `calendar`, `numberingSystem`, `hourCycle` — and composes onto the display locale:

```tsx
function RegionSettings() {
  const { formatting, setFormatting, formatLocale } = i18n.useLocale();

  // Display language stays whatever the user reads; only formatting changes.
  // formatLocale → "en-AE-u-ca-islamic-nu-arab"
  return (
    <Toggle
      label="Show Hijri dates"
      checked={formatting.calendar === "islamic"}
      onChange={(islamic) =>
        setFormatting({
          ...formatting,
          region: "AE",
          calendar: islamic ? "islamic" : undefined,
          numberingSystem: "arab",
        })
      }
    />
  );
}
```

Every `format` factory then inherits it with no per-call options — `format.dateTime({ dateStyle: "long" })` renders Hijri dates, `format.number({ style: "currency", currency: "AED" })` shapes Eastern-Arabic digits — and `intl.locale` reflects the resolved tag (`intl.locale.calendar`, `intl.locale.region`, …). Set it once at the boundary via the controlled `formatting` prop on `<i18n.Provider>` (hydrate it from a cookie or the user's region), or let the provider manage it and flip it live with `setFormatting`. Omit it entirely and `formatLocale` equals the display locale — nothing changes.

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

### Counting and branching

Three helpers on `format` cover the cases a DSL would reach for a `{plural}` / `{selectordinal}` / `{select}` block — here they're plain function calls, so the branching is ordinary TS you can read and step through.

`format.plural()` is **cardinal** ("how many" — _1 item_ / _2 items_); `format.ordinal()` is **position** (_1st_ / _2nd_ / _3rd_). They're deliberately separate factories — `plural`'s `type` is pinned to `"cardinal"` and `ordinal`'s to `"ordinal"` — so you can't accidentally select cardinal categories for ordinal copy. Both return an `Intl.PluralRules`; map its `.select(n)` category to your wording:

```ts
namespace Tokens {
  type Rank = { place: number };
}

const ordinalSuffix: Record<Intl.LDMLPluralRule, string> = {
  zero: "th",
  one: "st",
  two: "nd",
  few: "rd",
  many: "th",
  other: "th",
};

export const rank = i18n.template<Tokens.Rank>({
  [Locale.En]({ tokens, format }) {
    const suffix = ordinalSuffix[format.ordinal().select(tokens.place)];
    return `${tokens.place}${suffix}`; // 1 → "1st", 2 → "2nd", 3 → "3rd"
  },
  [Locale.Fr]({ tokens }) {
    return `${tokens.place}e`;
  },
});
```

`format.select(value, cases)` branches on an arbitrary token — grammatical gender, an account tier, any enum — the way ICU's `{g, select, …}` does. The `other` case is required, so an unhandled value can never fall through to `undefined`:

```ts
export const updated = i18n.template<{ name: string; gender: string }>({
  [Locale.En]({ tokens, format }) {
    return format.select(tokens.gender, {
      female: `${tokens.name} updated her profile`,
      male: `${tokens.name} updated his profile`,
      other: `${tokens.name} updated their profile`,
    });
  },
  [Locale.Fr]({ tokens }) {
    return `${tokens.name} a mis à jour son profil`;
  },
});
```

## Interpolating components

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

## Async copy

Dictionaries written inline bundle every language into your app. To ship each language as its own chunk instead, split a component's copy into one small module per locale — kept **next to the component**, exactly where its inline dictionary would live — and build the dictionary with `i18n.dictionary.defer(...)`:

```
components/basket/
├── index.tsx
├── index.i18n.ts
├── types.ts
├── en.copy.tsx
├── fr.copy.tsx
└── de.copy.tsx
```

Each module exports its `copy`, written with the same `i18n.constant` / `i18n.template` as an inline dictionary — just one value or formatter instead of a locale map, since the file already is one locale. Logic stays plain TS: `format`, plurals, `select`, JSX.

```tsx
// components/basket/fr.copy.tsx
import type { ReactNode } from "react";

import { i18n } from "../../i18n";
import type { Tokens } from "./types";

export const copy = {
  checkout: i18n.constant("Commander"),
  price: i18n.template<Tokens.Price>(({ tokens, format }) =>
    format.number({ style: "currency", currency: "EUR" }).format(tokens.amount),
  ),
  items: i18n.template<Tokens.Items, ReactNode>(({ tokens, format }) =>
    format.plural().select(tokens.count) === "one" ? (
      <b>{tokens.count} article</b>
    ) : (
      <b>{tokens.count} articles</b>
    ),
  ),
};
```

The source locale is imported normally; every other locale is a loader:

```ts
// components/basket/index.i18n.ts
import { copy as source } from "./en.copy";

export const translations = i18n.dictionary.defer({
  [Locale.En]: source,
  [Locale.Fr]: () => import("./fr.copy"),
  [Locale.De]: () => import("./de.copy"),
});
```

The source copy is the contract: a module missing a key, or using different tokens or output type, is a compile error at its `import()`, and leaving out a configured locale is a compile error too. Components don't change — `i18n.useI18n(translations)` returns the same typed `copy`.

Avoid one app-wide module per language: it brings back the monolithic bundle that colocated copy exists to prevent, ships every screen's strings to every screen, and turns each copy change into a merge conflict. One small module per component per locale keeps each chunk as small as the component it serves. For copy shared between components, see [Sharing copy](#sharing-copy).

### Sharing copy

A copy module's `copy` is a plain object, so it spreads exactly like an inline dictionary input (see [Common copy](#common-copy)). Keep shared microcopy in its own directory, one module per locale, and spread each into the matching locale of a component:

```
components/
├── common/
│   ├── en.copy.ts
│   ├── fr.copy.ts
│   └── de.copy.ts
└── basket/
    ├── en.copy.tsx
    ├── fr.copy.tsx
    └── de.copy.tsx
```

```ts
// components/common/fr.copy.ts
export const copy = {
  cancel: i18n.constant("Annuler"),
  back: i18n.constant("Retour"),
};
```

```tsx
// components/basket/fr.copy.tsx
import { copy as common } from "../common/fr.copy";

export const copy = {
  ...common,
  // listed after the spread, so it overrides common's `back`
  back: i18n.constant("Retour au panier"),
  checkout: i18n.constant("Commander"),
};
```

The last key wins, in both the value and the type. Spreading several modules works the same way: `{ ...common, ...forms, checkout: … }`.

Spread keys are part of the contract too. The source module (`en.copy.tsx`) spreads `../common/en.copy`, so a translation that forgets its own spread is missing `cancel` and `back`, which is a compile error at its `import()`. Spread the **same locale's** module: the types can't tell `common/en.copy` from `common/fr.copy`, so spreading the wrong one compiles and shows English copy to French users.

A shared module spread into a deferred locale is downloaded with that locale, not up front. Bundlers put it in its own chunk when several components spread it, so it's fetched once.

Import shared modules statically rather than with `await import(...)`. A top-level `await` does work — the locale's `import()` only resolves once the module and everything it awaits have loaded, so `intl.loaded` and `intl.error` cover the nested import too — but it's worse on every count:

- **Slower** — the nested file is only requested after the outer one has downloaded and run, two requests back to back instead of one parallel fetch.
- **Less portable** — Metro / Hermes (React Native) don't support top-level `await`, and Vite and webpack need a modern enough build target.
- **Unnecessary** — a static import inside a deferred module is already deferred with it.

Never load copy inside a function in a copy module (`async function load() { … }`): the module counts as loaded before that work finishes, so `intl.loaded` turns `true` too early and nothing re-renders when it completes.

A deferred locale is imported the first time a component renders it — a French user never downloads `de.copy`. Until it arrives, `copy` holds placeholders shaped by the source copy (`""` for constants, `() => ""` for templates), then every component using it re-renders. `useI18n(...)` tells you where loading is:

- `intl.loaded` — `false` while the active locale's module is still loading.
- `intl.error` — whatever the import rejected with, or `undefined`. The placeholders stay.

```tsx
function Checkout() {
  const intl = i18n.useI18n(translations);
  const { locale } = i18n.useLocale();

  if (intl.error) {
    return <Button onClick={() => translations.load(locale)}>Retry</Button>;
  }
  return <Button loading={!intl.loaded}>{intl.copy.checkout}</Button>;
}
```

A failed module is never re-imported on its own — retry it with `translations.load(locale)`, after which `intl.error` clears and the copy appears. `load()` also preloads: call it when a user hovers a language picker so the switch renders without a blank frame.

Keep each `import("./fr.copy")` specifier a string literal, so Vite, webpack and Metro can split every module into its own chunk. One-locale `i18n.constant(value)` / `i18n.template(formatter)` entries are only for copy modules — putting one in an inline `i18n.dictionary({...})` is a compile error, since it covers a single locale.

## Testing helper

`i18n.withLocale(locale, element)` wraps any React element in the provider, bound to the given locale. It returns a `ReactElement` you can pass straight to your renderer of choice — no wrapper boilerplate, no separate `<Provider>` import in every test file:

```tsx
import { render, screen } from "@testing-library/react";
import { i18n } from "./i18n";
import { Welcome } from "./Welcome";

it("greets in French", () => {
  render(i18n.withLocale(Locale.Fr, <Welcome name="Imogen" />));
  expect(screen.getByRole("heading")).toHaveTextContent("Bonjour, Imogen");
});

it("greets in German", () => {
  render(i18n.withLocale(Locale.De, <Welcome name="Imogen" />));
  expect(screen.getByRole("heading")).toHaveTextContent("Hallo, Imogen");
});
```

For [async copy](#async-copy), `await` the locale's `load()` before rendering so the first render already has the copy:

```tsx
import { translations } from "./index.i18n";

it("checks out in French", async () => {
  await translations.load(Locale.Fr);
  render(i18n.withLocale(Locale.Fr, <Checkout />));
  expect(screen.getByRole("button")).toHaveTextContent("Commander");
});
```

`locale` is typed against your configured locale union, so passing an unsupported locale is a compile error. The helper is just `createElement(this.Provider, { locale }, element)` under the hood — no dependency on `@testing-library/react`, so it composes with any React renderer (RTL, `react-test-renderer`, Ink, etc.).
