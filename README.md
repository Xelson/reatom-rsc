# reatom-rsc

Seamless isomorphic rendering integration for [Reatom](https://reatom.dev) with React Server Components (RSC). Write your atoms once and use them on both the server and the client — state computed during SSR is automatically hydrated on the client with zero boilerplate.

## Key concepts

- **Server components only have access to atoms when wrapped in `reatomServerComponent`.** Without it, atom reads/writes have no effect during RSC render.
- **Atoms in RSC are static, atoms in client components are reactive.** A server component renders the atom value at request time; a client component (`reatomComponent`) subscribes to changes and re-renders on every update. On navigation, the server may re-render with fresh data and override the client value if the server snapshot is newer.
- **Search params require explicit setup on the server.** If atoms depend on URL via `withSearchParams`, call `setupUrlAtom` before rendering. On the client this happens automatically through the browser History API.
- **Every async operation inside `reatomServerComponent` must be wrapped in `wrap`.** This preserves the reatom execution context across async boundaries.

## How it works

1. You wrap your server components with `reatomServerComponent`. Inside that wrapper, any atom decorated with `withSsr` becomes trackable.
2. During server render, the library snapshots atom state **before** and **after** your component renders, computes a diff, and embeds a hidden `<ReatomHydrator>` client component into the tree.
3. On the client, `ReatomHydrator` applies the diff to the shared in-memory storage, so client components (via `reatomComponent` from `@reatom/react`) pick up the server-computed values immediately — no flash of default state.

## Public API

The package exports three symbols from `reatom-rsc/index.ts`:

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

## Example: episodes list with pagination

A complete example showing model → server page → client component flow.

### Model (`model.ts`)

Define atoms and async data fetching. Decorate only the data atom that needs to cross the server→client boundary:

```ts
import { computed, reatomNumber, withAsyncData, withSearchParams, wrap } from "@reatom/core";
import { withSsr } from "../reatom-rsc";

// reactive page number, synced with ?page= search param
export const page = reatomNumber(1, "fetchEpisodes.page").extend(
  withSearchParams("page", (page) => Number(page)),
);

// async computed — re-fetches when `page` changes
export const fetchEpisodes = computed(async () => {
  const res = await wrap(fetch(`https://rickandmortyapi.com/api/episode?page=${page()}`));
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
      <button onClick={wrap(() => page.increment())}>
        Next
      </button>
    </div>
  );
});
```

## Internal modules

| Module | Role |
|---|---|
| `storage.ts` | Creates the in-memory persist storage (`memoryStorage`) and the `withSsr` decorator |
| `frame-cache.ts` | Uses React `cache()` to create one isolated reatom context frame per RSC request |
| `hydrator.ts` | Client component that applies snapshot diffs to the client-side storage |
| `server-component.tsx` | Implements `reatomServerComponent` — snapshot diffing and `<ReatomHydrator>` injection |
| `url.ts` | SSR-safe `urlAtom` initialization for search params support |
