import { isInit, throwAbort } from "@reatom/core";

export const throwOnHydration = () => {
  if (isInit() && typeof window !== "undefined") throwAbort("hydrated");
};
