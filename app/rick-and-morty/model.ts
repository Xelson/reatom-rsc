import {
  computed,
  reatomNumber,
  withAsyncData,
  withSearchParams,
  wrap,
} from "@reatom/core";
import { withSsr } from "../reatom-rsc";

export const page = reatomNumber(1, "fetchEpisodes.page").extend(
  withSearchParams("page", (page) => Number(page)),
);

export const fetchEpisodes = computed(async () => {
  const response = await wrap(
    fetch(`https://rickandmortyapi.com/api/episode?page=${page()}`),
  );
  return wrap(response.json());
}, "fetchEpisodes").extend(withAsyncData());

fetchEpisodes.data.extend(withSsr(fetchEpisodes.data.name));