import { describe, expect, it, vi } from "vitest";

import { installPolyfills } from "./index.ts";

describe("installPolyfills()", () => {
  it("invokes a slot's polyfill, then data for every configured locale", async () => {
    const calls: string[] = [];
    await installPolyfills(["xx-unsupported"], {
      pluralRules: {
        polyfill: vi.fn(async () => {
          calls.push("pluralRules:polyfill");
        }),
        data: vi.fn(async (locale: string) => {
          calls.push(`pluralRules:data:${locale}`);
        }),
      },
    });
    expect(calls).toEqual([
      "pluralRules:polyfill",
      "pluralRules:data:xx-unsupported",
    ]);
  });

  it("runs each formatter's loader independently", async () => {
    const calls: string[] = [];
    const slot = (name: string) => ({
      polyfill: async () => {
        calls.push(`${name}:polyfill`);
      },
      data: async (locale: string) => {
        calls.push(`${name}:data:${locale}`);
      },
    });
    await installPolyfills(["xx-unsupported"], {
      pluralRules: slot("pluralRules"),
      numberFormat: slot("numberFormat"),
      dateTimeFormat: slot("dateTimeFormat"),
    });
    expect(calls).toContain("pluralRules:polyfill");
    expect(calls).toContain("numberFormat:polyfill");
    expect(calls).toContain("dateTimeFormat:polyfill");
    expect(calls).toContain("pluralRules:data:xx-unsupported");
    expect(calls).toContain("numberFormat:data:xx-unsupported");
    expect(calls).toContain("dateTimeFormat:data:xx-unsupported");
  });

  it("loads data for every configured locale, not just the active one", async () => {
    const loaded: string[] = [];
    await installPolyfills(["xx-unsupported", "yy-unsupported"], {
      pluralRules: {
        polyfill: async () => {},
        data: async (locale: string) => {
          loaded.push(locale);
        },
      },
    });
    expect(loaded.sort()).toEqual(["xx-unsupported", "yy-unsupported"]);
  });

  it("propagates errors from a loader", async () => {
    await expect(
      installPolyfills(["xx-unsupported"], {
        pluralRules: {
          polyfill: async () => {
            throw new Error("boom");
          },
          data: async () => {},
        },
      }),
    ).rejects.toThrow("boom");
  });

  it("is a no-op for a slot whose formatter is already natively supported", async () => {
    const calls: string[] = [];
    await installPolyfills(["en", "fr", "de"], {
      pluralRules: {
        polyfill: vi.fn(async () => {
          calls.push("polyfill");
        }),
        data: vi.fn(async (locale: string) => {
          calls.push(`data:${locale}`);
        }),
      },
    });
    expect(calls).toEqual([]);
  });

  it("is a no-op when no polyfills object is supplied, even for unsupported locales", async () => {
    await expect(installPolyfills(["xx-unsupported"])).resolves.toBeUndefined();
  });

  it("is a no-op for an absent slot", async () => {
    const calls: string[] = [];
    await installPolyfills(["xx-unsupported"], {
      pluralRules: {
        polyfill: async () => {
          calls.push("pluralRules:polyfill");
        },
        data: async () => {},
      },
    });
    expect(calls).toEqual(["pluralRules:polyfill"]);
  });
});
