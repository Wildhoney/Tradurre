import { dirname, join } from "node:path";

import {
  renderDictionary,
  renderTokensNamespace,
  updateDictionarySource,
  updateTypesSource,
} from "../codegen/index.ts";
import type {
  ApplyDeps,
  ApplyOptions,
  ApplyResult,
  ComponentResult,
  Entry,
  IcuCompiler,
  TemplateEntry,
} from "../types.ts";

function isTemplate(entry: Entry): entry is TemplateEntry {
  return entry.kind === "template";
}

export async function apply(
  options: ApplyOptions,
  compiler: IcuCompiler,
  deps: ApplyDeps,
): Promise<ApplyResult> {
  const anchors = await deps.discover(options.copyFile, options.cwd);
  const directories = [...new Set(anchors.map((path) => dirname(path)))].sort();
  const format = deps.format ?? ((source: string) => Promise.resolve(source));

  const components: ComponentResult[] = [];
  for (const directory of directories) {
    const component = await deps.loadComponent(directory, options);
    const templates = component.entries.filter(isTemplate);

    const compiled = new Map<string, string>();
    for (const template of templates) {
      const source = await compiler.compile({
        entry: template,
        locales: component.locales,
      });
      if (source !== null) compiled.set(template.key, source);
    }

    const needsTokens = templates.length > 0;
    const tsPath = join(directory, options.tsFile);
    const typePath = join(directory, options.typeFile);

    const dictionarySource = renderDictionary(
      component.entries,
      compiled,
      options,
      options.sourceLocale,
      component.locales,
    );
    const existingTs = await deps.readFileOrNull(tsPath);
    const nextTs = await format(
      updateDictionarySource(
        existingTs,
        dictionarySource,
        directory,
        options,
        needsTokens,
      ),
      tsPath,
    );
    await deps.writeFile(tsPath, nextTs);

    const existingTypes = await deps.readFileOrNull(typePath);
    const nextTypes = updateTypesSource(
      existingTypes,
      renderTokensNamespace(templates),
    );
    let typeFileWritten: string | null = null;
    if (nextTypes.trim() !== "" || existingTypes !== null) {
      await deps.writeFile(typePath, await format(nextTypes, typePath));
      typeFileWritten = options.typeFile;
    }

    components.push({
      directory,
      tsFile: options.tsFile,
      typeFile: typeFileWritten,
      constants: component.entries.length - templates.length,
      templates: templates.length,
      compiledTemplates: compiled.size,
    });
  }

  return { components };
}
