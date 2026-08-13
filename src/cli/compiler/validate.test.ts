import { describe, expect, it } from "vitest";

import { validateSyntax } from "./validate.ts";

describe("validateSyntax", () => {
  it("accepts a well-formed template expression", () => {
    const source =
      "i18n.template<Tokens.Greet>({ [Locale.En]({ tokens, format }) { void format; return `Hi ${tokens.name}`; } })";
    expect(validateSyntax(source)).toEqual([]);
  });

  it("accepts a plural formatter using format helpers", () => {
    const source =
      "i18n.template<Tokens.Count>({ [Locale.En]({ tokens, format }) { return format.select(format.plural().select(tokens.count), { one: `${tokens.count} item`, other: `${tokens.count} items` }); } })";
    expect(validateSyntax(source)).toEqual([]);
  });

  it("reports diagnostics for malformed source", () => {
    const errors = validateSyntax(
      "i18n.template<Tokens.Greet>({ [Locale.En]( { ",
    );
    expect(errors.length).toBeGreaterThan(0);
  });
});
