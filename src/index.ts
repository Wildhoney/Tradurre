/**
 * Tradurre public API.
 *
 * The only module-level export is the {@link I18n} constructor. Every other
 * capability — `dictionary`, `template`, `useI18n`, `Provider`, `useLocale`,
 * `detect`, `isLocale`, `withI18n` — is reached through methods or fields on
 * an {@link I18n} instance. Serialising the preferred locales for your APIs
 * lives on the locale handle too: `useLocale().acceptLanguage()`.
 *
 * @packageDocumentation
 */

export { I18n } from "./i18n/index.ts";
