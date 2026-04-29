/* eslint-disable @typescript-eslint/no-explicit-any */
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

type Response = {
  info: any;
  results: any[];
};

export const fetchEpisodes = computed(async () => {
  const response = await wrap(
    fetch(`https://rickandmortyapi.com/api/episode?page=${page()}`),
  );
  return wrap(response.json()) as Promise<Response>;
}, "fetchEpisodes").extend(withAsyncData());

fetchEpisodes.data.extend(withSsr(fetchEpisodes.data.name));
