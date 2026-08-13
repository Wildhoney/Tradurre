import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { loadComponent } from "../copy/index.ts";
import { discover } from "../discover/index.ts";
import type { ApplyDeps, ApplyOptions, IcuCompiler } from "../types.ts";
import { apply } from "./index.ts";

const SOURCE = {
  api_export_greeting: "Hello from the API export",
  api_export_farewell: "Goodbye from the API export",
  api_export_personal_greeting: "Hello {name}",
  api_export_message_count: "You have {count} messages",
  api_export_account_access:
    "{isAdmin, select, true {Administrator access} false {Standard access} other {Standard access}}",
  api_export_notification_count:
    "{count, plural, =0 {No notifications} one {# notification} other {# notifications}}",
};

const fakeCompiler: IcuCompiler = {
  compile({ entry, locales }) {
    const reference = Object.keys(entry.tokens)
      .map((token) => `tokens.${token}`)
      .join(", ");
    const variants = locales
      .map(
        (locale) =>
          `    [Locale.${locale.member}]({ tokens, format }) { void format; return String([${reference}]); },`,
      )
      .join("\n");
    return Promise.resolve(
      `i18n.template<Tokens.${entry.typeName}>({\n${variants}\n  })`,
    );
  },
};

const roots: string[] = [];

async function fixture(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "tradurre-apply-"));
  roots.push(root);
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolute = join(root, relativePath);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, contents);
  }
  return root;
}

function makeDeps(): ApplyDeps {
  return {
    discover,
    loadComponent,
    readFileOrNull: (path) =>
      readFile(path, "utf8").then(
        (contents) => contents,
        () => null,
      ),
    writeFile: (path, contents) =>
      mkdir(dirname(path), { recursive: true }).then(() =>
        writeFile(path, contents),
      ),
  };
}

function optionsFor(
  cwd: string,
  overrides: Partial<ApplyOptions> = {},
): ApplyOptions {
  return {
    cwd,
    copyFile: "*.copy.json",
    tsFile: "index.i18n.ts",
    typeFile: "types.ts",
    sourceLocale: "en",
    localePath: "./src/locale",
    i18nPath: "./src/i18n",
    ...overrides,
  };
}

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("apply", () => {
  it("generates a dictionary and Tokens namespace from copy files", async () => {
    const dir = "src/components/card";
    const root = await fixture({
      [`${dir}/en.copy.json`]: JSON.stringify(SOURCE),
      [`${dir}/fr.copy.json`]: JSON.stringify({
        api_export_greeting: "Bonjour depuis l'export API",
      }),
      [`${dir}/es.copy.json`]: JSON.stringify({
        api_export_farewell: "Adiós desde la exportación API",
      }),
    });

    const result = await apply(optionsFor(root), fakeCompiler, makeDeps());

    expect(result.components).toHaveLength(1);
    expect(result.components[0]).toMatchObject({
      constants: 2,
      templates: 4,
      compiledTemplates: 4,
      typeFile: "types.ts",
    });

    const i18n = await readFile(join(root, dir, "index.i18n.ts"), "utf8");
    const types = await readFile(join(root, dir, "types.ts"), "utf8");

    // Constant with a real translation and a source-locale fallback.
    expect(i18n).toContain("apiExportGreeting: i18n.constant({");
    expect(i18n).toContain(`[Locale.Fr]: "Bonjour depuis l'export API",`);
    expect(i18n).toContain(`[Locale.Es]: "Hello from the API export",`); // es omitted → fallback

    // Templates, keyed by their Tokens type.
    expect(i18n).toContain(
      "apiExportNotificationCount: i18n.template<Tokens.ApiExportNotificationCount>({",
    );
    expect(i18n).toContain(
      "apiExportAccountAccess: i18n.template<Tokens.ApiExportAccountAccess>({",
    );

    // Inferred token types.
    expect(types).toContain("export namespace Tokens {");
    expect(types).toContain(
      "export type ApiExportPersonalGreeting = { name: string };",
    );
    expect(types).toContain(
      "export type ApiExportMessageCount = { count: string };",
    );
    expect(types).toContain(
      "export type ApiExportAccountAccess = { isAdmin: string };",
    );
    expect(types).toContain(
      "export type ApiExportNotificationCount = { count: number };",
    );

    // A best-effort header was emitted for the newly-created file.
    expect(i18n).toContain('import { Locale } from "../../locale";');
    expect(i18n).toContain('import type { Tokens } from "./types";');
  });

  it("is idempotent — a second run reproduces byte-for-byte", async () => {
    const dir = "src/components/card";
    const root = await fixture({
      [`${dir}/en.copy.json`]: JSON.stringify(SOURCE),
    });
    const options = optionsFor(root);

    await apply(options, fakeCompiler, makeDeps());
    const firstI18n = await readFile(join(root, dir, "index.i18n.ts"), "utf8");
    const firstTypes = await readFile(join(root, dir, "types.ts"), "utf8");

    await apply(options, fakeCompiler, makeDeps());
    expect(await readFile(join(root, dir, "index.i18n.ts"), "utf8")).toBe(
      firstI18n,
    );
    expect(await readFile(join(root, dir, "types.ts"), "utf8")).toBe(
      firstTypes,
    );
  });

  it("preserves a hand-written import header when modifying", async () => {
    const dir = "src/components/card";
    const root = await fixture({
      [`${dir}/en.copy.json`]: JSON.stringify({ greeting: "Hi" }),
      [`${dir}/index.i18n.ts`]:
        'import { Locale } from "../../custom/types";\n' +
        'import { i18n } from "../../custom/utils";\n\n' +
        "export const dictionary = i18n.dictionary({\n  stale: 1,\n});\n",
    });

    await apply(optionsFor(root), fakeCompiler, makeDeps());
    const i18n = await readFile(join(root, dir, "index.i18n.ts"), "utf8");
    expect(i18n).toContain('import { Locale } from "../../custom/types";');
    expect(i18n).not.toContain("stale: 1");
    expect(i18n).toContain("greeting: i18n.constant({");
  });

  it("falls back to a TODO constant when the compiler cannot compile a template", async () => {
    const dir = "src/components/card";
    const root = await fixture({
      [`${dir}/en.copy.json`]: JSON.stringify({ greet: "Hello {name}" }),
    });
    const failing: IcuCompiler = { compile: () => Promise.resolve(null) };

    const result = await apply(optionsFor(root), failing, makeDeps());
    expect(result.components[0]).toMatchObject({
      templates: 1,
      compiledTemplates: 0,
    });

    const i18n = await readFile(join(root, dir, "index.i18n.ts"), "utf8");
    expect(i18n).toContain("TODO(tradurre): could not compile ICU");
    expect(i18n).toContain("greet: i18n.constant({");
  });

  it("spreads ...common and injects its import when a common path is set", async () => {
    const dir = "src/components/card";
    const root = await fixture({
      [`${dir}/en.copy.json`]: JSON.stringify({ greeting: "Hi" }),
    });

    await apply(
      optionsFor(root, { commonPath: "./src/common.i18n" }),
      fakeCompiler,
      makeDeps(),
    );
    const i18n = await readFile(join(root, dir, "index.i18n.ts"), "utf8");
    expect(i18n).toContain("...common,");
    expect(i18n).toContain('import { common } from "../../common.i18n";');
  });

  it("processes every component the copy glob matches", async () => {
    const root = await fixture({
      "src/a/en.copy.json": JSON.stringify({ one: "One" }),
      "src/b/en.copy.json": JSON.stringify({ two: "Two" }),
    });

    const result = await apply(optionsFor(root), fakeCompiler, makeDeps());
    expect(result.components).toHaveLength(2);
    expect(result.components.map((component) => component.templates)).toEqual([
      0, 0,
    ]);
  });

  it("does not create an empty types file for a constants-only component", async () => {
    const dir = "src/components/header";
    const root = await fixture({
      [`${dir}/en.copy.json`]: JSON.stringify({ title: "Menu" }),
    });

    const result = await apply(optionsFor(root), fakeCompiler, makeDeps());
    expect(result.components[0]?.typeFile).toBeNull();
    await expect(
      readFile(join(root, dir, "types.ts"), "utf8"),
    ).rejects.toThrow();
  });
});
