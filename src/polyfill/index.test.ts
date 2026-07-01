import { describe, expect, it, vi } from "vitest";

import { installPolyfills } from "./index.ts";

describe("installPolyfills()", () => {
  it("invokes a slot's polyfill, then data for every configured locale", async () => {
    const calls: string[] = [];
    await installPolyfills(["xx-unsupported"], {
      plural: {
        polyfill: vi.fn(async () => {
          calls.push("plural:polyfill");
        }),
        data: vi.fn(async (locale: string) => {
          calls.push(`plural:data:${locale}`);
        }),
      },
    });
    expect(calls).toEqual(["plural:polyfill", "plural:data:xx-unsupported"]);
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
      plural: slot("plural"),
      number: slot("number"),
      dateTime: slot("dateTime"),
    });
    expect(calls).toContain("plural:polyfill");
    expect(calls).toContain("number:polyfill");
    expect(calls).toContain("dateTime:polyfill");
    expect(calls).toContain("plural:data:xx-unsupported");
    expect(calls).toContain("number:data:xx-unsupported");
    expect(calls).toContain("dateTime:data:xx-unsupported");
  });

  it("loads data for every configured locale, not just the active one", async () => {
    const loaded: string[] = [];
    await installPolyfills(["xx-unsupported", "yy-unsupported"], {
      plural: {
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
        plural: {
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
      plural: {
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
      plural: {
        polyfill: async () => {
          calls.push("plural:polyfill");
        },
        data: async () => {},
      },
    });
    expect(calls).toEqual(["plural:polyfill"]);
  });
});
