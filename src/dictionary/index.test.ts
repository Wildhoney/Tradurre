import { describe, expect, it, vi } from "vitest";

import { Dictionary, makeDictionary } from "./index.ts";
import { makeTemplate } from "../template/index.ts";
import type { FallbackEvent } from "../types.ts";

const locales = ["en", "fr"] as const;
const dictionary = makeDictionary<"en" | "fr">(locales);
const template = makeTemplate<"en" | "fr">();

describe("Dictionary.resolve()", () => {
  it("returns the active locale's variant for plain string entries", () => {
    const dict = dictionary({
      ok: { en: "OK", fr: "Accepter" },
    });
    expect(dict.resolve("en").ok).toBe("OK");
    expect(dict.resolve("fr").ok).toBe("Accepter");
  });

  it("falls back to any defined locale when the active one is missing", () => {
    const dict = dictionary({
      auRevoir: { fr: "Au revoir" },
    });
    expect(dict.resolve("en").auRevoir).toBe("Au revoir");
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
    expect(dict.resolve("en").greet({ name: "Imogen" })).toBe("Hello, Imogen");
    expect(dict.resolve("fr").greet({ name: "Phoebe" })).toBe(
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
    expect(dict.resolve("en").balance({ amount: 1234.5 })).toBe("$1,234.50");
    expect(dict.resolve("fr").balance({ amount: 1234.5 })).toBe(
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
      }),
    });
    const when = new Date("2026-06-24T00:00:00Z");
    expect(dict.resolve("en").sentOn({ when })).toBe(
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
      }),
    });
    expect(dict.resolve("en").items({ count: 1 })).toBe("1 item");
    expect(dict.resolve("en").items({ count: 5 })).toBe("5 items");
  });

  it("falls back through locales for a Template missing the active variant", () => {
    const dict = dictionary({
      goodbye: template<{ name: string }>({
        en({ tokens }) {
          return `Goodbye, ${tokens.name}`;
        },
      }),
    });
    expect(dict.resolve("fr").goodbye({ name: "Imogen" })).toBe(
      "Goodbye, Imogen",
    );
  });

  it("memoises the resolved object per locale", () => {
    const dict = dictionary({ ok: { en: "OK", fr: "Accepter" } });
    expect(dict.resolve("en")).toBe(dict.resolve("en"));
    expect(dict.resolve("en")).not.toBe(dict.resolve("fr"));
  });

  it("returns null when no variant is defined for any locale", () => {
    const dict = new Dictionary<"en" | "fr", { broken: { en: string } }>(
      locales,
      // @ts-expect-error - exercising the runtime fallback for empty variants
      { broken: {} },
    );
    expect(dict.resolve("en").broken).toBeNull();
  });

  it("returns primitive entries as-is when they aren't Templates or objects", () => {
    const dict = new Dictionary<"en" | "fr", { stray: { en: number } }>(
      locales,
      // @ts-expect-error - exercising the runtime branch for non-Entry values
      { stray: 42 },
    );
    expect(dict.resolve("en").stray).toBe(42);
  });

  it("returns null from a Template when no variant is defined anywhere", () => {
    // @ts-expect-error - intentionally empty to exercise the resolve-null path
    const empty = template<{ name: string }>({});
    const dict = dictionary({ broken: empty });
    expect(dict.resolve("en").broken).toBeNull();
  });

  it("invokes onFallback when a Template misses the active locale", () => {
    const events: FallbackEvent<"en" | "fr">[] = [];
    const localDictionary = makeDictionary<"en" | "fr">(locales, (event) =>
      events.push(event),
    );
    const dict = localDictionary({
      goodbye: template<{ name: string }>({
        en({ tokens }) {
          return `Goodbye, ${tokens.name}`;
        },
      }),
    });
    (dict.resolve("fr").goodbye as (args: { name: string }) => string)({
      name: "Imogen",
    });
    expect(events).toEqual([
      { key: "goodbye", requested: "fr", resolved: "en" },
    ]);
  });

  it("invokes onFallback with resolved=null when no locale defines the key", () => {
    const events: FallbackEvent<"en" | "fr">[] = [];
    const dict = new Dictionary<"en" | "fr", { broken: { en: string } }>(
      locales,
      // @ts-expect-error - exercising the runtime fallback for empty variants
      { broken: {} },
      (event) => events.push(event),
    );
    expect(dict.resolve("en").broken).toBeNull();
    expect(events).toEqual([
      { key: "broken", requested: "en", resolved: null },
    ]);
  });

  it("does not invoke onFallback when the active locale's variant resolves", () => {
    const callback = vi.fn();
    const localDictionary = makeDictionary<"en" | "fr">(locales, callback);
    const dict = localDictionary({
      ok: { en: "OK", fr: "Accepter" },
    });
    dict.resolve("fr");
    expect(callback).not.toHaveBeenCalled();
  });
});
