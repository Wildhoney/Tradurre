import { act, render, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { makeProvider } from "./index.tsx";

describe("Provider / useLocale()", () => {
  it("provides the controlled locale when `locale` prop is set", () => {
    const { Provider, useLocale } = makeProvider<"en" | "fr">("en");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider locale="fr">{children}</Provider>
    );
    const { result } = renderHook(() => useLocale(), { wrapper });
    expect(result.current.locale).toBe("fr");
  });

  it("uses the configured initial locale when no `locale` prop is given", () => {
    const { Provider, useLocale } = makeProvider<"en" | "fr">("en");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider>{children}</Provider>
    );
    const { result } = renderHook(() => useLocale(), { wrapper });
    expect(result.current.locale).toBe("en");
  });

  it("lets consumers override the locale via setLocale", () => {
    const { Provider, useLocale } = makeProvider<"en" | "fr">("en");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider>{children}</Provider>
    );
    const { result } = renderHook(() => useLocale(), { wrapper });
    expect(result.current.locale).toBe("en");
    act(() => result.current.setLocale("fr"));
    expect(result.current.locale).toBe("fr");
  });

  it("invokes onLocaleChange when setLocale runs", () => {
    const { Provider, useLocale } = makeProvider<"en" | "fr">("en");
    const seen: string[] = [];
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider onLocaleChange={(next) => seen.push(next)}>{children}</Provider>
    );
    const { result } = renderHook(() => useLocale(), { wrapper });
    act(() => result.current.setLocale("fr"));
    expect(seen).toEqual(["fr"]);
  });

  it("exposes the active locale as a single-entry preference list by default", () => {
    const { Provider, useLocale } = makeProvider<"en" | "fr">("en");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider>{children}</Provider>
    );
    const { result } = renderHook(() => useLocale(), { wrapper });
    expect(result.current.locales).toEqual(["en"]);
  });

  it("sets a ranked preference list via setLocales, with the head active", () => {
    const { Provider, useLocale } = makeProvider<"en" | "fr" | "de">("en");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider>{children}</Provider>
    );
    const { result } = renderHook(() => useLocale(), { wrapper });
    act(() => result.current.setLocales(["fr", "de", "en"]));
    expect(result.current.locale).toBe("fr");
    expect(result.current.locales).toEqual(["fr", "de", "en"]);
  });

  it("collapses the preference list to a single entry via setLocale", () => {
    const { Provider, useLocale } = makeProvider<"en" | "fr" | "de">("en");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider>{children}</Provider>
    );
    const { result } = renderHook(() => useLocale(), { wrapper });
    act(() => result.current.setLocales(["fr", "de", "en"]));
    act(() => result.current.setLocale("de"));
    expect(result.current.locale).toBe("de");
    expect(result.current.locales).toEqual(["de"]);
  });

  it("ignores an empty preference list so the active locale is never empty", () => {
    const { Provider, useLocale } = makeProvider<"en" | "fr">("en");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider>{children}</Provider>
    );
    const { result } = renderHook(() => useLocale(), { wrapper });
    act(() => result.current.setLocales(["fr"]));
    act(() => result.current.setLocales([]));
    expect(result.current.locale).toBe("fr");
    expect(result.current.locales).toEqual(["fr"]);
  });

  it("uses the controlled `locales` prop, ignoring `locale`", () => {
    const { Provider, useLocale } = makeProvider<"en" | "fr" | "de">("en");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider locale="en" locales={["fr", "de"]}>
        {children}
      </Provider>
    );
    const { result } = renderHook(() => useLocale(), { wrapper });
    expect(result.current.locale).toBe("fr");
    expect(result.current.locales).toEqual(["fr", "de"]);
  });

  it("notifies both callbacks when setLocales runs", () => {
    const { Provider, useLocale } = makeProvider<"en" | "fr" | "de">("en");
    const locale: string[] = [];
    const locales: string[][] = [];
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider
        onLocaleChange={(next) => locale.push(next)}
        onLocalesChange={(next) => locales.push([...next])}
      >
        {children}
      </Provider>
    );
    const { result } = renderHook(() => useLocale(), { wrapper });
    act(() => result.current.setLocales(["fr", "en"]));
    expect(locale).toEqual(["fr"]);
    expect(locales).toEqual([["fr", "en"]]);
  });

  it("notifies onLocalesChange when setLocale runs", () => {
    const { Provider, useLocale } = makeProvider<"en" | "fr">("en");
    const seen: string[][] = [];
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider onLocalesChange={(next) => seen.push([...next])}>
        {children}
      </Provider>
    );
    const { result } = renderHook(() => useLocale(), { wrapper });
    act(() => result.current.setLocale("fr"));
    expect(seen).toEqual([["fr"]]);
  });

  it("serialises the preference list to an Accept-Language header", () => {
    const { Provider, useLocale } = makeProvider<"en" | "fr" | "de">("en");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider>{children}</Provider>
    );
    const { result } = renderHook(() => useLocale(), { wrapper });
    act(() => result.current.setLocales(["fr", "en", "de"]));
    expect(result.current.acceptLanguage()).toBe("fr, en;q=0.667, de;q=0.333");
  });

  it("keeps acceptLanguage() in sync when setLocale collapses the list", () => {
    const { Provider, useLocale } = makeProvider<"en" | "fr" | "de">("en");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <Provider>{children}</Provider>
    );
    const { result } = renderHook(() => useLocale(), { wrapper });
    act(() => result.current.setLocales(["fr", "en", "de"]));
    act(() => result.current.setLocale("de"));
    expect(result.current.acceptLanguage()).toBe("de");
  });

  it("throws when useLocale is called outside the provider", () => {
    const { useLocale } = makeProvider<"en" | "fr">("en");
    function Probe() {
      useLocale();
      return null;
    }
    expect(() => render(<Probe />)).toThrow(/outside of an <i18n.Provider>/);
  });
});
