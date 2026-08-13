import { describe, expect, it } from "vitest";

import { analyze, analyzeKey } from "./index.ts";

describe("analyze", () => {
  it("treats a plain string as a constant with no tokens", () => {
    expect(analyze("Hello from the API export")).toEqual({
      hasArguments: false,
      tokens: {},
    });
  });

  it("infers a bare argument as string", () => {
    expect(analyze("Hello {name}")).toEqual({
      hasArguments: true,
      tokens: { name: "string" },
    });
  });

  it("infers a bare numeric-looking argument as string (no ICU type given)", () => {
    expect(analyze("You have {count} messages")).toEqual({
      hasArguments: true,
      tokens: { count: "string" },
    });
  });

  it("types a select argument as string", () => {
    const icu =
      "{isAdmin, select, true {Administrator access} false {Standard access} other {Standard access}}";
    expect(analyze(icu)).toEqual({
      hasArguments: true,
      tokens: { isAdmin: "string" },
    });
  });

  it("types a plural argument as number and ignores the # placeholder", () => {
    const icu =
      "{count, plural, =0 {No notifications} one {# notification} other {# notifications}}";
    expect(analyze(icu)).toEqual({
      hasArguments: true,
      tokens: { count: "number" },
    });
  });

  it("maps number/date/time keywords to number/Date", () => {
    expect(analyze("{amount, number}").tokens).toEqual({ amount: "number" });
    expect(analyze("{when, date, long}").tokens).toEqual({ when: "Date" });
    expect(analyze("{at, time, short}").tokens).toEqual({ at: "Date" });
    expect(analyze("{n, selectordinal, one {#st} other {#th}}").tokens).toEqual(
      { n: "number" },
    );
  });

  it("recurses into plural/select branches to find nested arguments", () => {
    const icu =
      "{count, plural, one {# item for {name}} other {# items for {name}}}";
    expect(analyze(icu).tokens).toEqual({ count: "number", name: "string" });
  });

  it("does not treat an apostrophe-quoted brace as an argument", () => {
    expect(analyze("The '{'literal'}' braces, {real}")).toEqual({
      hasArguments: true,
      tokens: { real: "string" },
    });
  });

  it("treats a doubled apostrophe as a literal and keeps scanning", () => {
    expect(analyze("It''s {name}").tokens).toEqual({ name: "string" });
  });

  it("consumes an opaque number skeleton without inventing tokens", () => {
    expect(analyze("{price, number, ::currency/GBP}").tokens).toEqual({
      price: "number",
    });
  });

  it("collects arguments nested inside a tag", () => {
    expect(analyze("<b>{name}</b>").tokens).toEqual({ name: "string" });
  });
});

describe("analyzeKey", () => {
  it("is a template if any locale variant carries arguments", () => {
    expect(analyzeKey(["Log out", "Se déconnecter"]).hasArguments).toBe(false);
    expect(analyzeKey(["Log out", "Salut {name}"]).hasArguments).toBe(true);
  });

  it("widens a bare string argument to number when another locale types it", () => {
    const merged = analyzeKey([
      "You have {count} messages",
      "{count, plural, one {# message} other {# messages}}",
    ]);
    expect(merged.tokens).toEqual({ count: "number" });
  });

  it("merges disjoint tokens across locales", () => {
    const merged = analyzeKey(["{greeting}", "{name} — {greeting}"]);
    expect(merged.tokens).toEqual({ greeting: "string", name: "string" });
  });

  it("keeps the specific type when a typed variant precedes a bare one", () => {
    const merged = analyzeKey([
      "{count, plural, one {#} other {#}}",
      "You have {count} messages",
    ]);
    expect(merged.tokens).toEqual({ count: "number" });
  });
});

describe("analyze edge cases", () => {
  it("ignores an argument with an empty name", () => {
    expect(analyze("{}")).toEqual({ hasArguments: false, tokens: {} });
  });

  it("treats a lone apostrophe as a literal character", () => {
    expect(analyze("can't {name}").tokens).toEqual({ name: "string" });
  });

  it("handles an unterminated quote to end of string", () => {
    expect(analyze("'{ unterminated")).toEqual({
      hasArguments: false,
      tokens: {},
    });
  });
});
