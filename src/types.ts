import type { Helpers } from "./helpers";
import type { Template } from "./template";

export type FormatterPayload<Args> = { tokens: Args; helpers: Helpers };

export type Formatter<Args> = (payload: FormatterPayload<Args>) => string;

export type AtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Omit<T, K>>;
}[keyof T];

export type Variants<L extends string, V> = AtLeastOne<Record<L, V>>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Entry<L extends string> = Template<L, any> | Variants<L, unknown>;

export type Input<L extends string> = Record<string, Entry<L>>;

export type Resolved<L extends string, E> = E extends Template<L, infer Args>
  ? (args: Args) => string
  : E extends Variants<L, infer V>
    ? V
    : never;

export type Merged<L extends string, D extends Input<L>> = {
  [K in keyof D]: Resolved<L, D[K]>;
};
