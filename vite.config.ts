/// <reference types="vitest" />
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";
import dts from "vite-plugin-dts";

function serveExample(): Plugin {
  return {
    name: "tradurre-serve-example",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const url = req.url ?? "/";
        const hasExtension = /\.\w+($|\?)/.test(url);
        const isViteInternal =
          url.startsWith("/@") || url.startsWith("/node_modules/");
        if (!hasExtension && !isViteInternal) {
          req.url = "/src/example/index.html";
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const isExample = mode === "example";

  return {
    resolve: {
      alias: {
        tradurre: resolve(__dirname, "src/index.ts"),
      },
    },
    plugins: isExample
      ? [react(), serveExample()]
      : [
          react(),
          serveExample(),
          dts({
            include: ["src/**/*.ts", "src/**/*.tsx"],
            exclude: [
              "src/**/*.test.ts",
              "src/**/*.test.tsx",
              "src/tests/**",
              "src/example/**",
            ],
            rollupTypes: true,
          }),
        ],
    build: isExample
      ? {
          outDir: "dist-example",
          emptyOutDir: true,
          rollupOptions: {
            input: resolve(__dirname, "src/example/index.html"),
          },
        }
      : {
          // Disabled so the concurrent CLI build (vite.cli.config.ts) writing
          // into the same `dist` is not wiped mid-flight; `pnpm run clean`
          // empties it once before the parallel builds start.
          emptyOutDir: false,
          lib: {
            entry: resolve(__dirname, "src/index.ts"),
            name: "Tradurre",
            fileName: (format) =>
              format === "es" ? "tradurre.js" : `tradurre.${format}`,
            formats: ["es", "cjs"],
          },
          rollupOptions: {
            external: [
              "react",
              "react/jsx-runtime",
              "@formatjs/intl-localematcher",
              "@formatjs/intl-pluralrules",
              "@formatjs/intl-pluralrules/polyfill.js",
              /@formatjs\/intl-pluralrules\/locale-data\/.*/,
            ],
            output: { globals: { react: "React" } },
          },
          sourcemap: true,
        },
    test: {
      globals: true,
      environment: "jsdom",
      setupFiles: ["./src/tests/index.ts"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "dist-example/**",
        "playwright/**",
        "integration/**",
      ],
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "lcov"],
        include: ["src/**/*.ts", "src/**/*.tsx"],
        exclude: [
          "src/**/*.test.ts",
          "src/**/*.test.tsx",
          "src/tests/**",
          "src/example/**",
          "src/index.ts",
          "src/polyfill/index.ts",
          "src/cli/bin.ts",
        ],
        thresholds: {
          lines: 100,
          functions: 100,
          branches: 100,
          statements: 100,
        },
      },
    },
  };
});
