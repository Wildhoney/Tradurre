import { act, render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { I18n } from "./index.ts";

const i18n = new I18n({ locales: ["en", "fr", "de"] as const });

const translations = i18n.dictionary({
  greet: i18n.template<{ name: string }>({
    en({ tokens }) {
      return `Hello, ${tokens.name}`;
    },
    fr({ tokens }) {
      return `Bonjour, ${tokens.name}`;
    },
    de({ tokens }) {
      return `Hallo, ${tokens.name}`;
    },
  }),
  signIn: i18n.constant({
    en: "Sign in",
    fr: "Se connecter",
    de: "Anmelden",
  }),
  balance: i18n.template<{ amount: number }>({
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
    de({ tokens, format }) {
      return `Saldo: ${format
        .number({ style: "currency", currency: "EUR" })
        .format(tokens.amount)}`;
    },
  }),
});

function wrap(locale?: "en" | "fr" | "de") {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <i18n.Provider locale={locale}>{children}</i18n.Provider>;
  };
}

describe("new I18n()", () => {
  it("exposes the configured locales", () => {
    expect(i18n.locales).toEqual(["en", "fr", "de"]);
  });

  it("rejects an empty locales list", () => {
    expect(() => new I18n({ locales: [] })).toThrow(/at least one locale/i);
  });

  it("resolves Constant entries via the hooks as properties", () => {
    const { result } = renderHook(() => i18n.useI18n(translations), {
      wrapper: wrap("fr"),
    });
    expect(result.current.copy.signIn).toBe("Se connecter");
  });

  it("resolves Template entries with args", () => {
    const { result } = renderHook(() => i18n.useI18n(translations), {
      wrapper: wrap("de"),
    });
    expect(result.current.copy.greet({ name: "Imogen" })).toBe("Hallo, Imogen");
  });

  it("passes locale-bound format to Template formatters", () => {
    const { result } = renderHook(() => i18n.useI18n(translations), {
      wrapper: wrap("en"),
    });
    expect(result.current.copy.balance({ amount: 1234.5 })).toBe(
      "Balance: $1,234.50",
    );
  });

  it("exposes the active locale as an Intl.Locale on the resolved bundle", () => {
    const { result } = renderHook(() => i18n.useI18n(translations), {
      wrapper: wrap("de"),
    });
    expect(result.current.locale).toBeInstanceOf(Intl.Locale);
    expect(result.current.locale.language).toBe("de");
  });

  it("lets the consumer override the locale at runtime", () => {
    const { result } = renderHook(
      () => ({
        handle: i18n.useLocale(),
        intl: i18n.useI18n(translations),
      }),
      { wrapper: wrap() },
    );
    expect(result.current.intl.copy.signIn).toBe("Sign in");
    act(() => result.current.handle.setLocale("fr"));
    expect(result.current.intl.copy.signIn).toBe("Se connecter");
  });

  it("matches the detected locale against the supported set", () => {
    expect(i18n.detect(["de-CH", "en-GB"])).toBe("de");
    expect(i18n.detect(["es-ES"])).toBe("en");
    expect(i18n.isLocale("fr")).toBe(true);
    expect(i18n.isLocale("ja")).toBe(false);
  });

  it("rejects partial Template variants at the type level", () => {
    // @ts-expect-error - de and fr locales missing
    i18n.template<{ name: string }>({
      en({ tokens }) {
        return `Hello, ${tokens.name}`;
      },
    });
  });

  it("rejects partial Constant variants at the type level", () => {
    // @ts-expect-error - fr and de locales missing
    i18n.constant({ en: "Sign in" });
  });

  it("forces every variant site to cover a newly added locale", () => {
    const wider = new I18n({ locales: ["en", "fr", "de", "es"] as const });

    // @ts-expect-error - es locale missing after widening the union
    wider.template<{ name: string }>({
      en: ({ tokens }) => `Hello, ${tokens.name}`,
      fr: ({ tokens }) => `Bonjour, ${tokens.name}`,
      de: ({ tokens }) => `Hallo, ${tokens.name}`,
    });

    // @ts-expect-error - es locale missing after widening the union
    wider.constant({ en: "Sign in", fr: "Se connecter", de: "Anmelden" });
  });
});

describe("string-first output typing", () => {
  it("resolves constants and templates to a plain string by default", () => {
    const { result } = renderHook(() => i18n.useI18n(translations), {
      wrapper: wrap("en"),
    });
    // These annotations compile only if the resolved values are `string`
    // (not `ReactNode`) — exactly what plain-string attributes such as
    // `alt`, `title`, and `aria-label` require.
    const label: string = result.current.copy.signIn;
    const greeting: string = result.current.copy.greet({ name: "Immy" });
    expect(label).toBe("Sign in");
    expect(greeting).toBe("Hello, Immy");
  });

  it("supports token-less string templates via <void, string>", () => {
    const dict = i18n.dictionary({
      close: i18n.template<void, string>({
        en: () => "Close",
        fr: () => "Fermer",
        de: () => "Schließen",
      }),
    });
    const { result } = renderHook(() => i18n.useI18n(dict), {
      wrapper: wrap("fr"),
    });
    const label: string = result.current.copy.close();
    expect(label).toBe("Fermer");
  });

  it("rejects JSX in a string-default constant at the type level", () => {
    i18n.constant({
      // @ts-expect-error - string is the default output; use constant<ReactNode> for JSX
      en: <b>Hi</b>,
      fr: "Salut",
      de: "Hallo",
    });
  });

  it("rejects JSX in a string-default template at the type level", () => {
    i18n.template<{ name: string }>({
      // @ts-expect-error - string is the default output; use template<Args, ReactNode> for JSX
      en: ({ tokens }) => <b>{tokens.name}</b>,
      fr: ({ tokens }) => `Bonjour, ${tokens.name}`,
      de: ({ tokens }) => `Hallo, ${tokens.name}`,
    });
  });

  it("renders JSX when the output type is widened to ReactNode", () => {
    const dict = i18n.dictionary({
      badge: i18n.constant<ReactNode>({
        en: <strong data-testid="badge">New</strong>,
        fr: <strong data-testid="badge">Nouveau</strong>,
        de: <strong data-testid="badge">Neu</strong>,
      }),
      tagged: i18n.template<{ count: number }, ReactNode>({
        en: ({ tokens }) => <em data-testid="tagged">{tokens.count}</em>,
        fr: ({ tokens }) => <em data-testid="tagged">{tokens.count}</em>,
        de: ({ tokens }) => <em data-testid="tagged">{tokens.count}</em>,
      }),
    });
    function Probe() {
      const intl = i18n.useI18n(dict);
      return (
        <>
          {intl.copy.badge}
          {intl.copy.tagged({ count: 3 })}
        </>
      );
    }
    const { getByTestId } = render(i18n.withI18n("en", <Probe />));
    expect(getByTestId("badge")).toHaveTextContent("New");
    expect(getByTestId("tagged")).toHaveTextContent("3");
  });
});

describe("i18n.withI18n()", () => {
  function LocaleProbe() {
    const { locale } = i18n.useLocale();
    return <span data-testid="locale">{locale}</span>;
  }

  function GreetProbe({ name }: { name: string }) {
    const intl = i18n.useI18n(translations);
    return <span data-testid="greet">{intl.copy.greet({ name })}</span>;
  }

  it("renders the element inside a Provider bound to the given locale", () => {
    const { getByTestId } = render(i18n.withI18n("fr", <LocaleProbe />));
    expect(getByTestId("locale")).toHaveTextContent("fr");
  });

  it("makes useI18n resolve against the chosen locale", () => {
    const { getByTestId } = render(
      i18n.withI18n("de", <GreetProbe name="Imogen" />),
    );
    expect(getByTestId("greet")).toHaveTextContent("Hallo, Imogen");
  });
});
