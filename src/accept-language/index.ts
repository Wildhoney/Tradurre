/**
 * Serialises an ordered list of preferred locales into an HTTP
 * `Accept-Language` header value — the standard way to tell an API which
 * languages a user prefers, and in what order.
 *
 * The first entry is the favourite and is emitted bare (an implicit `q=1`);
 * each subsequent entry gets a strictly-decreasing quality weight in
 * `(0, 1)`, evenly spaced and rounded to three decimal places per
 * {@link https://www.rfc-editor.org/rfc/rfc9110#name-accept-language | RFC 9110}.
 * Blank entries are dropped and duplicates collapse to their first
 * occurrence, so the result is always a valid, minimal header.
 *
 * The function is pure and framework-agnostic — pair it with the `locales`
 * from `i18n.useLocale()` inside React, or call it from a `fetch` / `axios`
 * interceptor with any ranked list.
 *
 * @param locales - Preferred locales, most-preferred first (BCP-47 tags such
 * as `"en"` or `"fr-CA"`).
 * @returns The header value (e.g. `"fr, en;q=0.667, de;q=0.333"`), or `""`
 * when `locales` has no usable entries.
 *
 * @example
 * ```ts
 * const { locales } = i18n.useLocale();
 * await fetch("/api/report", {
 *   headers: { "Accept-Language": acceptLanguage(locales) },
 * });
 * // locales = ["fr", "en", "de"] → "fr, en;q=0.667, de;q=0.333"
 * ```
 */
export function acceptLanguage(locales: readonly string[]): string {
  const ranked: string[] = [];
  for (const locale of locales) {
    const tag = locale.trim();
    if (tag.length > 0 && !ranked.includes(tag)) ranked.push(tag);
  }

  const { length } = ranked;
  return ranked
    .map((tag, index) => {
      if (index === 0) return tag;
      const quality = Math.round((1 - index / length) * 1000) / 1000;
      return `${tag};q=${quality}`;
    })
    .join(", ");
}
