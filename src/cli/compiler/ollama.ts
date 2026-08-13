import { renderTokensType } from "../codegen/index.ts";
import type { CompileRequest, IcuCompiler, OllamaOptions } from "../types.ts";
import { config } from "../utils.ts";
import { validateSyntax } from "./validate.ts";

export function extractExpression(text: string): string {
  const fenced = /```(?:[a-zA-Z]*)?\n([\s\S]*?)```/.exec(text);
  return (fenced?.[1] ?? text).trim();
}

export function buildPrompt(
  request: CompileRequest,
  previous?: { candidate: string; errors: readonly string[] },
): string {
  const { entry, locales } = request;
  const localeKeys = locales
    .map((locale) => `Locale.${locale.member}`)
    .join(", ");
  const variants = locales
    .map(
      (locale) =>
        `  ${locale.code}: ${JSON.stringify(entry.variants[locale.code] ?? "")}`,
    )
    .join("\n");
  const contract = [
    "Convert these ICU MessageFormat strings into a single Tradurre template expression.",
    "",
    `Token type (already fixed — your formatters MUST satisfy it): Tokens.${entry.typeName} = ${renderTokensType(entry.tokens)}`,
    `Locale keys to emit, in order: ${localeKeys}`,
    "",
    "Per-locale ICU source:",
    variants,
    "",
    "Rules:",
    "- Output ONLY the expression `i18n.template<Tokens." +
      entry.typeName +
      ">({ ... })` — no prose, no imports.",
    "- One variant per locale key, of the form `[Locale.Xx]({ tokens, format }) { ... }`.",
    "- Use `format.plural()`/`format.select(...)` and `format.number()/dateTime()` for ICU plural/select/number/date; template literals for interpolation.",
    "- `#` inside a plural means the plural's own number; reference the matching token.",
    "- Preserve every locale's wording exactly; do not translate.",
  ];
  if (previous) {
    contract.push(
      "",
      "Your previous answer did not parse as TypeScript. Fix these errors:",
      ...previous.errors.map((error) => `- ${error}`),
      "",
      "Previous answer:",
      previous.candidate,
    );
  }
  return contract.join("\n");
}

export function createOllamaCompiler(options: OllamaOptions = {}): IcuCompiler {
  const model = options.model ?? config.ollama.model;
  const endpoint = options.endpoint ?? config.ollama.endpoint;
  const maxAttempts = options.maxAttempts ?? config.ollama.maxAttempts;
  const fetchImpl = options.fetchImpl ?? fetch;
  const validate = options.validate ?? validateSyntax;

  async function generate(prompt: string): Promise<string> {
    const response = await fetchImpl(`${endpoint}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: { temperature: 0.1 },
      }),
    });
    if (!response.ok) {
      throw new Error(
        `Tradurre: Ollama at ${endpoint} responded ${response.status}. Is it running (\`ollama serve\`) and is ${model} pulled?`,
      );
    }
    const payload = (await response.json()) as { response?: string };
    return extractExpression(payload.response ?? "");
  }

  return {
    async compile(request: CompileRequest): Promise<string | null> {
      let previous: { candidate: string; errors: string[] } | undefined;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const candidate = await generate(buildPrompt(request, previous));
        const errors = validate(candidate);
        if (errors.length === 0) return candidate;
        previous = { candidate, errors };
      }
      return null;
    },
  };
}
