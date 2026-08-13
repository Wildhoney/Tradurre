import { describe, expect, it } from "vitest";

import type {
  ApplyOptions,
  Entry,
  LocaleRef,
  TemplateEntry,
} from "../types.ts";
import {
  camelCase,
  localeMember,
  pascalCase,
  relativeImport,
  renderDictionary,
  renderTokensNamespace,
  renderTokensType,
  updateDictionarySource,
  updateTypesSource,
} from "./index.ts";

const locales: LocaleRef[] = [
  { code: "en", member: "En" },
  { code: "fr", member: "Fr" },
  { code: "es", member: "Es" },
];

const options: ApplyOptions = {
  cwd: "/repo",
  copyFile: "index.copy.json",
  tsFile: "index.i18n.ts",
  typeFile: "types.ts",
  sourceLocale: "en",
  localePath: "./src/example/types",
  i18nPath: "./src/example/utils",
};

const componentDir = "/repo/src/example/components/card";

const greeting: Entry = {
  kind: "constant",
  key: "apiExportGreeting",
  id: "api_export_greeting",
  variants: {
    en: "Hello from the API export",
    fr: "Hello from the API export",
    es: "Hello from the API export",
  },
};

const notification: TemplateEntry = {
  kind: "template",
  key: "apiExportNotificationCount",
  id: "api_export_notification_count",
  typeName: "ApiExportNotificationCount",
  tokens: { count: "number" },
  variants: {
    en: "{count, plural, =0 {No notifications} one {# notification} other {# notifications}}",
  },
};

describe("naming", () => {
  it("camelCases and PascalCases snake_case identifiers", () => {
    expect(camelCase("api_export_greeting")).toBe("apiExportGreeting");
    expect(pascalCase("api_export_greeting")).toBe("ApiExportGreeting");
  });

  it("splits on case boundaries and hyphens too", () => {
    expect(camelCase("alreadyCamel")).toBe("alreadyCamel");
    expect(pascalCase("flat-white")).toBe("FlatWhite");
  });

  it("maps locale codes to Locale members", () => {
    expect(localeMember("en")).toBe("En");
    expect(localeMember("zh")).toBe("Zh");
  });
});

describe("relativeImport", () => {
  it("re-relativises a cwd path to the component directory", () => {
    expect(relativeImport(componentDir, "./src/example/types", "/repo")).toBe(
      "../../types",
    );
    expect(relativeImport(componentDir, "src/example/utils.ts", "/repo")).toBe(
      "../../utils",
    );
  });

  it("emits a leading ./ for a same-directory sibling", () => {
    expect(
      relativeImport(componentDir, `${componentDir}/types.ts`, "/repo"),
    ).toBe("./types");
  });
});

describe("renderTokens", () => {
  it("renders a token type inline", () => {
    expect(renderTokensType({ name: "string", count: "number" })).toBe(
      "{ name: string; count: number }",
    );
  });

  it("renders the namespace for template entries", () => {
    expect(renderTokensNamespace([notification])).toBe(
      "export namespace Tokens {\n" +
        "  export type ApiExportNotificationCount = { count: number };\n" +
        "}",
    );
  });

  it("renders nothing when there are no templates", () => {
    expect(renderTokensNamespace([])).toBe("");
  });
});

describe("renderDictionary", () => {
  it("renders constants keyed by Locale member", () => {
    const source = renderDictionary(
      [greeting],
      new Map(),
      options,
      "en",
      locales,
    );
    expect(source).toContain("apiExportGreeting: i18n.constant({");
    expect(source).toContain('[Locale.En]: "Hello from the API export",');
    expect(source).toContain("[Locale.Es]:");
    expect(
      source.startsWith("export const dictionary = i18n.dictionary({"),
    ).toBe(true);
  });

  it("places compiled template source verbatim", () => {
    const compiled = new Map([
      [
        notification.key,
        "i18n.template<Tokens.ApiExportNotificationCount>({ /* … */ })",
      ],
    ]);
    const source = renderDictionary(
      [notification],
      compiled,
      options,
      "en",
      locales,
    );
    expect(source).toContain(
      "apiExportNotificationCount: i18n.template<Tokens.ApiExportNotificationCount>({",
    );
  });

  it("falls back to a TODO constant when the compiler gave up", () => {
    const source = renderDictionary(
      [notification],
      new Map(),
      options,
      "en",
      locales,
    );
    expect(source).toContain(
      'TODO(tradurre): could not compile ICU for "api_export_notification_count"',
    );
    expect(source).toContain("apiExportNotificationCount: i18n.constant({");
  });

  it("spreads ...common when a common path is configured", () => {
    const source = renderDictionary(
      [greeting],
      new Map(),
      { ...options, commonPath: "./src/example/common.i18n" },
      "en",
      locales,
    );
    expect(source).toContain("i18n.dictionary({\n  ...common,\n");
  });

  it("gap-fills a missing locale from the source locale, then empty string", () => {
    const partial: Entry = {
      kind: "constant",
      key: "onlyEn",
      id: "only_en",
      variants: { en: "Only English" },
    };
    const source = renderDictionary(
      [partial],
      new Map(),
      options,
      "en",
      locales,
    );
    expect(source).toContain('[Locale.Fr]: "Only English",');

    const empty: Entry = {
      kind: "constant",
      key: "blank",
      id: "blank",
      variants: {},
    };
    const blankSource = renderDictionary(
      [empty],
      new Map(),
      options,
      "en",
      locales,
    );
    expect(blankSource).toContain('[Locale.En]: "",');
  });
});

describe("updateTypesSource", () => {
  it("appends a namespace to a file that has other types", () => {
    const existing = 'export type Id = "espresso" | "latte";\n';
    const result = updateTypesSource(
      existing,
      renderTokensNamespace([notification]),
    );
    expect(result).toContain('export type Id = "espresso" | "latte";');
    expect(result).toContain("export namespace Tokens {");
  });

  it("replaces an existing namespace in place, preserving siblings", () => {
    const existing =
      'export type Id = "espresso";\n\n' +
      "export namespace Tokens {\n  export type Old = { x: string };\n}\n";
    const result = updateTypesSource(
      existing,
      renderTokensNamespace([notification]),
    );
    expect(result).toContain('export type Id = "espresso";');
    expect(result).not.toContain("Old");
    expect(result).toContain("ApiExportNotificationCount");
  });

  it("creates a file from just the namespace", () => {
    expect(updateTypesSource(null, renderTokensNamespace([notification]))).toBe(
      "export namespace Tokens {\n" +
        "  export type ApiExportNotificationCount = { count: number };\n" +
        "}\n",
    );
  });

  it("strips a managed namespace when there are no templates left", () => {
    const existing =
      'export type Id = "espresso";\n\nexport namespace Tokens {\n  export type Old = { x: string };\n}\n';
    const result = updateTypesSource(existing, "");
    expect(result).toBe('export type Id = "espresso";\n');
  });

  it("leaves an unmanaged file untouched when there is nothing to write", () => {
    expect(updateTypesSource('export type Id = "x";\n', "")).toBe(
      'export type Id = "x";\n',
    );
    expect(updateTypesSource(null, "")).toBe("");
  });

  it("tolerates an unbalanced existing namespace", () => {
    const result = updateTypesSource(
      "export namespace Tokens { oops no closing brace",
      renderTokensNamespace([notification]),
    );
    expect(result).toContain("ApiExportNotificationCount");
  });

  it("tolerates an existing namespace anchor with no opening brace", () => {
    const result = updateTypesSource(
      "export namespace Tokens",
      renderTokensNamespace([notification]),
    );
    expect(result).toContain("ApiExportNotificationCount");
  });
});

describe("updateDictionarySource edge cases", () => {
  it("regenerates when the modified file has no dictionary statement yet", () => {
    const existing = 'import { i18n } from "../../utils";\n';
    const result = updateDictionarySource(
      existing,
      renderDictionary([greeting], new Map(), options, "en", locales),
      componentDir,
      options,
      false,
    );
    expect(result).toContain('import { i18n } from "../../utils";');
    expect(result).toContain("export const dictionary = i18n.dictionary({");
  });
});

describe("updateDictionarySource", () => {
  const dictionary = renderDictionary(
    [greeting],
    new Map(),
    options,
    "en",
    locales,
  );

  it("creates a file with a best-effort header", () => {
    const result = updateDictionarySource(
      null,
      dictionary,
      componentDir,
      options,
      false,
    );
    expect(result).toContain('import { Locale } from "../../types";');
    expect(result).toContain('import { i18n } from "../../utils";');
    expect(result).toContain("TODO(tradurre): generated file");
    expect(result).toContain("export const dictionary = i18n.dictionary({");
  });

  it("adds the Tokens import when templates exist on create", () => {
    const result = updateDictionarySource(
      null,
      dictionary,
      componentDir,
      options,
      true,
    );
    expect(result).toContain('import type { Tokens } from "./types";');
  });

  it("preserves the existing import header on modify", () => {
    const existing =
      'import { Locale } from "../../types";\n' +
      'import { i18n } from "../../utils";\n\n' +
      "export const dictionary = i18n.dictionary({\n  old: 1,\n});\n";
    const result = updateDictionarySource(
      existing,
      dictionary,
      componentDir,
      options,
      false,
    );
    expect(result).toContain('import { Locale } from "../../types";');
    expect(result).not.toContain("old: 1");
    expect(result).toContain("apiExportGreeting: i18n.constant({");
  });

  it("injects missing common and Tokens imports on modify", () => {
    const existing =
      'import { Locale } from "../../types";\n' +
      'import { i18n } from "../../utils";\n\n' +
      "export const dictionary = i18n.dictionary({});\n";
    const result = updateDictionarySource(
      existing,
      dictionary,
      componentDir,
      { ...options, commonPath: "./src/example/common.i18n" },
      true,
    );
    expect(result).toContain('import { common } from "../../common.i18n";');
    expect(result).toContain('import type { Tokens } from "./types";');
  });

  it("prepends an import when the modified file has none", () => {
    const existing = "export const dictionary = i18n.dictionary({});\n";
    const result = updateDictionarySource(
      existing,
      dictionary,
      componentDir,
      options,
      true,
    );
    expect(result.startsWith('import type { Tokens } from "./types";')).toBe(
      true,
    );
  });
});
