import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

import { camelCase, localeMember, pascalCase } from "../codegen/index.ts";
import { analyzeKey } from "../icu/index.ts";
import type {
  ApplyOptions,
  Component,
  CopyMap,
  Entry,
  LocaleCode,
  LocaleRef,
} from "../types.ts";
import { config } from "../utils.ts";

async function readCopyMap(path: string): Promise<CopyMap> {
  const raw = await readFile(path, "utf8");
  const parsed: unknown = JSON.parse(raw);
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Tradurre: ${path} must be a JSON object of id → string.`);
  }
  const map: CopyMap = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string") {
      throw new Error(`Tradurre: ${path} key "${key}" must map to a string.`);
    }
    map[key] = value;
  }
  return map;
}

export async function loadComponent(
  directory: string,
  options: ApplyOptions,
): Promise<Component> {
  const sourceName = `${options.sourceLocale}${config.copySuffix}`;
  const anchorMap = await readCopyMap(join(directory, sourceName));

  const siblings: { code: LocaleCode; map: CopyMap }[] = [];
  for (const file of await readdir(directory)) {
    if (!file.endsWith(config.copySuffix) || file === sourceName) continue;
    const code = file.slice(0, -config.copySuffix.length);
    siblings.push({ code, map: await readCopyMap(join(directory, file)) });
  }
  siblings.sort((left, right) => left.code.localeCompare(right.code));

  const localeCodes: LocaleCode[] = [
    options.sourceLocale,
    ...siblings.map((sibling) => sibling.code),
  ];

  const entries: Entry[] = [];
  let templateCount = 0;
  for (const [id, source] of Object.entries(anchorMap)) {
    const variants: Record<LocaleCode, string> = {
      [options.sourceLocale]: source,
    };
    const values: string[] = [source];
    for (const sibling of siblings) {
      const value = sibling.map[id] ?? source;
      variants[sibling.code] = value;
      values.push(value);
    }
    const analysis = analyzeKey(values);
    if (analysis.hasArguments) {
      templateCount += 1;
      entries.push({
        kind: "template",
        key: camelCase(id),
        id,
        typeName: pascalCase(id),
        tokens: analysis.tokens,
        variants,
      });
    } else {
      entries.push({ kind: "constant", key: camelCase(id), id, variants });
    }
  }

  const locales: LocaleRef[] = localeCodes.map((code) => ({
    code,
    member: localeMember(code),
  }));
  return { directory, entries, locales, templateCount };
}
