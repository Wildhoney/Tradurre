import type { Dictionary } from "../dictionary/index.ts";
import type { Input, Merged } from "../types.ts";

export function makeHooks<L extends string>(useLocale: () => { locale: L }) {
  function useI18n<D extends Input<L>>(
    dictionary: Dictionary<L, D>,
  ): Merged<L, D> {
    return dictionary.resolve(useLocale().locale);
  }

  return { useI18n };
}
