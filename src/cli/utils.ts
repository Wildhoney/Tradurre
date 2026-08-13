export const config = {
  copySuffix: ".copy.json",
  ignore: [
    "**/node_modules/**",
    "**/dist/**",
    "**/dist-example/**",
    "**/coverage/**",
    "**/build/**",
  ],
  ollama: {
    model: "gemma3n:e4b",
    endpoint: "http://localhost:11434",
    maxAttempts: 3,
  },
  defaults: {
    copyFile: "*.copy.json",
    tsFile: "index.i18n.ts",
    typeFile: "types.ts",
    sourceLocale: "en",
    localePath: "./src/i18n",
    i18nPath: "./src/i18n",
  },
} as const;
