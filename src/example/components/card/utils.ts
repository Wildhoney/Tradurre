import type { Id } from "./types";

export const menu: Record<Id, { price: number; emoji: string }> = {
  espresso: { price: 2.5, emoji: "☕" },
  cappuccino: { price: 3.75, emoji: "🫖" },
  latte: { price: 4.0, emoji: "🥛" },
  mocha: { price: 4.5, emoji: "🍫" },
  americano: { price: 3.0, emoji: "🇺🇸" },
  flatWhite: { price: 3.85, emoji: "🤍" },
};

export const ids = Object.keys(menu) as Id[];
