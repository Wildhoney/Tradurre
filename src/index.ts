export { I18n } from "./i18n/index.ts";
export { Dictionary, makeDictionary } from "./dictionary/index.ts";
export { Template, makeTemplate } from "./template/index.ts";
export { installPluralRulesPolyfill } from "./polyfill/index.ts";
export { Mode } from "./types.ts";
export type {
  AtLeastOne,
  Entry,
  FallbackEvent,
  FallbackHandler,
  Formatter,
  Helpers,
  I18nConfig,
  Input,
  LocaleHandle,
  Merged,
  PolyfillLoader,
  Resolved,
  ResolvedDictionary,
  Variants,
} from "./types.ts";
