import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

import { apply } from "./apply/index.ts";
import { parseArgs } from "./args/index.ts";
import { createOllamaCompiler } from "./compiler/ollama.ts";
import { loadComponent } from "./copy/index.ts";
import { discover } from "./discover/index.ts";
import type { ApplyDeps } from "./types.ts";

async function loadFormatter(): Promise<ApplyDeps["format"]> {
  try {
    const prettier = await import("prettier");
    return (source, filepath) => prettier.format(source, { filepath });
  } catch {
    return undefined;
  }
}

async function main(): Promise<void> {
  const { options } = parseArgs(process.argv.slice(2), process.cwd());
  const deps: ApplyDeps = {
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
    format: await loadFormatter(),
  };

  const result = await apply(options, createOllamaCompiler(), deps);
  for (const component of result.components) {
    console.log(
      `✓ ${component.directory} — ${component.constants} constant(s), ${component.compiledTemplates}/${component.templates} template(s)`,
    );
  }
  console.log(`Done: ${result.components.length} component(s) updated.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
