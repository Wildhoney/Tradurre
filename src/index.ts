export { I18n } from "./i18n";
export type { I18nConfig, ResolvedDictionary } from "./i18n";

export { Dictionary } from "./dictionary";
export type { FallbackEvent, FallbackHandler } from "./dictionary";
export { Template } from "./template";
export type { Helpers } from "./helpers";
export { installPluralRulesPolyfill } from "./polyfill";
export type { PolyfillLoader } from "./polyfill";
export type { LocaleHandle } from "./provider";
export type {
  AtLeastOne,
  Entry,
  Formatter,
  Input,
  Merged,
  Resolved,
  Variants,
} from "./types";
