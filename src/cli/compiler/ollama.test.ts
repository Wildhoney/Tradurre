import { describe, expect, it } from "vitest";

import type { CompileRequest } from "../types.ts";
import {
  buildPrompt,
  createOllamaCompiler,
  extractExpression,
} from "./ollama.ts";

const request: CompileRequest = {
  entry: {
    kind: "template",
    key: "greet",
    id: "greet",
    typeName: "Greet",
    tokens: { name: "string" },
    variants: { en: "Hello {name}" },
  },
  locales: [{ code: "en", member: "En" }],
};

function mockFetch(responses: string[]) {
  const prompts: string[] = [];
  let call = 0;
  const impl = ((_url: string, init: { body: string }) => {
    prompts.push(JSON.parse(init.body).prompt);
    const response = responses[Math.min(call, responses.length - 1)];
    call += 1;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ response }),
    });
  }) as unknown as typeof fetch;
  return { impl, prompts, calls: () => call };
}

describe("extractExpression", () => {
  it("unwraps a fenced code block", () => {
    expect(extractExpression("```ts\ni18n.template({})\n```")).toBe(
      "i18n.template({})",
    );
  });

  it("trims bare text", () => {
    expect(extractExpression("  i18n.template({})  ")).toBe(
      "i18n.template({})",
    );
  });
});

describe("buildPrompt", () => {
  it("states the token contract and locale keys", () => {
    const prompt = buildPrompt(request);
    expect(prompt).toContain("Tokens.Greet = { name: string }");
    expect(prompt).toContain("Locale.En");
    expect(prompt).toContain('"Hello {name}"');
  });

  it("appends prior errors and the rejected candidate on retry", () => {
    const prompt = buildPrompt(request, {
      candidate: "broken(",
      errors: ["Unexpected token"],
    });
    expect(prompt).toContain("did not parse");
    expect(prompt).toContain("Unexpected token");
    expect(prompt).toContain("broken(");
  });

  it("emits an empty ICU line for a locale with no variant", () => {
    const prompt = buildPrompt({
      entry: request.entry,
      locales: [{ code: "de", member: "De" }],
    });
    expect(prompt).toContain('de: ""');
  });
});

describe("createOllamaCompiler", () => {
  it("returns the candidate when it validates on the first attempt", async () => {
    const { impl, prompts } = mockFetch(["i18n.template<Tokens.Greet>({})"]);
    const compiler = createOllamaCompiler({
      fetchImpl: impl,
      validate: () => [],
    });
    expect(await compiler.compile(request)).toBe(
      "i18n.template<Tokens.Greet>({})",
    );
    expect(prompts).toHaveLength(1);
  });

  it("retries with diagnostics fed back, then succeeds", async () => {
    let attempt = 0;
    const { impl, prompts } = mockFetch(["first-bad", "second-good"]);
    const compiler = createOllamaCompiler({
      fetchImpl: impl,
      validate: () => (attempt++ === 0 ? ["Unexpected token"] : []),
    });
    expect(await compiler.compile(request)).toBe("second-good");
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toContain("Unexpected token");
  });

  it("gives up and returns null after maxAttempts", async () => {
    const { impl, calls } = mockFetch(["always-bad"]);
    const compiler = createOllamaCompiler({
      fetchImpl: impl,
      validate: () => ["nope"],
      maxAttempts: 2,
    });
    expect(await compiler.compile(request)).toBeNull();
    expect(calls()).toBe(2);
  });

  it("throws a helpful error when Ollama is unreachable", async () => {
    const impl = (() =>
      Promise.resolve({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      })) as unknown as typeof fetch;
    const compiler = createOllamaCompiler({ fetchImpl: impl });
    await expect(compiler.compile(request)).rejects.toThrow(/responded 500/);
  });

  it("uses the real syntax validator by default", async () => {
    const good =
      "i18n.template<Tokens.Greet>({ [Locale.En]({ tokens, format }) { void format; return `Hi ${tokens.name}`; } })";
    const { impl } = mockFetch([good]);
    const compiler = createOllamaCompiler({ fetchImpl: impl });
    expect(await compiler.compile(request)).toContain("i18n.template");
  });

  it("treats a missing response field as empty output", async () => {
    const impl = (() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({}),
      })) as unknown as typeof fetch;
    const compiler = createOllamaCompiler({
      fetchImpl: impl,
      validate: () => [],
    });
    expect(await compiler.compile(request)).toBe("");
  });

  it("uses global fetch with a custom endpoint and model when fetchImpl is omitted", async () => {
    const original = globalThis.fetch;
    const calls: { url: string; model: string }[] = [];
    globalThis.fetch = ((url: string, init: { body: string }) => {
      calls.push({ url, model: JSON.parse(init.body).model });
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ response: "ok" }),
      });
    }) as unknown as typeof fetch;
    try {
      const compiler = createOllamaCompiler({
        endpoint: "http://host:9999",
        model: "custom-model",
        validate: () => [],
      });
      expect(await compiler.compile(request)).toBe("ok");
      expect(calls[0]?.url).toBe("http://host:9999/api/generate");
      expect(calls[0]?.model).toBe("custom-model");
    } finally {
      globalThis.fetch = original;
    }
  });
});
