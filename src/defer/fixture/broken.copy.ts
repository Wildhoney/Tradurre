import { i18n } from "./i18n.ts";

// Missing `price` and `items`, and `continue` takes tokens it shouldn't.
export const copy = {
  continue: i18n.template<{ name: string }>(({ tokens }) => tokens.name),
};
