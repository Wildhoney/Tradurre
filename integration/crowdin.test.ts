import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { apply } from "../src/cli/apply/index.ts";
import { loadComponent } from "../src/cli/copy/index.ts";
import { discover } from "../src/cli/discover/index.ts";
import type { ApplyDeps, ApplyOptions, IcuCompiler } from "../src/cli/types.ts";

const token = process.env.CROWDIN_API_TOKEN;
const projectId = process.env.CROWDIN_PROJECT_ID;

const fakeCompiler: IcuCompiler = {
  compile({ entry, locales }) {
    const reference = Object.keys(entry.tokens)
      .map((name) => `tokens.${name}`)
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

async function fetchSourceStrings(): Promise<Record<string, string>> {
  const base = "https://api.crowdin.com/api/v2/projects";
  const response = await fetch(`${base}/${projectId ?? ""}/strings?limit=500`, {
    headers: { Authorization: `Bearer ${token ?? ""}` },
  });
  if (!response.ok) {
    throw new Error(
      `Crowdin API responded ${response.status} for project ${projectId}.`,
    );
  }
  const body = (await response.json()) as {
    data: { data: { identifier: string; text: string } }[];
  };
  return Object.fromEntries(
    body.data.map((row) => [row.data.identifier, row.data.text]),
  );
}

const suite = token && projectId ? describe : describe.skip;

suite("Crowdin → apply", () => {
  let root: string | undefined;

  afterAll(async () => {
    if (root) await rm(root, { recursive: true, force: true });
  });

  it("generates a dictionary and Tokens namespace from the live source strings", async () => {
    const strings = await fetchSourceStrings();
    expect(Object.keys(strings).length).toBeGreaterThan(0);

    root = await mkdtemp(join(tmpdir(), "tradurre-crowdin-"));
    const componentDir = join(root, "src/components/demo");
    await mkdir(componentDir, { recursive: true });
    await writeFile(
      join(componentDir, "en.copy.json"),
      JSON.stringify(strings, null, 2),
    );

    const options: ApplyOptions = {
      cwd: root,
      copyFile: "*.copy.json",
      tsFile: "index.i18n.ts",
      typeFile: "types.ts",
      sourceLocale: "en",
      localePath: "./src/i18n",
      i18nPath: "./src/i18n",
    };
    const deps: ApplyDeps = {
      discover,
      loadComponent,
      readFileOrNull: (path) =>
        readFile(path, "utf8").then(
          (text) => text,
          () => null,
        ),
      writeFile: (path, text) =>
        mkdir(dirname(path), { recursive: true }).then(() =>
          writeFile(path, text),
        ),
    };

    const result = await apply(options, fakeCompiler, deps);
    expect(result.components).toHaveLength(1);

    const i18n = await readFile(join(componentDir, "index.i18n.ts"), "utf8");
    expect(i18n).toContain("export const dictionary = i18n.dictionary({");

    if ("api_export_greeting" in strings) {
      expect(i18n).toContain("apiExportGreeting: i18n.constant({");
    }
    if ("api_export_notification_count" in strings) {
      const types = await readFile(join(componentDir, "types.ts"), "utf8");
      expect(types).toContain("ApiExportNotificationCount = { count: number }");
    }
  }, 30_000);
});
