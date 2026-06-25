import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { I18n } from "./index.ts";
import { Mode } from "../types.ts";

const i18n = new I18n({ locales: ["en", "fr", "de"] as const });

const translations = i18n.dictionary({
  greet: i18n.template<{ name: string }>({
    en({ tokens }) {
      return `Hello, ${tokens.name}`;
    },
    fr({ tokens }) {
      return `Bonjour, ${tokens.name}`;
    },
    de({ tokens }) {
      return `Hallo, ${tokens.name}`;
    },
  }),
  ok: { en: "OK", fr: "Accepter", de: "OK" },
  auRevoir: { fr: "Au revoir" },
  balance: i18n.template<{ amount: number }>({
    en({ tokens, helpers }) {
      return `Balance: ${helpers
        .numberFormat({ style: "currency", currency: "USD" })
        .format(tokens.amount)}`;
    },
    fr({ tokens, helpers }) {
      return `Solde : ${helpers
        .numberFormat({ style: "currency", currency: "EUR" })
        .format(tokens.amount)}`;
    },
  }),
});

function wrap(locale?: "en" | "fr" | "de") {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <i18n.Provider locale={locale}>{children}</i18n.Provider>;
  };
}

describe("new I18n()", () => {
  it("exposes the configured locales", () => {
    expect(i18n.locales).toEqual(["en", "fr", "de"]);
  });

  it("rejects an empty locales list", () => {
    expect(() => new I18n({ locales: [] })).toThrow(/at least one locale/i);
  });

  it("resolves plain string entries via the hooks", () => {
    const { result } = renderHook(() => i18n.useI18n(translations), {
      wrapper: wrap("fr"),
    });
    expect(result.current.ok).toBe("Accepter");
  });

  it("resolves Template entries with args", () => {
    const { result } = renderHook(() => i18n.useI18n(translations), {
      wrapper: wrap("de"),
    });
    expect(result.current.greet({ name: "Imogen" })).toBe("Hallo, Imogen");
  });

  it("passes locale-bound helpers to Template formatters", () => {
    const { result } = renderHook(() => i18n.useI18n(translations), {
      wrapper: wrap("en"),
    });
    expect(result.current.balance({ amount: 1234.5 })).toBe(
      "Balance: $1,234.50",
    );
  });

  it("falls back across locales when the active one is missing", () => {
    const { result } = renderHook(() => i18n.useI18n(translations), {
      wrapper: wrap("en"),
    });
    expect(result.current.auRevoir).toBe("Au revoir");
  });

  it("lets the consumer override the locale at runtime", () => {
    const { result } = renderHook(
      () => ({
        handle: i18n.useLocale(),
        translations: i18n.useI18n(translations),
      }),
      { wrapper: wrap() },
    );
    expect(result.current.translations.ok).toBe("OK");
    act(() => result.current.handle.setLocale("fr"));
    expect(result.current.translations.ok).toBe("Accepter");
  });

  it("matches the detected locale against the supported set", () => {
    expect(i18n.detect(["de-CH", "en-GB"])).toBe("de");
    expect(i18n.detect(["es-ES"])).toBe("en");
    expect(i18n.isLocale("fr")).toBe(true);
    expect(i18n.isLocale("ja")).toBe(false);
  });

  it("threads onFallback into the dictionary", () => {
    const events: {
      key: string;
      requested: "en" | "fr";
      resolved: "en" | "fr" | null;
    }[] = [];
    const scoped = new I18n({
      locales: ["en", "fr"] as const,
      onFallback: (event) => events.push(event),
    });
    const dict = scoped.dictionary({
      auRevoir: { fr: "Au revoir" },
    });
    const { result } = renderHook(() => scoped.useI18n(dict), {
      wrapper: ({ children }: { children: ReactNode }) => (
        <scoped.Provider locale="en">{children}</scoped.Provider>
      ),
    });
    expect(result.current.auRevoir).toBe("Au revoir");
    expect(events).toEqual([
      { key: "auRevoir", requested: "en", resolved: "fr" },
    ]);
  });
});

describe("new I18n() with Mode.Strict", () => {
  const strict = new I18n<"en" | "fr", Mode.Strict>({
    locales: ["en", "fr"] as const,
  });

  it("compiles when every locale defines a plain variant", () => {
    const dict = strict.dictionary({
      ok: { en: "OK", fr: "Accepter" },
    });
    expect(dict.resolve("en").ok).toBe("OK");
  });

  it("compiles when every locale defines a Template variant", () => {
    const dict = strict.dictionary({
      greet: strict.template<{ name: string }>({
        en({ tokens }) {
          return `Hello, ${tokens.name}`;
        },
        fr({ tokens }) {
          return `Bonjour, ${tokens.name}`;
        },
      }),
    });
    expect(dict.resolve("en").greet({ name: "Imogen" })).toBe("Hello, Imogen");
  });

  it("rejects partial plain variants at the type level", () => {
    // @ts-expect-error - fr locale is missing in strict mode
    strict.dictionary({ partial: { en: "OK" } });
  });

  it("rejects partial Template variants at the type level", () => {
    // @ts-expect-error - fr locale is missing in strict mode
    strict.template<{ name: string }>({
      en({ tokens }) {
        return `Hello, ${tokens.name}`;
      },
    });
  });
});
