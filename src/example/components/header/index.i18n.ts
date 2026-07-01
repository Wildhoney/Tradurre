import { Locale } from "../../types";
import { i18n } from "../../utils";

export const dictionary = i18n.dictionary({
  appTitle: i18n.constant({
    [Locale.En]: "Tradurre · Coffee Menu",
    [Locale.Fr]: "Tradurre · Carte des Cafés",
    [Locale.De]: "Tradurre · Kaffeekarte",
    [Locale.It]: "Tradurre · Menù del Caffè",
    [Locale.Es]: "Tradurre · Carta de Cafés",
    [Locale.Ar]: "Tradurre · قائمة القهوة",
    [Locale.Ja]: "Tradurre · コーヒーメニュー",
    [Locale.Ru]: "Tradurre · Меню кофе",
    [Locale.Uk]: "Tradurre · Меню кави",
    [Locale.Ka]: "Tradurre · ყავის მენიუ",
    [Locale.Zh]: "Tradurre · 咖啡菜单",
  }),
  tagline: i18n.constant({
    [Locale.En]: "Tiny, type-safe i18n for React — demonstrated on caffeine.",
    [Locale.Fr]: "Un i18n compact et typé pour React — illustré à la caféine.",
    [Locale.De]:
      "Schlankes, typsicheres i18n für React — am Koffein demonstriert.",
    [Locale.It]:
      "Un i18n compatto e tipizzato per React — dimostrato con caffeina.",
    [Locale.Es]:
      "Un i18n compacto y tipado para React — demostrado con cafeína.",
    [Locale.Ar]: "i18n صغير وآمن من ناحية الأنواع لـ React — موضّح بالكافيين.",
    [Locale.Ja]: "Reactのための小さくて型安全なi18n — コーヒーで実演。",
    [Locale.Ru]: "Компактная типобезопасная i18n для React — на примере кофе.",
    [Locale.Uk]: "Компактна типобезпечна i18n для React — на прикладі кави.",
    [Locale.Ka]:
      "მცირე, ტიპურად უსაფრთხო i18n React-ისთვის — კოფეინზე ნაჩვენები.",
    [Locale.Zh]: "小巧、类型安全的 React i18n — 以咖啡为例。",
  }),
  languageLabel: i18n.constant({
    [Locale.En]: "Language",
    [Locale.Fr]: "Langue",
    [Locale.De]: "Sprache",
    [Locale.It]: "Lingua",
    [Locale.Es]: "Idioma",
    [Locale.Ar]: "اللغة",
    [Locale.Ja]: "言語",
    [Locale.Ru]: "Язык",
    [Locale.Uk]: "Мова",
    [Locale.Ka]: "ენა",
    [Locale.Zh]: "语言",
  }),
});
