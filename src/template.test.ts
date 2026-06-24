import { describe, expect, it } from "vitest";

import { makeHelpers } from "./helpers";
import { Template, makeTemplate } from "./template";

describe("Template", () => {
  it("stores the variants record on the instance", () => {
    const variants = {
      en({ tokens }: { tokens: { name: string } }) {
        return `Hi, ${tokens.name}`;
      },
    };
    const message = new Template<"en", { name: string }>(variants);
    expect(message.variants).toBe(variants);
  });
});

describe("makeTemplate()", () => {
  it("returns a template helper bound to the locale set", () => {
    const template = makeTemplate<"en" | "fr">();
    const message = template<{ name: string }>({
      en({ tokens }) {
        return `Hello, ${tokens.name}`;
      },
      fr({ tokens }) {
        return `Bonjour, ${tokens.name}`;
      },
    });
    expect(message).toBeInstanceOf(Template);
    expect(
      message.variants.en?.({ tokens: { name: "Imogen" }, helpers: makeHelpers("en") }),
    ).toBe("Hello, Imogen");
  });

  it("passes locale-bound helpers in the formatter payload", () => {
    const template = makeTemplate<"en" | "fr">();
    const message = template<{ amount: number }>({
      en({ tokens, helpers }) {
        return `Balance: ${helpers
          .numberFormat({ style: "currency", currency: "USD" })
          .format(tokens.amount)}`;
      },
    });
    expect(
      message.variants.en?.({
        tokens: { amount: 1234.5 },
        helpers: makeHelpers("en"),
      }),
    ).toBe("Balance: $1,234.50");
  });
});
