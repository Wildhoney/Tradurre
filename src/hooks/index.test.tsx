import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { makeHooks } from "./index.ts";
import { makeDictionary } from "../dictionary/index.ts";
import { makeTemplate } from "../template/index.ts";

const locales = ["en", "fr"] as const;
const dictionary = makeDictionary<"en" | "fr">(locales);
const template = makeTemplate<"en" | "fr">();

function fixed(locale: "en" | "fr") {
  return () => ({ locale });
}

describe("useI18n()", () => {
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

  it("resolves the dictionary for the active locale", () => {
    const { useI18n } = makeHooks<"en" | "fr">(fixed("fr"));
    const { result } = renderHook(() => useI18n(dict));
    expect(result.current.greet({ name: "Phoebe" })).toBe("Bonjour, Phoebe");
  });

  it("re-resolves when the active locale switches", () => {
    const { useI18n } = makeHooks<"en" | "fr">(fixed("en"));
    const { result } = renderHook(() => useI18n(dict));
    expect(result.current.greet({ name: "Imogen" })).toBe("Hello, Imogen");
  });
});
