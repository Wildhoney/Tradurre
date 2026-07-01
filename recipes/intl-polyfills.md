# Intl polyfills

`Intl.PluralRules`, `Intl.NumberFormat`, and `Intl.DateTimeFormat` ship natively in every modern browser, in Node ≥13, and in Hermes — so most apps need nothing here. If you have to support a runtime that lacks native support for some of your locales (older embedded webviews, exotic CI runtimes), pass a `polyfills` map to `new I18n({ ... })`. Each slot is independent; the constructor installs the engine and CLDR data only when — and only for the specific formatter where — the native check fails.

Loaders live in your code (not in Tradurre) on purpose. Bundlers handle dynamic-import specifiers differently — Vite and webpack tolerate template literals, Metro (React Native) rejects them at transform time — so the only sound contract is for the call site to decide. The `data` parameter is typed as your configured locale union, so a `switch (locale)` is exhaustive.

## Vite / webpack — template literals

```sh
pnpm add @formatjs/intl-pluralrules @formatjs/intl-numberformat @formatjs/intl-datetimeformat
```

```ts
new I18n({
  locales: ["en", "ar", "en-GB"] as const,
  polyfills: {
    plural: {
      async polyfill() {
        await import("@formatjs/intl-pluralrules/polyfill.js");
      },
      async data(locale) {
        await import(
          /* @vite-ignore */ `@formatjs/intl-pluralrules/locale-data/${locale}.js`
        );
      },
    },
    number: {
      async polyfill() {
        await import("@formatjs/intl-numberformat/polyfill.js");
      },
      async data(locale) {
        await import(
          /* @vite-ignore */ `@formatjs/intl-numberformat/locale-data/${locale}.js`
        );
      },
    },
    dateTime: {
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

## React Native (Metro)

Omit `polyfills` entirely — Hermes exposes all three `Intl` formatters natively for the locales it ships with:

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
    plural: {
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
