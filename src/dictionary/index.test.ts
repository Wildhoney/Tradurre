import { describe, expect, it } from "vitest";

import { makeDictionary } from "./index.ts";
import { makeConstant, makeTemplate } from "../template/index.ts";

const dictionary = makeDictionary<"en" | "fr">();
const template = makeTemplate<"en" | "fr">();
const constant = makeConstant<"en" | "fr">();

describe("Dictionary.resolve()", () => {
  it("returns the active locale's value for Constant entries as a property", () => {
    const dict = dictionary({
      signIn: constant({ en: "Sign in", fr: "Se connecter" }),
    });
    expect(dict.resolve("en").copy.signIn).toBe("Sign in");
    expect(dict.resolve("fr").copy.signIn).toBe("Se connecter");
  });

  it("invokes function-form Constant variants with locale-bound format", () => {
    const dict = dictionary({
      brands: constant({
        en: ({ format }) => format.list().format(["Rex", "Ada"]),
        fr: ({ format }) => format.list().format(["Rex", "Ada"]),
      }),
    });
    expect(dict.resolve("en").copy.brands).toBe("Rex and Ada");
    expect(dict.resolve("fr").copy.brands).toBe("Rex et Ada");
  });

  it("invokes Template variants with the supplied args", () => {
    const dict = dictionary({
      greet: template<{ name: string }>({
        en({ tokens }) {
          return `Hello, ${tokens.name}`;
        },
        fr({ tokens }) {
          return `Bonjour, ${tokens.name}`;
        },
      }),
    });
    expect(dict.resolve("en").copy.greet({ name: "Imogen" })).toBe(
      "Hello, Imogen",
    );
    expect(dict.resolve("fr").copy.greet({ name: "Phoebe" })).toBe(
      "Bonjour, Phoebe",
    );
  });

  it("passes format.number to Template formatters", () => {
    const dict = dictionary({
      balance: template<{ amount: number }>({
        en({ tokens, format }) {
          return format
            .number({ style: "currency", currency: "USD" })
            .format(tokens.amount);
        },
        fr({ tokens, format }) {
          return format
            .number({ style: "currency", currency: "EUR" })
            .format(tokens.amount);
        },
      }),
    });
    expect(dict.resolve("en").copy.balance({ amount: 1234.5 })).toBe(
      "$1,234.50",
    );
    expect(dict.resolve("fr").copy.balance({ amount: 1234.5 })).toBe(
      new Intl.NumberFormat("fr", {
        style: "currency",
        currency: "EUR",
      }).format(1234.5),
    );
  });

  it("passes format.dateTime to Template formatters", () => {
    const dict = dictionary({
      sentOn: template<{ when: Date }>({
        en({ tokens, format }) {
          return format.dateTime({ dateStyle: "short" }).format(tokens.when);
        },
        fr({ tokens, format }) {
          return format.dateTime({ dateStyle: "short" }).format(tokens.when);
        },
      }),
    });
    const when = new Date("2026-06-24T00:00:00Z");
    expect(dict.resolve("en").copy.sentOn({ when })).toBe(
      new Intl.DateTimeFormat("en", { dateStyle: "short" }).format(when),
    );
  });

  it("passes format.plural to Template formatters", () => {
    const dict = dictionary({
      items: template<{ count: number }>({
        en({ tokens, format }) {
          const category = format.plural().select(tokens.count);
          return category === "one" ? "1 item" : `${tokens.count} items`;
        },
        fr({ tokens, format }) {
          const category = format.plural().select(tokens.count);
          return category === "one"
            ? `${tokens.count} article`
            : `${tokens.count} articles`;
        },
      }),
    });
    expect(dict.resolve("en").copy.items({ count: 1 })).toBe("1 item");
    expect(dict.resolve("en").copy.items({ count: 5 })).toBe("5 items");
  });

  it("exposes the full Intl surface on format", () => {
    const dict = dictionary({
      probe: template<Record<string, never>>({
        en({ format }) {
          return [
            format.number() instanceof Intl.NumberFormat,
            format.dateTime() instanceof Intl.DateTimeFormat,
            format.plural() instanceof Intl.PluralRules,
            format.collator() instanceof Intl.Collator,
            format.displayNames({ type: "language" }) instanceof
              Intl.DisplayNames,
            format.duration() instanceof Intl.DurationFormat,
            format.list() instanceof Intl.ListFormat,
            format.relativeTime() instanceof Intl.RelativeTimeFormat,
            format.segmenter() instanceof Intl.Segmenter,
          ].join(",");
        },
        fr({ format }) {
          return format.displayNames({ type: "region" }).of("GB") ?? "";
        },
      }),
    });
    expect(dict.resolve("en").copy.probe({})).toBe(
      "true,true,true,true,true,true,true,true,true",
    );
  });

  it("memoises the resolved bundle per locale", () => {
    const dict = dictionary({
      signIn: constant({ en: "Sign in", fr: "Se connecter" }),
    });
    expect(dict.resolve("en")).toBe(dict.resolve("en"));
    expect(dict.resolve("en")).not.toBe(dict.resolve("fr"));
  });

  it("exposes the active locale as an Intl.Locale instance", () => {
    const arDictionary = makeDictionary<"en" | "ar">();
    const arTemplate = makeTemplate<"en" | "ar">();
    const dict = arDictionary({
      greet: arTemplate<{ name: string }>({
        en({ tokens }) {
          return `Hello, ${tokens.name}`;
        },
        ar({ tokens }) {
          return `مرحباً، ${tokens.name}`;
        },
      }),
    });

    const en = dict.resolve("en");
    expect(en.locale).toBeInstanceOf(Intl.Locale);
    expect(en.locale.language).toBe("en");
    expect(en.locale.getTextInfo().direction).toBe("ltr");

    const ar = dict.resolve("ar");
    expect(ar.locale.language).toBe("ar");
    expect(ar.locale.getTextInfo().direction).toBe("rtl");
  });
});
