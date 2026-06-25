import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { makeDetect } from "./index.ts";

const locales = ["en", "fr", "de"] as const;
const { detect, isLocale } = makeDetect<"en" | "fr" | "de">(locales, "en");

describe("detect()", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("matches the first supported BCP-47 primary tag", () => {
    expect(detect(["de-CH", "en-GB"])).toBe("de");
  });

  it("matches exact locale codes when no primary-tag match", () => {
    expect(detect(["fr"])).toBe("fr");
  });

  it("falls back to the configured fallback when nothing matches", () => {
    expect(detect(["es-ES", "ja-JP"])).toBe("en");
  });

  it("ignores non-string entries in the candidate list", () => {
    expect(
      detect([42 as unknown as string, undefined as unknown as string, "fr"]),
    ).toBe("fr");
  });

  it("reads navigator.languages when no candidates are supplied", () => {
    vi.stubGlobal("navigator", {
      languages: ["fr-CA", "en-US"],
      language: "fr-CA",
    });
    expect(detect()).toBe("fr");
  });

  it("reads navigator.language when navigator.languages is missing", () => {
    vi.stubGlobal("navigator", { language: "de-CH" });
    expect(detect()).toBe("de");
  });

  it("falls back when navigator is undefined", () => {
    vi.stubGlobal("navigator", undefined);
    expect(detect()).toBe("en");
  });

  it("falls back when navigator has no language signals at all", () => {
    vi.stubGlobal("navigator", {});
    expect(detect()).toBe("en");
  });
});

describe("isLocale()", () => {
  it("returns true for supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(true);
  });

  it("returns false for unsupported locales", () => {
    expect(isLocale("es")).toBe(false);
  });
});

describe("detect() with hyphenated locales", () => {
  it("matches the exact candidate when the locale set itself contains a region", () => {
    const { detect } = makeDetect<"fr-CA" | "en">(
      ["fr-CA", "en"] as const,
      "en",
    );
    expect(detect(["fr-CA"])).toBe("fr-CA");
  });
});
