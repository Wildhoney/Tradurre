import { I18n } from "reacti8n";

export enum Locale {
  En = "en",
  Fr = "fr",
  De = "de",
  It = "it",
  Es = "es",
  Ar = "ar",
  Ja = "ja",
  Ru = "ru",
  Uk = "uk",
  Ka = "ka",
  Zh = "zh",
}

export const i18n = new I18n({
  locales: [
    Locale.En,
    Locale.Fr,
    Locale.De,
    Locale.It,
    Locale.Es,
    Locale.Ar,
    Locale.Ja,
    Locale.Ru,
    Locale.Uk,
    Locale.Ka,
    Locale.Zh,
  ] as const,
});
