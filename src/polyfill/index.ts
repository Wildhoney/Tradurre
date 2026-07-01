import type { Polyfills } from "../types.ts";

type IntlFormatterName = "PluralRules" | "NumberFormat" | "DateTimeFormat";

/**
 * Installs polyfills for every formatter whose runtime support is missing
 * for the configured locales. Each formatter is independent — a missing
 * loader for one is silently skipped, and a present loader runs only when
 * the native check fails for that specific formatter.
 *
 * Called automatically by the {@link I18n} constructor; rejection is
 * swallowed because failing to polyfill should never crash the app boot.
 *
 * Loaders are user-supplied so the library never contains a dynamic
 * `import()` with a non-literal specifier — Metro (React Native) refuses to
 * bundle such calls at transform time. Vite/webpack consumers pass a loader
 * whose `data()` does the template-literal import on their side, where
 * `/* @vite-ignore *\/` (or webpack's equivalent) actually applies; Metro
 * consumers switch on `locale` to static specifiers.
 *
 * @param locales - Locale codes whose CLDR data must be available.
 * @param polyfills - Per-formatter loaders. Each slot is independent and
 * may be omitted; omitting all of them (or omitting `polyfills` entirely)
 * makes this function a no-op.
 * @returns A promise resolving once every present loader completes.
 */
export async function installPolyfills<L extends string>(
  locales: readonly L[],
  polyfills?: Polyfills<L>,
): Promise<void> {
  if (!polyfills) return;
  await Promise.all([
    install("PluralRules", locales, polyfills.plural),
    install("NumberFormat", locales, polyfills.number),
    install("DateTimeFormat", locales, polyfills.dateTime),
  ]);
}

async function install<L extends string>(
  formatter: IntlFormatterName,
  locales: readonly L[],
  loader: Polyfills<L>[keyof Polyfills<L>],
): Promise<void> {
  if (!loader) return;
  if (isNativelySupported(formatter, locales)) return;
  await loader.polyfill();
  await Promise.all(locales.map((locale) => loader.data(locale)));
}

/**
 * Checks whether `Intl[formatter]` is available and supports every
 * requested locale natively — returns `false` if `Intl` is missing, if the
 * named formatter is missing, or if any locale isn't covered.
 */
function isNativelySupported(
  formatter: IntlFormatterName,
  locales: readonly string[],
): boolean {
  if (typeof Intl === "undefined") return false;
  const ctor = (
    Intl as unknown as Record<string, IntlFormatterCtor | undefined>
  )[formatter];
  if (typeof ctor === "undefined") return false;
  try {
    const supported = ctor.supportedLocalesOf(locales);
    return supported.length === locales.length;
  } catch {
    return false;
  }
}

type IntlFormatterCtor = {
  supportedLocalesOf(locales: readonly string[]): readonly string[];
};
