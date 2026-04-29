"use client";

import { PropsWithChildren, Suspense } from "react";
import { ReatomNextJsContextProvider } from "../reatom-nextjs/Provider";
import { connectLogger, context } from "@reatom/core";

const rootFrame = context.start();
rootFrame.run(connectLogger);

export function Providers({ children }: PropsWithChildren) {
  return (
    <Suspense>
      <ReatomNextJsContextProvider frame={rootFrame}>
        {children}
      </ReatomNextJsContextProvider>
    </Suspense>
  );
}
