import type { Formatter, Mode, Variants } from "../types.ts";

export class Template<L extends string, Args> {
  declare readonly __args: () => Args;
  constructor(public readonly variants: Variants<L, Formatter<unknown>>) {}
}

export function makeTemplate<L extends string, M extends Mode = Mode.Loose>() {
  return function template<Args>(
    variants: Variants<L, Formatter<Args>, M>,
  ): Template<L, Args> {
    return new Template<L, Args>(variants as Variants<L, Formatter<unknown>>);
  };
}
