import { clearStack, context } from "@reatom/core";
import { cache } from "react";

/**
 * Creates an isolated reatom context frame per RSC request via React `cache()`.
 * Multiple calls within the same request return the same frame.
 */
export const frameCache = cache(() => {
  clearStack();
  return context.start();
});
