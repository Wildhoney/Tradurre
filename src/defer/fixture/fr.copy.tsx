import type { ReactNode } from "react";

import { copy as common } from "./common/fr.copy.ts";
import { i18n, type Tokens } from "./i18n.ts";

export const copy = {
  ...common,
  // listed after the spread, so it overrides common's `back`
  back: i18n.constant("Retour au panier"),
  continue: i18n.constant("Continuer"),
  price: i18n.template<Tokens.Price>(({ tokens, format }) =>
    format.number({ style: "currency", currency: "EUR" }).format(tokens.amount),
  ),
  items: i18n.template<Tokens.Items, ReactNode>(({ tokens, format }) =>
    format.plural().select(tokens.count) === "one" ? (
      <b>{tokens.count} article</b>
    ) : (
      <b>{tokens.count} articles</b>
    ),
  ),
};
