import type { ReactNode } from "react";

import { copy as common } from "./common/en.copy.ts";
import { i18n, type Tokens } from "./i18n.ts";

export const copy = {
  ...common,
  // listed after the spread, so it overrides common's `back`
  back: i18n.constant("Back to basket"),
  continue: i18n.constant("Continue"),
  price: i18n.template<Tokens.Price>(({ tokens, format }) =>
    format.number({ style: "currency", currency: "GBP" }).format(tokens.amount),
  ),
  items: i18n.template<Tokens.Items, ReactNode>(({ tokens, format }) =>
    format.plural().select(tokens.count) === "one" ? (
      <b>{tokens.count} item</b>
    ) : (
      <b>{tokens.count} items</b>
    ),
  ),
};
