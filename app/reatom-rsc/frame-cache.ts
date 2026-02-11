import { clearStack, context } from "@reatom/core";
import { cache } from "react";

export const frameCache = cache(() => {
  clearStack();
  return context.start();
});
