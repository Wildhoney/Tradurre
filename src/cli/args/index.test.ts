import { describe, expect, it } from "vitest";

import { parseArgs } from "./index.ts";

describe("parseArgs", () => {
  it("applies defaults from config", () => {
    const { command, options } = parseArgs(["apply"], "/repo");
    expect(command).toBe("apply");
    expect(options).toEqual({
      cwd: "/repo",
      copyFile: "*.copy.json",
      tsFile: "index.i18n.ts",
      typeFile: "types.ts",
      sourceLocale: "en",
      localePath: "./src/i18n",
      i18nPath: "./src/i18n",
    });
  });

  it("reads overrides, including an optional common-path", () => {
    const { options } = parseArgs(
      [
        "apply",
        "--copy-file=**/*.copy.json",
        "--locale-path=./src/types",
        "--i18n-path=./src/utils",
        "--common-path=./src/common.i18n",
        "--source-locale=en-GB",
      ],
      "/x",
    );
    expect(options.copyFile).toBe("**/*.copy.json");
    expect(options.localePath).toBe("./src/types");
    expect(options.i18nPath).toBe("./src/utils");
    expect(options.commonPath).toBe("./src/common.i18n");
    expect(options.sourceLocale).toBe("en-GB");
  });

  it("omits commonPath when the flag is absent", () => {
    expect("commonPath" in parseArgs(["apply"], "/x").options).toBe(false);
  });

  it("rejects an unknown, missing, or extra command", () => {
    expect(() => parseArgs(["frobnicate"], "/x")).toThrow(/usage/);
    expect(() => parseArgs([], "/x")).toThrow(/usage/);
    expect(() => parseArgs(["apply", "extra"], "/x")).toThrow(/usage/);
  });

  it("rejects an unknown flag", () => {
    expect(() => parseArgs(["apply", "--nope=1"], "/x")).toThrow();
  });
});
