import type { ReactNode } from "react";

import type { Template } from "./template/index.ts";

export enum Mode {
  Loose = "loose",
  Strict = "strict",
}

export type Helpers = {
  numberFormat(options?: Intl.NumberFormatOptions): Intl.NumberFormat;
  dateTimeFormat(options?: Intl.DateTimeFormatOptions): Intl.DateTimeFormat;
  pluralRules(options?: Intl.PluralRulesOptions): Intl.PluralRules;
};

export type FormatterPayload<Args> = { tokens: Args; helpers: Helpers };

export type Formatter<Args> = (payload: FormatterPayload<Args>) => ReactNode;

export type AtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Omit<T, K>>;
}[keyof T];

export type Variants<
  L extends string,
  V,
  M extends Mode = Mode.Loose,
> = M extends Mode.Strict ? Record<L, V> : AtLeastOne<Record<L, V>>;

export type Entry<L extends string, M extends Mode = Mode.Loose> =
  | Template<L, unknown>
  | Variants<L, unknown, M>;

export type Input<L extends string, M extends Mode = Mode.Loose> = Record<
  string,
  Entry<L, M>
>;

export type Resolved<L extends string, E> =
  E extends Template<L, infer Args>
    ? (args: Args) => ReactNode
    : E extends Variants<L, infer V>
      ? V
      : E;

export type Merged<L extends string, D extends Input<L>> = {
  [K in keyof D]: Resolved<L, D[K]>;
};

export type LocaleHandle<L extends string> = {
  locale: L;
  setLocale(next: L): void;
};

export type FallbackEvent<L extends string> = {
  key: string;
  requested: L;
  resolved: L | null;
};

export type FallbackHandler<L extends string> = (
  event: FallbackEvent<L>,
) => void;

export type PolyfillLoader = {
  polyfill(): Promise<void>;
  data(locale: string): Promise<void>;
};

export type I18nConfig<L extends string> = {
  locales: readonly L[];
  onFallback?: FallbackHandler<L>;
};

export type ResolvedDictionary<L extends string, D extends Input<L>> = Merged<
  L,
  D
>;
