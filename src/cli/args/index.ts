import { parseArgs as parseNodeArgs } from "node:util";

import type { ApplyOptions, ParsedCommand } from "../types.ts";
import { config } from "../utils.ts";

export function parseArgs(argv: readonly string[], cwd: string): ParsedCommand {
  const { values, positionals } = parseNodeArgs({
    args: [...argv],
    options: {
      "copy-file": { type: "string" },
      "ts-file": { type: "string" },
      "type-file": { type: "string" },
      "source-locale": { type: "string" },
      "locale-path": { type: "string" },
      "i18n-path": { type: "string" },
      "common-path": { type: "string" },
    },
    allowPositionals: true,
    strict: true,
  });

  if (positionals.length !== 1 || positionals[0] !== "apply") {
    throw new Error(
      "Tradurre: usage — tradurre apply [--copy-file=… --ts-file=… --type-file=… --locale-path=… --i18n-path=… --common-path=… --source-locale=…]",
    );
  }

  const commonPath = values["common-path"];
  const options: ApplyOptions = {
    cwd,
    copyFile: values["copy-file"] ?? config.defaults.copyFile,
    tsFile: values["ts-file"] ?? config.defaults.tsFile,
    typeFile: values["type-file"] ?? config.defaults.typeFile,
    sourceLocale: values["source-locale"] ?? config.defaults.sourceLocale,
    localePath: values["locale-path"] ?? config.defaults.localePath,
    i18nPath: values["i18n-path"] ?? config.defaults.i18nPath,
    ...(commonPath === undefined ? {} : { commonPath }),
  };
  return { command: "apply", options };
}
