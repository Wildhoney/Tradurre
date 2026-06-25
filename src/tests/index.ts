/**
 * Vitest setup module — registers `@testing-library/jest-dom` custom matchers
 * (`toBeInTheDocument`, `toHaveTextContent`, …) on Vitest's `expect`. Wired
 * in via `vite.config.ts`'s `test.setupFiles`.
 */
import "@testing-library/jest-dom/vitest";
