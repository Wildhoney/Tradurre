import {
  parse,
  TYPE,
  type MessageFormatElement,
} from "@formatjs/icu-messageformat-parser";

import type { Analysis, TokenType, Tokens } from "../types.ts";

function widen(existing: TokenType, incoming: TokenType): TokenType {
  if (existing === incoming) return existing;
  return existing === "string" ? incoming : existing;
}

function merge(tokens: Tokens, name: string, type: TokenType): void {
  const existing = tokens[name];
  tokens[name] = existing === undefined ? type : widen(existing, type);
}

function collect(
  elements: readonly MessageFormatElement[],
  tokens: Tokens,
): void {
  for (const element of elements) {
    switch (element.type) {
      case TYPE.argument:
        merge(tokens, element.value, "string");
        break;
      case TYPE.number:
        merge(tokens, element.value, "number");
        break;
      case TYPE.date:
      case TYPE.time:
        merge(tokens, element.value, "Date");
        break;
      case TYPE.select:
        merge(tokens, element.value, "string");
        for (const option of Object.values(element.options)) {
          collect(option.value, tokens);
        }
        break;
      case TYPE.plural:
        merge(tokens, element.value, "number");
        for (const option of Object.values(element.options)) {
          collect(option.value, tokens);
        }
        break;
      case TYPE.tag:
        collect(element.children, tokens);
        break;
      default:
        break;
    }
  }
}

export function analyze(icu: string): Analysis {
  const tokens: Tokens = {};
  try {
    collect(parse(icu), tokens);
  } catch {
    return { hasArguments: false, tokens: {} };
  }
  return { hasArguments: Object.keys(tokens).length > 0, tokens };
}

export function analyzeKey(variants: readonly string[]): Analysis {
  const tokens: Tokens = {};
  for (const variant of variants) {
    for (const [name, type] of Object.entries(analyze(variant).tokens)) {
      merge(tokens, name, type);
    }
  }
  return { hasArguments: Object.keys(tokens).length > 0, tokens };
}
