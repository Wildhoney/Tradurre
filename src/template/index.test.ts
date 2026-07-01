import { describe, expect, it } from "vitest";

import { Template, makeTemplate } from "./index.ts";
import { makeFormat } from "../format/index.ts";

describe("Template", () => {
  it("stores the variants record on the instance", () => {
    const template = makeTemplate<"en">();
    const variants = {
      en({ tokens }: { tokens: { name: string } }) {
        return `Hi, ${tokens.name}`;
      },
    };
    const message = template<{ name: string }>(variants);
    expect(message).toBeInstanceOf(Template);
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
      message.variants.en?.({
        tokens: { name: "Imogen" },
        format: makeFormat("en"),
      }),
    ).toBe("Hello, Imogen");
  });

  it("passes locale-bound format in the formatter payload", () => {
    const template = makeTemplate<"en" | "fr">();
    const message = template<{ amount: number }>({
      en({ tokens, format }) {
        return `Balance: ${format
          .number({ style: "currency", currency: "USD" })
          .format(tokens.amount)}`;
      },
      fr({ tokens, format }) {
        return `Solde : ${format
          .number({ style: "currency", currency: "EUR" })
          .format(tokens.amount)}`;
      },
    });
    expect(
      message.variants.en?.({
        tokens: { amount: 1234.5 },
        format: makeFormat("en"),
      }),
    ).toBe("Balance: $1,234.50");
  });
});
