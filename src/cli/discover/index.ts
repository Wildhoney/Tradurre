import { glob } from "tinyglobby";

import { config } from "../utils.ts";

export async function discover(
  pattern: string,
  cwd: string,
): Promise<string[]> {
  const search = pattern.includes("/") ? pattern : `**/${pattern}`;
  const matches = await glob(search, {
    cwd,
    absolute: true,
    ignore: [...config.ignore],
  });
  return matches.sort();
}
