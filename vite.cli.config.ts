import { builtinModules } from "node:module";
import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    target: "node18",
    minify: false,
    lib: {
      entry: resolve(__dirname, "src/cli/bin.ts"),
      formats: ["es"],
      fileName: () => "cli/bin.js",
    },
    rollupOptions: {
      external: [/^node:/, ...builtinModules, "typescript", "prettier"],
      output: { banner: "#!/usr/bin/env node" },
    },
  },
});
