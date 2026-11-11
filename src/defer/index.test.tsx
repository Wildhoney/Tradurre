import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { I18n } from "../i18n/index.ts";
import { copy as source } from "./fixture/en.copy.tsx";
import { i18n } from "./fixture/i18n.ts";
import { translations } from "./fixture/index.i18n.ts";

type FrenchModule = typeof import("./fixture/fr.copy.tsx");

function deferred() {
  let settle: (module: FrenchModule) => void = () => {};
  let fail: (error: unknown) => void = () => {};
  const promise = new Promise<FrenchModule>((resolve, reject) => {
    settle = resolve;
    fail = reject;
  });
  return { promise, settle, fail };
}

function Basket({ dictionary = translations }) {
  const intl = i18n.useI18n(dictionary);
  return (
    <p
      data-loaded={String(intl.loaded)}
      data-error={intl.error instanceof Error ? intl.error.message : ""}
    >
      {intl.copy.continue}|{intl.copy.price({ amount: 2.5 })}|
      {intl.copy.items({ count: 3 })}
    </p>
  );
}

describe("i18n.dictionary.defer()", () => {
  it("renders the bundled locale immediately", () => {
    render(i18n.withLocale("en", <Basket />));
    const paragraph = screen.getByRole("paragraph");
    expect(paragraph.dataset.loaded).toBe("true");
    expect(paragraph.textContent).toBe("Continue|£2.50|3 items");
  });

  it("shows placeholders until a deferred locale loads, then its copy", async () => {
    render(i18n.withLocale("fr", <Basket />));
    expect(screen.getByRole("paragraph").textContent).toBe("||");
    expect(screen.getByRole("paragraph").dataset.loaded).toBe("false");
    await act(() => translations.load("fr"));
    const paragraph = screen.getByRole("paragraph");
    expect(paragraph.dataset.loaded).toBe("true");
    expect(paragraph.textContent).toBe("Continuer|2,50 €|3 articles");
    expect(paragraph.querySelector("b")?.textContent).toBe("3 articles");
  });

  it("imports each deferred locale once, sharing concurrent requests", async () => {
    const loader = vi.fn(() => import("./fixture/fr.copy.tsx"));
    const dictionary = i18n.dictionary.defer({ en: source, fr: loader });
    await Promise.all([dictionary.load("fr"), dictionary.load("fr")]);
    await dictionary.load("fr");
    await dictionary.load("en");
    expect(loader).toHaveBeenCalledTimes(1);
  });

  it("exposes a failed import, never retries on its own, and recovers on load()", async () => {
    const first = deferred();
    const loader = vi
      .fn<() => Promise<FrenchModule>>()
      .mockReturnValueOnce(first.promise)
      .mockImplementation(() => import("./fixture/fr.copy.tsx"));
    const dictionary = i18n.dictionary.defer({ en: source, fr: loader });

    const { rerender } = render(
      i18n.withLocale("fr", <Basket dictionary={dictionary} />),
    );
    await act(async () => first.fail(new Error("offline")));
    rerender(i18n.withLocale("fr", <Basket dictionary={dictionary} />));
    const paragraph = screen.getByRole("paragraph");
    expect(paragraph.dataset.error).toBe("offline");
    expect(paragraph.textContent).toBe("||");
    expect(loader).toHaveBeenCalledTimes(1);

    await act(() => dictionary.load("fr"));
    expect(screen.getByRole("paragraph").dataset.error).toBe("");
    expect(screen.getByRole("paragraph").textContent).toBe(
      "Continuer|2,50 €|3 articles",
    );
  });

  it("keeps the placeholder bundle stable across renders while loading", () => {
    const pending = deferred();
    const dictionary = i18n.dictionary.defer({
      en: source,
      fr: () => pending.promise,
    });
    expect(dictionary.resolve("fr")).toBe(dictionary.resolve("fr"));
  });

  it("requires at least one bundled locale", () => {
    expect(() =>
      i18n.dictionary.defer({
        en: () => import("./fixture/en.copy.tsx"),
        fr: () => import("./fixture/fr.copy.tsx"),
      } as never),
    ).toThrow("needs at least one bundled locale");
  });
});

describe("spreading copy modules", () => {
  it("merges another module's copy, with later keys overriding it", async () => {
    await translations.load("fr");
    const english = translations.resolve("en").copy;
    const french = translations.resolve("fr").copy;
    expect([english.cancel, english.back]).toEqual([
      "Cancel",
      "Back to basket",
    ]);
    expect([french.cancel, french.back]).toEqual([
      "Annuler",
      "Retour au panier",
    ]);
  });

  it("includes spread keys in the placeholders while loading", () => {
    const dictionary = i18n.dictionary.defer({
      en: source,
      fr: () => new Promise<never>(() => {}),
    });
    const placeholder = dictionary.resolve("fr").copy;
    expect([placeholder.cancel, placeholder.back]).toEqual(["", ""]);
  });
});

describe("eager dictionaries", () => {
  it("are always loaded with no error", () => {
    const dictionary = i18n.dictionary({
      ok: i18n.constant({ en: "OK", fr: "D'accord" }),
    });
    const bundle = dictionary.resolve("fr");
    expect(bundle.loaded).toBe(true);
    expect(bundle.error).toBeUndefined();
    expect(bundle.copy.ok).toBe("D'accord");
  });
});

describe("one-locale constants", () => {
  const instance = new I18n({ locales: ["en"] as const });

  function resolve<Out>(entry: ReturnType<typeof instance.constant<Out>>) {
    const dictionary = instance.dictionary.defer({ en: { entry } });
    return dictionary.resolve("en").copy.entry;
  }

  it("accept strings, format functions, JSX, arrays and null", () => {
    expect(resolve(instance.constant("Hi"))).toBe("Hi");
    expect(
      resolve(instance.constant(({ format }) => format.number().format(1000))),
    ).toBe("1,000");
    const element = <b>Hi</b>;
    expect(resolve(instance.constant<ReactNode>(element))).toBe(element);
    expect(resolve(instance.constant<ReactNode>(["a", "b"]))).toEqual([
      "a",
      "b",
    ]);
    expect(resolve(instance.constant<ReactNode>(null))).toBeNull();
  });

  it("treat an object with non-locale keys as a single value", () => {
    const value = { label: "Hi" };
    expect(resolve(instance.constant(value as never))).toBe(value);
  });
});
