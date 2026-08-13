import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { discover } from "./index.ts";

const roots: string[] = [];

async function tree(files: Record<string, string>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "tradurre-discover-"));
  roots.push(root);
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolute = join(root, relativePath);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, contents);
  }
  return root;
}

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("discover", () => {
  it("matches a basename at any depth and skips vendor and dot dirs", async () => {
    const root = await tree({
      "src/a/index.copy.json": "{}",
      "src/b/index.copy.json": "{}",
      "node_modules/pkg/index.copy.json": "{}",
      ".hidden/index.copy.json": "{}",
      "src/a/other.json": "{}",
    });
    const found = await discover("index.copy.json", root);
    expect(found).toHaveLength(2);
    expect(found.some((path) => path.endsWith("/src/a/index.copy.json"))).toBe(
      true,
    );
    expect(found.some((path) => path.endsWith("/src/b/index.copy.json"))).toBe(
      true,
    );
    expect(found.some((path) => path.includes("node_modules"))).toBe(false);
    expect(found.some((path) => path.includes(".hidden"))).toBe(false);
  });

  it("honours a slash-bearing glob rather than treating it as a basename", async () => {
    const root = await tree({
      "src/x/en.copy.json": "{}",
      "src/x/index.copy.json": "{}",
    });
    const found = await discover("src/**/en.copy.json", root);
    expect(found).toHaveLength(1);
    expect(found[0]?.endsWith("/src/x/en.copy.json")).toBe(true);
  });
});
