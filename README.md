# reatom-rsc

Seamless isomorphic rendering integration for [Reatom](https://reatom.dev) with React Server Components (RSC). Write your atoms once and use them on both the server and the client — state computed during SSR is automatically hydrated on the client with zero boilerplate.

## Key concepts

- **The whole app must be wrapped in `<ReatomNextJsContextProvider>`.** The provider supplies a shared reatom context to all client components and initializes `urlAtom` during the server-side rendering pass of client components. Without it, URL-dependent atoms (`withSearchParams`) throw during SSR, and atoms have no shared client-tree context.
- **Server components only have access to atoms when wrapped in `reatomServerComponent`.** Without it, atom reads/writes have no effect during RSC render.
- **Atoms in RSC are static, atoms in client components are reactive.** A server component renders the atom value at request time; a client component (`reatomComponent`) subscribes to changes and re-renders on every update. On navigation, the server may re-render with fresh data and override the client value if the server snapshot is newer.
- **Search params require explicit setup on the server.** If atoms depend on URL via `withSearchParams`, call `setupUrlAtom` inside the RSC before rendering. On the client this happens automatically through the browser History API; the SSR pass for client components is handled by `ReatomNextJsContextProvider`.
- **Async computeds with `withSsr` should call `throwAbortOnHydration` after collecting dependencies** to avoid re-fetching the same data on the first client render.
- **Every async operation inside `reatomServerComponent` must be wrapped in `wrap`.** This preserves the reatom execution context across async boundaries.

## Setup

Wrap your application with `<ReatomNextJsContextProvider>` in the root layout.

> ⚠️ **The provider must be placed inside a `<Suspense>` boundary.** Internally it calls `useSearchParams()` from `next/navigation`, and Next.js requires every consumer of that hook to have a `<Suspense>` ancestor — otherwise the production build (`next build`) fails. See [Next.js docs on `useSearchParams`](https://nextjs.org/docs/app/api-reference/functions/use-search-params).

```tsx
// app/layout.tsx
import { Suspense } from "react";
import { ReatomNextJsContextProvider } from "./reatom-nextjs/Provider";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Suspense>
          <ReatomNextJsContextProvider>{children}</ReatomNextJsContextProvider>
        </Suspense>
      </body>
    </html>
  );
}
```

If you need to interact with the reatom context at the top level — e.g. to attach a logger before any component reads atoms — create the frame **inside the highest client component** (a conventional `Providers` wrapper) and pass it through the `frame` prop.

> ⚠️ **Why a client component, not a module-level constant?** Module code runs independently on the server and on the client. A `context.start()` created at module scope would create *separate* frames on each side, and a logger attached on the server module would never appear on the client. Putting the frame in a client component is the only way to make top-level frame setup actually reach the browser.

```tsx
// app/Providers.tsx
"use client";

import { connectLogger, context } from "@reatom/core";
import { useState, type PropsWithChildren } from "react";
import { ReatomNextJsContextProvider } from "./reatom-nextjs/Provider";

export function Providers({ children }: PropsWithChildren) {
  const [rootFrame] = useState(() => {
    const frame = context.start();
    // run inside the frame so the logger is attached to *this* context
    frame.run(connectLogger);
    return frame;
  });

  return (
    <ReatomNextJsContextProvider frame={rootFrame}>
      {children}
    </ReatomNextJsContextProvider>
  );
}

// app/layout.tsx
import { Suspense } from "react";
import { Providers } from "./Providers";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Suspense>
          <Providers>{children}</Providers>
        </Suspense>
      </body>
    </html>
  );
}
```

You can scope the setup to a specific environment by guarding the `frame.run(...)` call:

- **Both client and SSR pass of client components** — call unconditionally (as above). Useful when you want the same observability on both sides.
- **Client only** — wrap in `if (typeof window !== 'undefined')`. Most common for browser-only tooling like `connectLogger` to keep server logs clean.
- **SSR only** — wrap in `if (typeof window === 'undefined')`. Rare, but useful for server-only diagnostics.

When `frame` is omitted the provider creates a fresh context internally; when provided it reuses the given one.

## How it works

1. You wrap your server components with `reatomServerComponent`. Inside that wrapper, any atom decorated with `withSsr` becomes trackable.
2. During server render, the library snapshots atom state **before** and **after** your component renders, computes a diff, and embeds a hidden `<ReatomHydrator>` client component into the tree.
3. On the client, `ReatomHydrator` applies the diff to the shared in-memory storage, so client components (via `reatomComponent` from `@reatom/react`) pick up the server-computed values immediately — no flash of default state.

## Public API

The integration exports four symbols from `reatom-rsc/index.ts` and one from `reatom-nextjs/Provider.tsx`:

---

### `ReatomNextJsContextProvider`

Root client provider that supplies a shared reatom context to the whole app and initializes `urlAtom` during the server-side rendering pass of client components. Required wrapper at the layout level. Internally reads `usePathname()` and `useSearchParams()` from `next/navigation` to construct the URL during SSR; on the client this is a no-op since `urlAtom` is wired to the History API.

```ts
function ReatomNextJsContextProvider(props: {
  children: React.ReactNode;
  /**
   * If omitted — a fresh `context.start()` frame is created internally.
   * If provided — the supplied frame is reused (handy for top-level
   * integrations like `connectLogger`).
   */
  frame?: RootFrame;
}): JSX.Element;
```

---

### `reatomServerComponent`

Wraps an RSC render function to capture atom state changes during render, compute a diff, and inject a `<ReatomHydrator>` to transfer that diff to the client. Supports nesting — inner server components produce their own diffs independently.

```ts
function reatomServerComponent<Props extends Rec = {}>(
  renderFn: (props: Props) => React.ReactNode | Promise<React.ReactNode>,
): (props: Props) => Promise<React.ReactNode>;
```

---

### `withSsr`

Atom decorator that opts an atom into server-to-client state transfer. Built on top of `reatomPersist` with an in-memory storage backend. Typically applied to data atoms that hold fetched results (e.g. `fetchEpisodes.data`), not to every atom in the app.

```ts
const withSsr: WithPersist; // (key: string) => AtomExtension
```

---

### `setupUrlAtom`

Initializes `urlAtom` for SSR. On the server there is no `window.location`, so atoms depending on `withSearchParams` would read `undefined`. This function sets `urlAtom` to a synthetic URL from the provided input and disables browser history sync. On the client this is handled automatically, so `setupUrlAtom` is only needed in server code.

```ts
function setupUrlAtom(url: URL): URL;
function setupUrlAtom(input: { searchParams: Rec<string> }): URL;
```

---

### `throwAbortOnHydration`

Bail-out helper for async computeds whose `.data` is hydrated from the server via `withSsr`. Call it **after** reading dependencies and **before** the actual side effect — on the first client render it aborts the computed (without raising an error to consumers) so the hydrated value is preserved instead of being overwritten by a redundant client-side fetch. On subsequent dependency changes the body runs in full and triggers a real refetch.

The function only aborts when both `isInit()` is true and `typeof window !== 'undefined'` — on the server the body always runs.

```ts
function throwAbortOnHydration(): void;
```

```ts
export const fetchEpisodes = computed(async () => {
  const p = page(); // 1. read deps to wire the dependency graph
  throwAbortOnHydration(); // 2. bail out on first client render
  const res = await wrap(
    // 3. real fetch — runs on server / on invalidations
    fetch(`https://rickandmortyapi.com/api/episode?page=${p}`),
  );
  return wrap(res.json());
}, "fetchEpisodes").extend(withAsyncData());
```

---

## Example: episodes list with pagination

A complete example showing model → server page → client component flow.

### Model (`model.ts`)

Define atoms and async data fetching. Decorate only the data atom that needs to cross the server→client boundary:

```ts
import {
  computed,
  reatomNumber,
  withAsyncData,
  withSearchParams,
  wrap,
} from "@reatom/core";
import { throwAbortOnHydration, withSsr } from "../reatom-rsc";

// reactive page number, synced with ?page= search param
export const page = reatomNumber(1, "fetchEpisodes.page").extend(
  withSearchParams("page", (page) => Number(page)),
);

// async computed — re-fetches when `page` changes
export const fetchEpisodes = computed(async () => {
  // 1. read deps first so the dependency graph is wired
  const p = page();
  // 2. bail out on the first client render — `.data` is already hydrated
  throwAbortOnHydration();
  // 3. real fetch — runs on server, and again on later invalidations
  const res = await wrap(
    fetch(`https://rickandmortyapi.com/api/episode?page=${p}`),
  );
  return wrap(res.json());
}, "fetchEpisodes").extend(withAsyncData());

// mark the data atom for SSR hydration
fetchEpisodes.data.extend(withSsr(fetchEpisodes.data.name));
```

### Server page (`page.tsx`)

Sync search params, trigger the fetch, render the page. Atoms here are **static** — they capture the value at request time:

```tsx
import { Rec, wrap } from "@reatom/core";
import { reatomServerComponent, setupUrlAtom } from "../reatom-rsc";
import { EpisodesList, EpisodesListPagination } from "./list";
import { fetchEpisodes } from "./model";

export default reatomServerComponent(
  async ({ searchParams }: { searchParams: Promise<Rec> }) => {
    // 1. sync URL so `page` atom reads ?page= from Next.js props
    setupUrlAtom({ searchParams: await wrap(searchParams) });

    // 2. trigger fetch — data will be captured by withSsr
    await wrap(fetchEpisodes());

    return (
      <section>
        <h1>Rick and Morty Episodes</h1>
        {/* client components below will receive hydrated data */}
        <EpisodesList />
        <EpisodesListPagination />
      </section>
    );
  },
);
```

### Client components (`list.tsx`)

Client components use `reatomComponent` — they receive server-hydrated data on first render and then react to changes (e.g. pagination clicks):

```tsx
"use client";

import { reatomComponent } from "@reatom/react";
import { wrap } from "@reatom/core";
import { fetchEpisodes, page } from "./model";

// reactive — re-renders when fetchEpisodes.data changes
export const EpisodesList = reatomComponent(() => {
  return (
    <ul>
      {fetchEpisodes.data()?.results.map((ep: { id: number; name: string }) => (
        <li key={ep.id}>{ep.name}</li>
      ))}
    </ul>
  );
});

// page navigation — changing `page` triggers a re-fetch on the client
export const EpisodesListPagination = reatomComponent(() => {
  return (
    <div>
      <button onClick={wrap(() => page.decrement())} disabled={page() <= 1}>
        Previous
      </button>
      <span>Page {page()}</span>
      <button onClick={wrap(() => page.increment())}>Next</button>
    </div>
  );
});
```

## Internal modules

| Module                            | Role                                                                                                                             |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `reatom-rsc/storage.ts`           | Creates the in-memory persist storage (`memoryStorage`) and the `withSsr` decorator                                              |
| `reatom-rsc/frame-cache.ts`       | Uses React `cache()` to create one isolated reatom context frame per RSC request                                                 |
| `reatom-rsc/hydrator.ts`          | Client component that applies snapshot diffs to the client-side storage                                                          |
| `reatom-rsc/server-component.tsx` | Implements `reatomServerComponent` — snapshot diffing and `<ReatomHydrator>` injection                                           |
| `reatom-rsc/url.ts`               | SSR-safe `urlAtom` initialization for search params support                                                                      |
| `reatom-rsc/hydration.ts`         | `throwAbortOnHydration` — first-render bail-out for SSR-hydrated computeds                                                       |
| `reatom-nextjs/Provider.tsx`      | `ReatomNextJsContextProvider` — root provider that wires reatom context and bridges `urlAtom` into the client-component SSR pass |

## What's next

The API in this repo is still evolving and being battle-tested. The roadmap:

1. **Distribute `reatom-rsc` via [reatom reusables](https://reatom.github.io/reusables/)** — that's the immediate next step. Reusables are a great fit while the API is iterating: changes can ship and get feedback without a full package release cycle.

2. **Promote `reatom-rsc` into the official `@reatom/react/rsc` entry point.** The current package is intentionally framework-agnostic — RSC has long been a React feature, not a Next.js one — so it belongs alongside `@reatom/react` rather than in a Next.js-specific package.

3. **Move Next.js–specific glue into `@reatom/next-js`.** Once the framework-agnostic core lives in `@reatom/react/rsc`, anything that depends on `next/navigation` or etc, Next.js conventions, or App Router specifics (currently `ReatomNextJsContextProvider`) will graduate into a dedicated `@reatom/next-js` package.

Until then, expect API churn — pin your dependency and watch the changelog.
