import { Rec, wrap } from "@reatom/core";
import { memoryStorage, Snapshot } from "./storage";
import { ReatomHydrator } from "./hydrator";
import { frameCache } from "./frame-cache";

/**
 * Wraps a React Server Component render function to enable isomorphic atom state.
 *
 * Captures a snapshot of all {@link withSsr}-decorated atoms **before** and **after**
 * the render function executes, computes a diff of changed entries, and automatically
 * injects a {@link ReatomHydrator} client component into the rendered tree. On the
 * client the hydrator applies the diff so that `reatomComponent` consumers receive
 * server-computed values immediately.
 *
 * The wrapper runs inside an isolated reatom context frame (via {@link frameCache}),
 * which is scoped to the current RSC request through React's
 * [`cache()`](https://react.dev/reference/react/cache). This means multiple
 * `reatomServerComponent` calls within the same request share state, and nested
 * server components produce independent diffs that are applied in tree order.
 *
 * **Important:** atoms read inside RSC are static — they render the value at the
 * time of the server request. The same atoms inside client components (via
 * `reatomComponent`) are reactive and will update on user interaction. On
 * navigation, a server component may re-render with fresh data and override
 * the client value if the server snapshot is newer.
 *
 * @template Props - Component props type, defaults to `{}`.
 *
 * @param renderFn - The server component body. May be synchronous or `async`.
 *   Inside this function you can read atoms (call them) and write atoms (`.set()`).
 *   Every asynchronous operation **must** be wrapped with {@link wrap} from
 *   `@reatom/core` to preserve the reatom execution context across async boundaries.
 *
 * @returns A React Server Component that accepts `Props` and returns `Promise<React.ReactNode>`.
 *
 * @example Fetching data and rendering in RSC
 * ```tsx
 * // model.ts
 * export const fetchEpisodes = computed(async () => {
 *   const res = await wrap(fetch(`https://rickandmortyapi.com/api/episode?page=${page()}`));
 *   return wrap(res.json());
 * }, "fetchEpisodes").extend(withAsyncData());
 *
 * fetchEpisodes.data.extend(withSsr(fetchEpisodes.data.name));
 *
 * // page.tsx
 * export default reatomServerComponent(async () => {
 *   await wrap(fetchEpisodes());
 *
 *   return (
 *     <section>
 *       <h1>Episodes</h1>
 *       {/* static on server, reactive on client *​/}
 *       <EpisodesList />
 *     </section>
 *   );
 * });
 * ```
 *
 * @see {@link withSsr} — decorator that opts an atom into SSR state transfer.
 * @see {@link setupUrlAtom} — required when atoms use `withSearchParams`.
 * @see https://react.dev/reference/rsc/server-components — React Server Components reference.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export const reatomServerComponent = <Props extends Rec = {}>(
  renderFn: (props: Props) => React.ReactNode | Promise<React.ReactNode>,
) => {
  return (props: Props) => {
    const frame = frameCache();
    return frame.run(async () => {
      const beforeSnapshot = { ...memoryStorage.snapshotAtom() };
      const node = await wrap(renderFn(props));
      const afterSnapshot = memoryStorage.snapshotAtom();
      const diff = diffSnapshot(beforeSnapshot, afterSnapshot);

      return (
        <>
          <ReatomHydrator snapshotDiff={diff} />
          {node}
        </>
      );
    });
  };
};

/** Compares before/after snapshots and returns only the changed entries. */
const diffSnapshot = (before: Snapshot, after: Snapshot) => {
  const diff: Snapshot = {};

  for (const key in after) {
    const next = after[key];
    const prev = before[key];

    if (!prev || prev.id !== next.id || prev.version !== next.version) {
      diff[key] = next;
    }
  }
  return diff;
};