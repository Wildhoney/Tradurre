export function makeDetect<L extends string>(
  locales: readonly L[],
  fallback: L,
) {
  function isLocale(value: string): value is L {
    return (locales as readonly string[]).includes(value);
  }

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

function readNavigatorLanguages(): readonly string[] | undefined {
  if (typeof navigator === "undefined") return undefined;
  if (Array.isArray(navigator.languages)) return navigator.languages;
  if (typeof navigator.language === "string") return [navigator.language];
  return undefined;
}
