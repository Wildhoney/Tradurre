import type { PolyfillLoader } from "../types.ts";

const defaultLoader: PolyfillLoader = {
  async polyfill() {
    await import("@formatjs/intl-pluralrules/polyfill.js");
  },
  async data(locale: string) {
    await import(
      /* @vite-ignore */ `@formatjs/intl-pluralrules/locale-data/${locale}.js`
    );
  },
};

export async function installPluralRulesPolyfill(
  locales: readonly string[],
  loader: PolyfillLoader = defaultLoader,
): Promise<void> {
  if (isPluralRulesNativelySupported(locales)) return;
  await loader.polyfill();
  await Promise.all(locales.map((locale) => loader.data(locale)));
}

function isPluralRulesNativelySupported(locales: readonly string[]): boolean {
  if (typeof Intl === "undefined") return false;
  if (typeof Intl.PluralRules === "undefined") return false;
  try {
    const supported = Intl.PluralRules.supportedLocalesOf(locales);
    return supported.length === locales.length;
  } catch {
    return false;
  }
}
