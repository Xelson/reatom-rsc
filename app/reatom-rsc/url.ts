import { cache } from "react";
import { frameCache } from "./frame-cache";
import { noop, Rec, urlAtom } from "@reatom/core";

/** Memoized helper that sets `urlAtom` inside the current frame, disabling browser sync for SSR. */
const urlCache = cache((url: URL) => {
  const frame = frameCache();
  return frame.run(() => {
    urlAtom.sync.set(() => noop);
    return urlAtom.set(url);
  });
});

/**
 * Initializes the global {@link urlAtom} for server-side rendering.
 *
 * On the server there is no `window.location`, so atoms that depend on URL
 * (e.g. via `withSearchParams`) would read `undefined`. This function
 * sets `urlAtom` to a synthetic URL built from the provided input and
 * disables the browser history sync callback (since `pushState`/`popstate`
 * don't exist on the server). On the client this is handled automatically
 * through the browser History API, so `setupUrlAtom` is only needed in
 * server code.
 *
 * The value is memoized per RSC request via React's
 * [`cache()`](https://react.dev/reference/react/cache), so calling
 * `setupUrlAtom` multiple times with the same URL within one request is safe
 * and returns the same result.
 *
 * Must be called **before** any `reatomServerComponent` that reads
 * URL-dependent atoms.
 *
 * @overload
 * @param url - A full `URL` object. Used as-is.
 * @returns The same `URL` after setting it into `urlAtom`.
 *
 * @overload
 * @param input - An object with a `searchParams` record, as provided by
 *   Next.js page props (`{ searchParams: Rec<string> }`). A synthetic
 *   `http://localhost` URL is constructed with the given params.
 * @returns The constructed `URL` after setting it into `urlAtom`.
 *
 * @example Paginated episodes list with search params synced from Next.js
 * ```tsx
 * // model.ts
 * import { reatomNumber, withSearchParams, computed, withAsyncData, wrap } from "@reatom/core";
 *
 * export const page = reatomNumber(1).extend(
 *   withSearchParams("page", (page) => Number(page)),
 * );
 *
 * export const fetchEpisodes = computed(async () => {
 *   const res = await wrap(fetch(`https://rickandmortyapi.com/api/episode?page=${page()}`));
 *   return wrap(res.json());
 * }, "fetchEpisodes").extend(withAsyncData());
 *
 * // page.tsx — sync search params then fetch
 * export default reatomServerComponent(
 *   async ({ searchParams }: { searchParams: Promise<Rec> }) => {
 *     setupUrlAtom({ searchParams: await wrap(searchParams) });
 *     await wrap(fetchEpisodes());
 *     return <EpisodesList />;
 *   },
 * );
 * ```
 *
 * @see {@link withSearchParams} from `@reatom/core` — atom extension for binding to URL query params.
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional — Next.js `searchParams` prop reference.
 * @see https://react.dev/reference/react/cache — React `cache()` reference.
 */
export const setupUrlAtom: {
  (url: URL): URL;
  ({ searchParams }: { searchParams: Rec<string> }): URL;
} = (input) => {
  if (input instanceof URL) return urlCache(input);

  const url = new URL("http://localhost");
  Object.entries(input.searchParams).forEach(([k, v]) =>
    Array.isArray(v)
      ? v.forEach((v) => url.searchParams.append(k, v))
      : v && url.searchParams.set(k, v),
  );

  return urlCache(url);
};
