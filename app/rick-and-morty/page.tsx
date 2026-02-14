import {
  Rec,
  wrap,
} from "@reatom/core";
import { reatomServerComponent, setupUrlAtom } from "../reatom-rsc";
import { EpisodesList, EpisodesListPagination } from "./list";
import { fetchEpisodes } from "./model";

export default reatomServerComponent(
  async ({ searchParams }: { searchParams: Promise<Rec> }) => {
    setupUrlAtom({ searchParams: await wrap(searchParams) });
    await wrap(fetchEpisodes());

    const data = fetchEpisodes.data()

    return (
      <section className="container mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Rick and Morty Episodes</h1>
        <pre>
          Pages: {data.info.pages}
          Count: {data.info.count}
        </pre>

        <EpisodesList />
        <EpisodesListPagination />
      </section>
    );
  },
);
