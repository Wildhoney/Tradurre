/**
 * Reacti8n public API.
 *
 * The only module-level exports are the {@link I18n} constructor and the
 * {@link Mode} enum. Every other capability — `dictionary`, `template`,
 * `useI18n`, `Provider`, `useLocale`, `detect`, `isLocale`, `withI18n` — is
 * reached through methods or fields on an {@link I18n} instance.
 *
 * @packageDocumentation
 */

export { I18n } from "./i18n/index.ts";
export { Mode } from "./types.ts";
