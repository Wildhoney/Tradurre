import { describe, expect, it } from "vitest";

import { makeDictionary } from "./index.ts";
import { makeTemplate } from "../template/index.ts";

const dictionary = makeDictionary<"en" | "fr">();
const template = makeTemplate<"en" | "fr">();

describe("Dictionary.resolve()", () => {
  it("returns the active locale's variant for token-less templates", () => {
    const dict = dictionary({
      ok: template({ en: () => "OK", fr: () => "Accepter" }),
    });
    expect(dict.resolve("en").copy.ok()).toBe("OK");
    expect(dict.resolve("fr").copy.ok()).toBe("Accepter");
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

  it("passes locale-bound helpers to Template formatters", () => {
    const dict = dictionary({
      balance: template<{ amount: number }>({
        en({ tokens, helpers }) {
          return helpers
            .numberFormat({ style: "currency", currency: "USD" })
            .format(tokens.amount);
        },
        fr({ tokens, helpers }) {
          return helpers
            .numberFormat({ style: "currency", currency: "EUR" })
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

  it("supports dateTimeFormat via helpers in Template formatters", () => {
    const dict = dictionary({
      sentOn: template<{ when: Date }>({
        en({ tokens, helpers }) {
          return helpers
            .dateTimeFormat({ dateStyle: "short" })
            .format(tokens.when);
        },
        fr({ tokens, helpers }) {
          return helpers
            .dateTimeFormat({ dateStyle: "short" })
            .format(tokens.when);
        },
      }),
    });
    const when = new Date("2026-06-24T00:00:00Z");
    expect(dict.resolve("en").copy.sentOn({ when })).toBe(
      new Intl.DateTimeFormat("en", { dateStyle: "short" }).format(when),
    );
  });

  it("supports pluralRules via helpers in Template formatters", () => {
    const dict = dictionary({
      items: template<{ count: number }>({
        en({ tokens, helpers }) {
          const category = helpers.pluralRules().select(tokens.count);
          return category === "one" ? "1 item" : `${tokens.count} items`;
        },
        fr({ tokens, helpers }) {
          const category = helpers.pluralRules().select(tokens.count);
          return category === "one"
            ? `${tokens.count} article`
            : `${tokens.count} articles`;
        },
      }),
    });
    expect(dict.resolve("en").copy.items({ count: 1 })).toBe("1 item");
    expect(dict.resolve("en").copy.items({ count: 5 })).toBe("5 items");
  });

  it("memoises the resolved bundle per locale", () => {
    const dict = dictionary({
      ok: template({ en: () => "OK", fr: () => "Accepter" }),
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
