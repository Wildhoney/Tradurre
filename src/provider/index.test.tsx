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

  it("throws when useLocale is called outside the provider", () => {
    const { useLocale } = makeProvider<"en" | "fr">("en");
    function Probe() {
      useLocale();
      return null;
    }
    expect(() => render(<Probe />)).toThrow(/outside of an <i18n.Provider>/);
  });
});
