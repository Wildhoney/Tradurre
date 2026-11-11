import { Dictionary } from "../dictionary/index.ts";
import { Constant, Template } from "../template/index.ts";
import type {
  ChangeStore,
  Input,
  Loader,
  ResolvedDictionary,
  Variants,
} from "../types.ts";

/**
 * Per-instance change signal: bumps a version whenever a deferred locale
 * settles, so `useI18n` re-renders and re-resolves.
 */
export function makeChangeStore(): ChangeStore {
  const listeners = new Set<() => void>();
  let version = 0;
  return {
    notify() {
      version += 1;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    version() {
      return version;
    },
  };
}

/**
 * Dictionary whose locales live in per-locale copy modules. Bundled locales
 * resolve immediately; a deferred locale is imported the first time it's
 * resolved and, until it arrives, resolves to placeholders shaped by the
 * bundled copy — `""` for constants, `() => ""` for templates — with
 * `loaded: false`. A failed import is surfaced as `error` and only retried by
 * an explicit {@link load}, since re-importing on every render would loop.
 *
 * @typeParam L - Locale union for this i18n instance.
 * @typeParam D - Dictionary input, re-branded onto the full locale union.
 */
export class DeferredDictionary<L extends string, D extends Input<L>> {
  readonly #loaders = new Map<L, Loader<D>>();
  readonly #loaded = new Map<L, Dictionary<L, D>>();
  readonly #placeholder: Dictionary<L, D>;
  readonly #pending = new Map<L, Promise<void>>();
  readonly #failed = new Map<L, unknown>();
  readonly #cache = new Map<
    string,
    { version: number; bundle: ResolvedDictionary<L, D> }
  >();
  readonly #notify: () => void;

  constructor(
    deferrals: Record<L, D | Loader<D>>,
    locales: readonly L[],
    notify: () => void,
  ) {
    this.#notify = notify;
    let source: D | undefined;
    for (const locale of locales) {
      const entry = deferrals[locale];
      if (isBundled(entry)) {
        source ??= entry;
        this.#loaded.set(locale, new Dictionary<L, D>(entry));
      } else {
        // `D` is generic, so the guard can't narrow the else branch for us.
        this.#loaders.set(locale, entry as Loader<D>);
      }
    }
    if (source === undefined) {
      throw new Error(
        "Tradurre: dictionary.defer needs at least one bundled locale to shape its placeholders.",
      );
    }
    this.#placeholder = new Dictionary<L, D>(placeholders(source, locales));
  }

  /**
   * Starts (or joins) the import for `locale` — call it to preload ahead of a
   * locale switch, or to retry after `intl.error`. Never rejects; a failure
   * surfaces as `error` on the resolved bundle.
   */
  load(locale: L): Promise<void> {
    const loader = this.#loaders.get(locale);
    if (loader === undefined || this.#loaded.has(locale)) {
      return Promise.resolve();
    }
    const inFlight = this.#pending.get(locale);
    if (inFlight !== undefined) return inFlight;
    this.#failed.delete(locale);
    const request = this.#import(locale, loader);
    this.#pending.set(locale, request);
    return request;
  }

  async #import(locale: L, loader: Loader<D>): Promise<void> {
    try {
      const module = await loader();
      this.#loaded.set(locale, new Dictionary<L, D>(module.copy));
    } catch (error: unknown) {
      this.#failed.set(locale, error);
    }
    this.#pending.delete(locale);
    this.#notify();
  }

  /**
   * Resolves `locale`: its copy when loaded, otherwise placeholders with
   * `loaded: false` (kicking off the first import) and any import `error`.
   * Memoised per `(locale, formatLocale)` until `version` changes.
   */
  resolve(
    locale: L,
    formatLocale: string = locale,
    version = 0,
  ): ResolvedDictionary<L, D> {
    const loaded = this.#loaded.get(locale);
    if (loaded !== undefined) return loaded.resolve(locale, formatLocale);
    if (!this.#failed.has(locale)) void this.load(locale);
    const cacheKey = `${locale}\0${formatLocale}`;
    const cached = this.#cache.get(cacheKey);
    if (cached !== undefined && cached.version === version) {
      return cached.bundle;
    }
    const bundle: ResolvedDictionary<L, D> = {
      ...this.#placeholder.resolve(locale, formatLocale),
      loaded: false,
      error: this.#failed.get(locale),
    };
    this.#cache.set(cacheKey, { version, bundle });
    return bundle;
  }
}

/** Tells a bundled locale's copy object from a deferred locale's loader. */
function isBundled<D>(entry: D | Loader<D>): entry is D {
  return typeof entry !== "function";
}

/**
 * Mirrors `source`'s keys with empty stand-ins — `""` constants and
 * `() => ""` templates — so `intl.copy` keeps its shape while a locale loads.
 */
function placeholders<L extends string, D extends Input<L>>(
  source: D,
  locales: readonly L[],
): D {
  return Object.fromEntries(
    Object.entries(source).map(([key, entry]) => {
      if (entry instanceof Template) {
        return [key, new Template(everyLocale(locales, () => ""))];
      }
      return [key, new Constant(everyLocale(locales, ""))];
    }),
  ) as D;
}

/** Builds a variants map giving every locale the same `variant`. */
export function everyLocale<L extends string, Variant>(
  locales: readonly L[],
  variant: Variant,
): Variants<L, Variant> {
  return Object.fromEntries(
    locales.map((locale) => [locale, variant]),
  ) as Variants<L, Variant>;
}
