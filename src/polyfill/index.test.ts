import { describe, expect, it, vi } from "vitest";

import { installPluralRulesPolyfill } from "./index.ts";

describe("installPluralRulesPolyfill()", () => {
  it("invokes the loader's polyfill, then data for each locale when natives are missing", async () => {
    const calls: string[] = [];
    await installPluralRulesPolyfill(["xx-unsupported"], {
      polyfill: vi.fn(async () => {
        calls.push("polyfill");
      }),
      data: vi.fn(async (locale: string) => {
        calls.push(`data:${locale}`);
      }),
    });
    expect(calls).toEqual(["polyfill", "data:xx-unsupported"]);
  });

  it("propagates errors from the polyfill loader", async () => {
    await expect(
      installPluralRulesPolyfill(["xx-unsupported"], {
        polyfill: async () => {
          throw new Error("boom");
        },
        data: async () => {},
      }),
    ).rejects.toThrow("boom");
  });

  it("is a no-op when the runtime already supports the configured locales", async () => {
    const calls: string[] = [];
    await installPluralRulesPolyfill(["en", "fr", "de"], {
      polyfill: vi.fn(async () => {
        calls.push("polyfill");
      }),
      data: vi.fn(async (locale: string) => {
        calls.push(`data:${locale}`);
      }),
    });
    expect(calls).toEqual([]);
  });
});
