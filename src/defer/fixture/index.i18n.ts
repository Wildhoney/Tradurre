import { copy as source } from "./en.copy.tsx";
import { i18n } from "./i18n.ts";

export const translations = i18n.dictionary.defer({
  en: source,
  fr: () => import("./fr.copy.tsx"),
});

i18n.dictionary.defer({
  en: source,
  // @ts-expect-error a deferred module must match the source copy key for key
  fr: () => import("./broken.copy.ts"),
});

// @ts-expect-error every configured locale needs copy or a loader
i18n.dictionary.defer({ en: source });

i18n.dictionary({
  // @ts-expect-error one-locale entries belong in copy modules, not inline dictionaries
  ok: i18n.constant("OK"),
});

i18n.dictionary.defer({
  en: source,
  // @ts-expect-error forgetting to spread common copy drops keys the source has
  fr: () => import("./unspread.copy.tsx"),
});
