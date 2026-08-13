import { relative as relativePath, resolve as resolvePath } from "node:path";

import type {
  ApplyOptions,
  Entry,
  LocaleRef,
  TemplateEntry,
  Tokens,
} from "../types.ts";

function words(identifier: string): string[] {
  return identifier
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[\s_-]+/)
    .filter((word) => word.length > 0)
    .map((word) => word.toLowerCase());
}

function capitalise(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

export function camelCase(identifier: string): string {
  return words(identifier)
    .map((word, index) => (index === 0 ? word : capitalise(word)))
    .join("");
}

export function pascalCase(identifier: string): string {
  return words(identifier).map(capitalise).join("");
}

export function localeMember(code: string): string {
  return pascalCase(code);
}

export function relativeImport(
  fromDirectory: string,
  toModule: string,
  cwd: string,
): string {
  const target = resolvePath(cwd, toModule);
  const specifier = relativePath(fromDirectory, target)
    .replace(/\.(ts|tsx)$/, "")
    .split(/[\\/]/)
    .join("/");
  return specifier.startsWith(".") ? specifier : `./${specifier}`;
}

export function renderTokensType(tokens: Tokens): string {
  const fields = Object.entries(tokens)
    .map(([name, type]) => `${name}: ${type}`)
    .join("; ");
  return `{ ${fields} }`;
}

export function renderTokensNamespace(
  templates: readonly TemplateEntry[],
): string {
  if (templates.length === 0) return "";
  const types = templates
    .map(
      (template) =>
        `  export type ${template.typeName} = ${renderTokensType(template.tokens)};`,
    )
    .join("\n");
  return `export namespace Tokens {\n${types}\n}`;
}

function renderConstant(
  entry: Extract<Entry, { kind: "constant" }>,
  locales: readonly LocaleRef[],
  sourceLocale: string,
): string {
  const variants = locales
    .map((locale) => {
      const value =
        entry.variants[locale.code] ?? entry.variants[sourceLocale] ?? "";
      return `    [Locale.${locale.member}]: ${JSON.stringify(value)},`;
    })
    .join("\n");
  return `  ${entry.key}: i18n.constant({\n${variants}\n  }),`;
}

export function renderDictionary(
  entries: readonly Entry[],
  compiled: ReadonlyMap<string, string>,
  options: ApplyOptions,
  sourceLocale: string,
  locales: readonly LocaleRef[],
): string {
  const lines = entries.map((entry) => {
    if (entry.kind === "constant") {
      return renderConstant(entry, locales, sourceLocale);
    }
    const source = compiled.get(entry.key);
    if (source === undefined) {
      const fallback = renderConstant(
        {
          kind: "constant",
          key: entry.key,
          id: entry.id,
          variants: entry.variants,
        },
        locales,
        sourceLocale,
      );
      return `  // TODO(tradurre): could not compile ICU for "${entry.id}"; left as a constant.\n${fallback}`;
    }
    return `  ${entry.key}: ${source},`;
  });
  const spread = options.commonPath === undefined ? "" : "  ...common,\n";
  return `export const dictionary = i18n.dictionary({\n${spread}${lines.join("\n")}\n});`;
}

function endOfBalanced(source: string, openBraceSearchFrom: number): number {
  const open = source.indexOf("{", openBraceSearchFrom);
  if (open === -1) return -1;
  let depth = 0;
  for (let index = open; index < source.length; index += 1) {
    const character = source[index];
    if (character === "{") depth += 1;
    else if (character === "}") {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return -1;
}

export function updateTypesSource(
  existing: string | null,
  namespaceSource: string,
): string {
  const anchor = "export namespace Tokens";
  const source = existing ?? "";
  const start = source.indexOf(anchor);
  if (start === -1) {
    if (namespaceSource === "") return source;
    const base = source.trimEnd();
    return base === ""
      ? `${namespaceSource}\n`
      : `${base}\n\n${namespaceSource}\n`;
  }
  const end = endOfBalanced(source, start + anchor.length);
  const before = source.slice(0, start).trimEnd();
  const after = source.slice(end).replace(/^\n+/, "");
  const replacement = namespaceSource === "" ? "" : namespaceSource;
  const pieces = [before, replacement, after.trimEnd()].filter(
    (piece) => piece.length > 0,
  );
  return `${pieces.join("\n\n")}\n`;
}

function ensureImport(source: string, statement: string): string {
  if (source.includes(statement)) return source;
  const importPattern = /^import[^\n]*\n/gm;
  let lastEnd = 0;
  for (const match of source.matchAll(importPattern)) {
    lastEnd = match.index + match[0].length;
  }
  if (lastEnd === 0) return `${statement}\n${source}`;
  return `${source.slice(0, lastEnd)}${statement}\n${source.slice(lastEnd)}`;
}

function renderHeader(
  componentDirectory: string,
  options: ApplyOptions,
  needsTokens: boolean,
): string {
  const localeSpecifier = relativeImport(
    componentDirectory,
    options.localePath,
    options.cwd,
  );
  const i18nSpecifier = relativeImport(
    componentDirectory,
    options.i18nPath,
    options.cwd,
  );
  const lines = [
    "// TODO(tradurre): generated file — the imports below are best-effort; adjust if paths differ.",
    `import { Locale } from "${localeSpecifier}";`,
    `import { i18n } from "${i18nSpecifier}";`,
  ];
  if (options.commonPath !== undefined) {
    const commonSpecifier = relativeImport(
      componentDirectory,
      options.commonPath,
      options.cwd,
    );
    lines.push(`import { common } from "${commonSpecifier}";`);
  }
  if (needsTokens) {
    const typeSpecifier = relativeImport(
      componentDirectory,
      `${componentDirectory}/${options.typeFile}`,
      options.cwd,
    );
    lines.push(`import type { Tokens } from "${typeSpecifier}";`);
  }
  return lines.join("\n");
}

export function updateDictionarySource(
  existing: string | null,
  dictionarySource: string,
  componentDirectory: string,
  options: ApplyOptions,
  needsTokens: boolean,
): string {
  if (existing === null) {
    const header = renderHeader(componentDirectory, options, needsTokens);
    return `${header}\n\n${dictionarySource}\n`;
  }
  const anchor = "export const dictionary";
  const start = existing.indexOf(anchor);
  let header =
    start === -1 ? existing.trimEnd() : existing.slice(0, start).trimEnd();
  if (options.commonPath !== undefined) {
    const commonSpecifier = relativeImport(
      componentDirectory,
      options.commonPath,
      options.cwd,
    );
    header = ensureImport(
      header,
      `import { common } from "${commonSpecifier}";`,
    );
  }
  if (needsTokens) {
    const typeSpecifier = relativeImport(
      componentDirectory,
      `${componentDirectory}/${options.typeFile}`,
      options.cwd,
    );
    header = ensureImport(
      header,
      `import type { Tokens } from "${typeSpecifier}";`,
    );
  }
  return `${header.trimEnd()}\n\n${dictionarySource}\n`;
}
