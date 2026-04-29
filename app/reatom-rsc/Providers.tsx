"use client";

import { PropsWithChildren, Suspense, useMemo } from "react";
import { ReatomNextJsContextProvider } from "../reatom-nextjs/Provider";
import { connectLogger, context } from "@reatom/core";

export function Providers({ children }: PropsWithChildren) {
  const rootFrame = useMemo(() => {
    const frame = context.start();
    if (typeof window !== "undefined") frame.run(connectLogger);
    return frame;
  }, []);

  return (
    <Suspense>
      <ReatomNextJsContextProvider frame={rootFrame}>
        {children}
      </ReatomNextJsContextProvider>
    </Suspense>
  );
}
