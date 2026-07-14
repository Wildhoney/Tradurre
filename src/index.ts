/**
 * Tradurre public API.
 *
 * The {@link I18n} constructor is the main entry point — every locale-scoped
 * capability (`dictionary`, `template`, `useI18n`, `Provider`, `useLocale`,
 * `detect`, `isLocale`, `withI18n`) is reached through methods or fields on an
 * instance. The one standalone export is {@link acceptLanguage}, a pure helper
 * that turns the preference list from `useLocale()` into an `Accept-Language`
 * header value for your APIs.
 *
 * @packageDocumentation
 */

export { acceptLanguage } from "./accept-language/index.ts";
export { I18n } from "./i18n/index.ts";
