import { isInit, throwAbort } from "@reatom/core";

export const throwAbortOnHydration = () => {
  if (isInit() && typeof window !== "undefined") throwAbort("hydrated");
};
