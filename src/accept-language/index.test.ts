import { describe, expect, it } from "vitest";

import { acceptLanguage } from "./index.ts";

describe("acceptLanguage()", () => {
  it("emits the favourite bare and weights the rest by descending quality", () => {
    expect(acceptLanguage(["fr", "en", "de"])).toBe(
      "fr, en;q=0.667, de;q=0.333",
    );
  });

  it("returns a single tag with no quality weight", () => {
    expect(acceptLanguage(["en"])).toBe("en");
  });

  it("weights a two-locale list at the midpoint", () => {
    expect(acceptLanguage(["en", "fr"])).toBe("en, fr;q=0.5");
  });

  it("keeps every weight strictly between 0 and 1", () => {
    const header = acceptLanguage(["a", "b", "c", "d", "e"]);
    const qualities = header
      .split(", ")
      .slice(1)
      .map((part) => Number(part.split(";q=")[1]));
    expect(qualities.every((q) => q > 0 && q < 1)).toBe(true);
    expect(qualities).toEqual([...qualities].sort((a, b) => b - a));
  });

  it("preserves region subtags verbatim", () => {
    expect(acceptLanguage(["fr-CA", "en-GB"])).toBe("fr-CA, en-GB;q=0.5");
  });

  it("collapses duplicates to their first occurrence", () => {
    expect(acceptLanguage(["en", "fr", "en"])).toBe("en, fr;q=0.5");
  });

  it("drops blank and whitespace-only entries", () => {
    expect(acceptLanguage([" en ", "", "  ", "fr"])).toBe("en, fr;q=0.5");
  });

  it("returns an empty string when there are no usable entries", () => {
    expect(acceptLanguage([])).toBe("");
    expect(acceptLanguage(["", "   "])).toBe("");
  });
});
