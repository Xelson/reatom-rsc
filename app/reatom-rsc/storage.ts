import { createMemStorage, PersistRecord, reatomPersist, Rec } from "@reatom/core";

/** In-memory persist storage used to track atom state for SSR hydration. */
export const memoryStorage = createMemStorage({ name: "ssr" });
/**
 * Atom extension (decorator) that opts an atom into server-to-client state transfer.
 *
 * Built on top of {@link reatomPersist} with an in-memory storage backend.
 * When a {@link reatomServerComponent} renders, every atom decorated with `withSsr`
 * has its value captured into a snapshot. The snapshot diff is then serialized
 * into the RSC payload and applied on the client during hydration, so client
 * components see the server-computed value on first render.
 *
 * Typically applied to data atoms that are populated during server-side fetching
 * (e.g. `fetchEpisodes.data`) rather than to every atom in the app. Only atoms
 * that need to cross the server→client boundary should be decorated.
 *
 * @param options - Persist options object, or a string shorthand for the key.
 * @param options.key - A globally unique string identifier for the atom.
 *   Used as the serialization key in the snapshot. Must be stable across
 *   server and client bundles. A common convention is to use the atom's `.name`.
 *
 * @returns An atom extension to be passed to `.extend()`.
 *
 * @example Marking a fetched data atom for SSR transfer
 * ```ts
 * import { computed, withAsyncData, wrap } from "@reatom/core";
 * import { withSsr } from "./reatom-rsc";
 *
 * const fetchEpisodes = computed(async () => {
 *   const res = await wrap(fetch("https://rickandmortyapi.com/api/episode"));
 *   return wrap(res.json());
 * }, "fetchEpisodes").extend(withAsyncData());
 *
 * // only the `.data` atom needs hydration — it holds the fetched result
 * fetchEpisodes.data.extend(withSsr(fetchEpisodes.data.name));
 * ```
 *
 * @see {@link reatomServerComponent} — captures and transfers `withSsr` atom state.
 * @see https://reatom.dev/package/persist/ — Reatom persist documentation.
 */
export const withSsr = reatomPersist(memoryStorage);

/** Serialized atom states as a record of `PersistRecord`. */
export type Snapshot = Rec<PersistRecord>;