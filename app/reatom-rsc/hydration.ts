import { isInit, throwAbort } from "@reatom/core";

/**
 * Aborts the current async computed when it runs **for the first time on the
 * client**, so that data already hydrated from the server is not re-fetched.
 *
 * ## Why this exists
 *
 * An async `computed` (typically a `fetch`) needs to actually execute to
 * register its dependency graph — every atom call inside the body becomes a
 * tracked dependency, and without that wiring the computed will never
 * re-execute when those dependencies change.
 *
 * But if the computed's `.data` was already populated on the server and
 * carried across via `withSsr`, running the body again on the first client
 * render would issue a redundant network request — defeating the entire
 * point of SSR data transfer.
 *
 * `throwAbortOnHydration` resolves this tension by letting the body run far
 * enough to collect dependencies and then bailing out **only** in the
 * specific case where the bail-out is safe:
 *
 * - `isInit()` — the computed is being evaluated for the very first time in
 *   this context.
 * - `typeof window !== 'undefined'` — we are on the client (on the server
 *   we always want to do the real fetch).
 *
 * When both are true, the function calls `throwAbort("hydrated")` which is
 * caught by reatom's async machinery and converted into a normal computed
 * completion: no exception bubbles out to consumers, the `.data` atom keeps
 * the hydrated value, and any subsequent dependency change (user clicks
 * "next page", a search input updates, etc.) re-runs the body all the way
 * through and triggers a real refetch.
 *
 * ## Usage pattern
 *
 * Order matters. The dependency graph is built only as atoms are read, so:
 *
 * 1. **First**, read every atom your computed depends on (`page()`,
 *    `searchParams()`, etc.).
 * 2. **Then** call `throwAbortOnHydration()`.
 * 3. **Then** perform the side effect (`fetch`, etc.).
 *
 * Calling `throwAbortOnHydration` **before** reading dependencies is wrong:
 * the dependency edges will not be wired and the computed will never
 * re-run, leaving you stuck on the hydrated value forever.
 *
 * @example Deduplicating SSR data with a paginated fetch
 * ```ts
 * import {
 *   computed,
 *   reatomNumber,
 *   withAsyncData,
 *   withSearchParams,
 *   wrap,
 * } from "@reatom/core";
 * import { throwAbortOnHydration, withSsr } from "../reatom-rsc";
 *
 * export const page = reatomNumber(1, "page").extend(
 *   withSearchParams("page", (p) => Number(p)),
 * );
 *
 * export const fetchEpisodes = computed(async () => {
 *   // 1. read dependencies first so the dependency graph is wired
 *   const p = page();
 *
 *   // 2. bail out on the first client render — `.data` is already hydrated
 *   throwAbortOnHydration();
 *
 *   // 3. real fetch — runs on the server, and again on later invalidations
 *   const res = await wrap(
 *     fetch(`https://rickandmortyapi.com/api/episode?page=${p}`),
 *   );
 *   return wrap(res.json());
 * }, "fetchEpisodes").extend(withAsyncData());
 *
 * fetchEpisodes.data.extend(withSsr(fetchEpisodes.data.name));
 * ```
 *
 * @example Multiple dependencies — read all of them first
 * ```ts
 * export const fetchSearchResults = computed(async () => {
 *   // collect every dep up front
 *   const q = query();
 *   const f = filter();
 *   const p = page();
 *
 *   // single bail-out point after all reads
 *   throwAbortOnHydration();
 *
 *   const res = await wrap(
 *     fetch(`/api/search?q=${q}&filter=${f}&page=${p}`),
 *   );
 *   return wrap(res.json());
 * }, "fetchSearchResults").extend(withAsyncData());
 * ```
 *
 * @see {@link withSsr} — atom decorator that hydrates data across the SSR
 *   boundary.
 * @see https://reatom.dev/package/core/ — `computed`, `withAsyncData`,
 *   `throwAbort`, and `isInit` reference.
 */
export const throwAbortOnHydration = () => {
  if (isInit() && typeof window !== "undefined") throwAbort("hydrated");
};
