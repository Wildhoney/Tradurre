import type { PolyfillLoader } from "../types.ts";

/**
 * Default {@link PolyfillLoader} implementation — dynamically imports
 * `@formatjs/intl-pluralrules` plus CLDR data for each locale. Replaceable
 * in tests by passing a custom loader to {@link installPluralRulesPolyfill}.
 */
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

/**
 * Installs the `Intl.PluralRules` polyfill when the host runtime lacks
 * native support for every configured locale. No-op when native support is
 * complete.
 *
 * Called automatically by the {@link I18n} constructor; rejection is
 * swallowed because failing to polyfill should never crash the app boot.
 *
 * @param locales - Locale codes whose CLDR data must be available.
 * @param loader - Loader implementation. Defaults to the bundled
 * `@formatjs/intl-pluralrules` dynamic imports.
 * @returns A promise resolving once polyfill installation completes (or
 * immediately, when native support is already present).
 */
export async function installPluralRulesPolyfill(
  locales: readonly string[],
  loader: PolyfillLoader = defaultLoader,
): Promise<void> {
  if (isPluralRulesNativelySupported(locales)) return;
  await loader.polyfill();
  await Promise.all(locales.map((locale) => loader.data(locale)));
}

/**
 * Checks whether `Intl.PluralRules` is available and supports every
 * requested locale natively — returns `false` if `Intl` is missing, if
 * `PluralRules` is missing, or if any locale isn't covered.
 *
 * @param locales - Locale codes to test for native support.
 * @returns `true` when no polyfill is required.
 */
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
