import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import type { ApplyOptions } from "../types.ts";
import { loadComponent } from "./index.ts";

const dirs: string[] = [];

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "tradurre-copy-"));
  dirs.push(dir);
  for (const [name, contents] of Object.entries(files)) {
    await writeFile(join(dir, name), contents);
  }
  return dir;
}

function optionsFor(cwd: string): ApplyOptions {
  return {
    cwd,
    copyFile: "*.copy.json",
    tsFile: "index.i18n.ts",
    typeFile: "types.ts",
    sourceLocale: "en",
    localePath: "./x",
    i18nPath: "./x",
  };
}

afterEach(async () => {
  await Promise.all(
    dirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })),
  );
});

describe("loadComponent", () => {
  it("merges the source locale with siblings, falling back per key", async () => {
    const dir = await fixture({
      "en.copy.json": JSON.stringify({
        greeting: "Hello",
        greet_name: "Hello {name}",
      }),
      "fr.copy.json": JSON.stringify({ greeting: "Bonjour" }),
      "index.i18n.ts": "// generated, not a copy file",
    });
    const component = await loadComponent(dir, optionsFor(dir));

    expect(component.locales.map((locale) => locale.code)).toEqual([
      "en",
      "fr",
    ]);
    expect(component.templateCount).toBe(1);

    const greeting = component.entries.find(
      (entry) => entry.key === "greeting",
    );
    expect(greeting?.kind).toBe("constant");
    expect(greeting?.variants).toEqual({ en: "Hello", fr: "Bonjour" });

    const greet = component.entries.find((entry) => entry.key === "greetName");
    expect(greet?.kind).toBe("template");
    expect(greet?.variants.fr).toBe("Hello {name}");
    if (greet?.kind === "template")
      expect(greet.tokens).toEqual({ name: "string" });
  });

  it("ignores keys a sibling adds beyond the source file", async () => {
    const dir = await fixture({
      "en.copy.json": JSON.stringify({ a: "A" }),
      "es.copy.json": JSON.stringify({ a: "A-es", extra: "ignored" }),
    });
    const component = await loadComponent(dir, optionsFor(dir));

    const entry = component.entries.find((candidate) => candidate.key === "a");
    expect(entry?.variants.en).toBe("A");
    expect(entry?.variants.es).toBe("A-es");
    expect(component.entries).toHaveLength(1);
  });

  it("rejects a copy file that is not a JSON object", async () => {
    const asArray = await fixture({
      "en.copy.json": JSON.stringify(["nope"]),
    });
    await expect(loadComponent(asArray, optionsFor(asArray))).rejects.toThrow(
      /must be a JSON object/,
    );

    const asNull = await fixture({ "en.copy.json": "null" });
    await expect(loadComponent(asNull, optionsFor(asNull))).rejects.toThrow(
      /must be a JSON object/,
    );
  });

  it("rejects a non-string value in the source or a sibling", async () => {
    const badSource = await fixture({
      "en.copy.json": JSON.stringify({ a: 123 }),
    });
    await expect(
      loadComponent(badSource, optionsFor(badSource)),
    ).rejects.toThrow(/must map to a string/);

    const badSibling = await fixture({
      "en.copy.json": JSON.stringify({ a: "A" }),
      "fr.copy.json": JSON.stringify({ a: {} }),
    });
    await expect(
      loadComponent(badSibling, optionsFor(badSibling)),
    ).rejects.toThrow(/must map to a string/);
  });
});
