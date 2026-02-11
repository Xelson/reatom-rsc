import { cache } from "react";
import { frameCache } from "./frame-cache";
import { noop, Rec, urlAtom } from "@reatom/core";

const urlCache = cache((url: URL) => {
  const frame = frameCache();
  return frame.run(() => {
    urlAtom.sync.set(() => noop);
    return urlAtom.set(url);
  });
});

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
