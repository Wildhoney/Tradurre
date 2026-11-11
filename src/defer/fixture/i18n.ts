import { I18n } from "../../i18n/index.ts";

export const i18n = new I18n({ locales: ["en", "fr"] as const });

export namespace Tokens {
  export type Price = { amount: number };
  export type Items = { count: number };
}
