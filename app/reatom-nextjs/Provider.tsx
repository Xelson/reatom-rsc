"use client";

import { context, noop, RootFrame, urlAtom } from "@reatom/core";
import { PropsWithChildren, useState } from "react";
import { reatomContext } from "@reatom/react";
import { usePathname, useSearchParams } from "next/navigation";

type ReatomNextJsContextProviderProps = PropsWithChildren<{
  /**
   * Optional reatom context frame to use as the root for the whole client tree.
   *
   * - **Omitted** — the provider creates a fresh frame via `context.start()`
   *   and supplies it to all descendants. This is the simplest setup and what
   *   most apps need.
   * - **Provided** — the provider reuses the given frame instead of creating
   *   a new one. This lets you interact with the context at the top level
   *   *before* the React tree mounts (e.g. attach `connectLogger` at module
   *   scope, register top-level subscriptions, or share the frame with
   *   non-React code).
   */
  frame?: RootFrame;
}>;

/**
 * Root provider that wires the reatom context into a Next.js App Router tree.
 *
 * **You must wrap your application with this provider** (typically in
 * `app/layout.tsx`) for the integration to work correctly. Without it:
 *
 * - Client components share no reatom context, so atom reads/writes leak
 *   between requests on the server.
 * - Atoms that depend on the URL (via `withSearchParams` and friends) throw
 *   during the SSR pass of client components, because `urlAtom` is not
 *   initialized in that pass.
 *
 * ## What it does
 *
 * 1. **Creates (or reuses) a reatom context frame** and supplies it via
 *    `reatomContext.Provider` from `@reatom/react`. Every `reatomComponent`
 *    below reads from this frame.
 *
 * 2. **Initializes `urlAtom` during server-side rendering of client
 *    components.** Next.js renders client components to HTML in a separate
 *    React pass that does **not** share `React.cache()` with the RSC pass —
 *    so the `setupUrlAtom` call inside `reatomServerComponent`/page is
 *    invisible here. To bridge the gap, this provider reads `usePathname()`
 *    and `useSearchParams()` from `next/navigation` (both work during SSR and
 *    on the client), constructs a synthetic `URL`, and writes it into
 *    `urlAtom`. The browser History API sync callback is replaced with `noop`
 *    on the server.
 *
 *    On the client this is a no-op (`typeof window === 'undefined'` guard) —
 *    `urlAtom` is already wired by `@reatom/core` to the History API.
 *
 * The provider **must** be wrapped in a `<Suspense>` boundary at the layout
 * level. Next.js requires every consumer of `useSearchParams()` to have a
 * `<Suspense>` ancestor — otherwise the production build (`next build`)
 * fails. This is a hard Next.js constraint, not a soft optimization.
 *
 * ## The `frame` prop
 *
 * Without `frame`, the provider creates a new context frame internally and
 * propagates it to the whole tree.
 *
 * Pass an explicit `frame` when you need to touch the context **before** the
 * provider mounts — most commonly to attach a logger or other top-level
 * integrations to the same context the React tree will use.
 *
 * @example Basic usage in `app/layout.tsx`
 * ```tsx
 * import { Suspense } from "react";
 * import { ReatomNextJsContextProvider } from "./reatom-nextjs/Provider";
 *
 * export default function RootLayout({
 *   children,
 * }: {
 *   children: React.ReactNode;
 * }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <Suspense>
 *           <ReatomNextJsContextProvider>{children}</ReatomNextJsContextProvider>
 *         </Suspense>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 *
 * @example Reusing a custom frame to attach `connectLogger`
 * ```tsx
 * // app/reatom-frame.ts
 * import { connectLogger, context } from "@reatom/core";
 *
 * // create the frame at module scope so non-React code can use it too
 * export const rootFrame = context.start();
 *
 * // attach the logger before any component reads or writes atoms
 * connectLogger(rootFrame);
 *
 * // app/layout.tsx
 * import { Suspense } from "react";
 * import { ReatomNextJsContextProvider } from "./reatom-nextjs/Provider";
 * import { rootFrame } from "./reatom-frame";
 *
 * export default function RootLayout({ children }) {
 *   return (
 *     <html lang="en">
 *       <body>
 *         <Suspense>
 *           <ReatomNextJsContextProvider frame={rootFrame}>
 *             {children}
 *           </ReatomNextJsContextProvider>
 *         </Suspense>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 *
 * @see {@link reatomServerComponent} — RSC wrapper that captures atom state
 *   for hydration.
 * @see {@link setupUrlAtom} — RSC-side `urlAtom` initialization (separate
 *   render pass from the client-component SSR pass handled here).
 * @see https://reatom.dev/package/core/ — `urlAtom`, `context`, and
 *   `RootFrame` reference.
 * @see https://nextjs.org/docs/app/api-reference/functions/use-search-params
 *   — Next.js `useSearchParams` reference and its Suspense semantics.
 */
export function ReatomNextJsContextProvider({
  children,
  frame: propsFrame,
}: ReatomNextJsContextProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [frame] = useState(() => {
    const frame = propsFrame ?? context.start();
    if (typeof window === "undefined") {
      frame.run(() => {
        urlAtom.sync.set(() => noop);
        urlAtom.set(new URL(`${pathname}?${searchParams}`, "http://localhost"));
      });
    }
    return frame;
  });

  return (
    <reatomContext.Provider value={frame}>{children}</reatomContext.Provider>
  );
}
