/**
 * Factory pairing a locale-membership type guard with a candidate-matching
 * detector, both closed over the configured locale list.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @param locales - Configured locale list.
 * @param fallback - Locale returned by `detect()` when no candidate
 * matches.
 * @returns An object exposing `detect` and `isLocale`.
 */
export function makeDetect<L extends string>(
  locales: readonly L[],
  fallback: L,
) {
  /**
   * Type guard narrowing an arbitrary string to the locale union `L`.
   *
   * @param value - Candidate string.
   * @returns Whether `value` matches one of the configured locales.
   */
  function isLocale(value: string): value is L {
    return (locales as readonly string[]).includes(value);
  }

  /**
   * Picks the first locale from a candidate list that matches a configured
   * locale, preferring the primary tag (e.g. `fr-CA` → `fr`) over the exact
   * code. When `requested` is omitted, candidates come from
   * `navigator.languages` (or `navigator.language`).
   *
   * @param requested - Optional explicit list of BCP-47 candidates. Use this
   * when the locale shouldn't come from `navigator` — cookies, query strings,
   * server-rendered headers, user preferences.
   * @returns The first matching configured locale, or `fallback` if none
   * matches.
   */
  function detect(requested?: readonly string[]): L {
    const candidates =
      requested ?? readNavigatorLanguages() ?? ([] as readonly string[]);
    for (const candidate of candidates) {
      if (typeof candidate !== "string") continue;
      const dash = candidate.indexOf("-");
      const primary = dash === -1 ? candidate : candidate.substring(0, dash);
      if (isLocale(primary)) return primary;
      if (isLocale(candidate)) return candidate;
    }
    return fallback;
  }

  return { detect, isLocale };
}

/**
 * Reads candidate locales from the host's `navigator` object — guarded
 * against non-browser environments and against `navigator.languages` being
 * unavailable (in which case it falls back to the singleton
 * `navigator.language`).
 *
 * @returns A read-only list of language tags, or `undefined` when no source
 * is available.
 */
function readNavigatorLanguages(): readonly string[] | undefined {
  if (typeof navigator === "undefined") return undefined;
  if (Array.isArray(navigator.languages)) return navigator.languages;
  if (typeof navigator.language === "string") return [navigator.language];
  return undefined;
}
