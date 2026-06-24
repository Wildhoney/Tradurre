# Reacti8n

Tiny, type-safe, message-first i18n for React. No DSL, no ICU runtime, no codegen — translations are plain TypeScript functions.

- **Plain TS / JS** — interpolation is template literals; `Intl.NumberFormat`, `Intl.DateTimeFormat`, and `Intl.PluralRules` are injected per formatter.
- **Type-safe arguments** — `template<{ name: string }>({...})` enforces the argument shape across every locale.
- **Message-first nesting** — each message lives next to its translations.
- **At-least-one locale** — the type system rejects empty entries; the runtime walks the configured `locales` list in order to find a defined variant.
- **Fallback observability** — register a callback fired whenever the requested locale falls back to another.
- **No runtime DSL** — drop the `intl-messageformat` parser entirely.

## Install

```sh
pnpm add reacti8n
# optional, for CLDR plural data on older runtimes:
pnpm add @formatjs/intl-pluralrules @formatjs/intl-localematcher
```

Peer dep: `react >= 18`.

## Setup

Configure once in your app entry. The class returns a typed instance scoped to your locale list — no module-level globals. The fallback chain is the order of `locales`: lookup walks left-to-right and stops at the first defined variant. The type system requires at least one locale per message, so a message that is undefined in every locale is a compile error.

```ts
// src/i18n.ts
import { I18n } from "reacti8n";

export const i18n = new I18n({
  locales: ["en", "fr", "de"] as const,
  onFallback: (event) => {
    // event: { key, requested, resolved }
    // Fires whenever a key resolves to a non-requested locale,
    // or to null when the key is missing everywhere.
    Sentry.captureMessage(
      `i18n fallback: ${event.key} (${event.requested} → ${event.resolved ?? "null"})`,
      "warning",
    );
  },
});
```

Detect the active locale at boot and wrap your app in the provider. `detectLocale()` reads `navigator.languages` (or `navigator.language`), matches each candidate's primary tag against the configured `locales`, and returns the first hit — falling back to `locales[0]` if nothing matches. Pass explicit candidates if you have them from a cookie, query string, or server header.

```tsx
// src/main.tsx
import { i18n } from "./i18n";

const detected = i18n.detectLocale();              // from navigator
// const detected = i18n.detectLocale(["fr-CA"]);  // from explicit candidates

createRoot(document.getElementById("root")!).render(
  <i18n.LocaleProvider locale={detected}>
    <App />
  </i18n.LocaleProvider>,
);
```

The `locale` prop on `<LocaleProvider>` is controlled — pass it to drive the active locale externally (from a router, a cookie, a user preference). Omit it and the provider manages locale state internally, starting at `locales[0]`. Consumers can switch the locale at any time:

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
      {i18n.locales.map((supportedLocale) => (
        <option key={supportedLocale} value={supportedLocale}>
          {supportedLocale}
        </option>
      ))}
    </select>
  );
}
```

`i18n.isLocale(value)` is a type guard returning `value is L`, so `next` narrows to the locale union inside the branch — no casts needed.

## Defining messages

A dictionary is a flat record of message-id → variants. Each entry is either a plain `{ en, fr, ... }` map or an `i18n.template<Args>({ ... })` wrapper for messages that take arguments. Template formatters receive `(args, helpers)` — `helpers` is locale-bound and exposes `numberFormat`, `dateTimeFormat`, and `pluralRules` factories that return memoisable `Intl` instances.

```ts
import { i18n } from "./i18n";

export const translations = i18n.dictionary({
  // Plain strings per locale.
  ok: { en: "OK", fr: "OK", de: "OK" },

  // Function variants with explicit args (recommended).
  greet: i18n.template<{ name: string }>({
    en: ({ name }) => `Hello, ${name}`,
    fr: ({ name }) => `Bonjour, ${name}`,
    de: ({ name }) => `Hallo, ${name}`,
  }),

  // Plurals via Intl.PluralRules, exposed through helpers.
  items: i18n.template<{ count: number }>({
    en: ({ count }, helpers) => {
      const category = helpers.pluralRules().select(count);
      return category === "one" ? "1 item" : `${count} items`;
    },
    fr: ({ count }, helpers) => {
      const category = helpers.pluralRules().select(count);
      return category === "one" ? `${count} article` : `${count} articles`;
    },
    de: ({ count }, helpers) => {
      const category = helpers.pluralRules().select(count);
      return category === "one" ? "1 Eintrag" : `${count} Einträge`;
    },
  }),

  // Currency formatting via helpers.
  balance: i18n.template<{ amount: number }>({
    en: ({ amount }, helpers) =>
      `Balance: ${helpers
        .numberFormat({ style: "currency", currency: "USD" })
        .format(amount)}`,
    fr: ({ amount }, helpers) =>
      `Solde : ${helpers
        .numberFormat({ style: "currency", currency: "EUR" })
        .format(amount)}`,
  }),

  // Partial coverage is fine — the runtime walks the locale list
  // in order; the type system requires at least one to be defined.
  auRevoir: { fr: "Au revoir" },
});
```

## Consuming messages

```tsx
import { i18n } from "./i18n";
import { translations } from "./translations";

export function Welcome({ name }: { name: string }) {
  const t = i18n.useI18n(translations);
  return (
    <section>
      <h1>{t.greet({ name })}</h1>
      <p>{t.ok}</p>
    </section>
  );
}
```

Plain string entries become strings on the resolved object. Template entries become callables typed with their declared `Args` — the `helpers` are bound automatically based on the active locale.

## Fallback observability

A common operational worry with i18n is "missing translations shipped quietly." Reacti8n calls the `onFallback` handler (registered on `new I18n()`) every time a dictionary entry resolves to a non-requested locale, or to `null` when the key is missing entirely.

```ts
type FallbackEvent<L> = {
  key: string;       // the message id that fell back
  requested: L;      // the locale the consumer asked for
  resolved: L | null; // the locale actually used (null = nothing found anywhere)
};
```

Pipe these into Sentry / Datadog / your logger of choice:

```ts
new I18n({
  locales: ["en", "fr", "de"] as const,
  onFallback: ({ key, requested, resolved }) => {
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

## License

MIT — see [LICENSE](./LICENSE).
