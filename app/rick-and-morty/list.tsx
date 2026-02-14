"use client";

import { reatomComponent } from "@reatom/react";
import { memo, wrap } from "@reatom/core";
import { fetchEpisodes, page } from "./model";

export const EpisodesList = reatomComponent(() => {
  return (
    <ul className="space-y-2">
      {fetchEpisodes
        .data()
        ?.results.map((episode: { id: number; name: string }) => (
          <li key={episode.id} className="p-2 border rounded">
            {episode.name}
          </li>
        ))}
    </ul>
  );
}, 'EpisodesList');

export const EpisodesListPagination = reatomComponent(() => {
  const pages = memo(() => fetchEpisodes.data().info.pages)

  return (
    <div className="flex justify-between items-center mt-4">
      <button
        onClick={wrap(() => page.decrement())}
        disabled={page() <= 1}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
      >
        Previous
      </button>
      <span>Page {page()}</span>
      <button
        onClick={wrap(() => page.increment())}
        disabled={page() >= pages}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
      >
        Next
      </button>
    </div>
  );
}, 'EpisodesListPagination');
