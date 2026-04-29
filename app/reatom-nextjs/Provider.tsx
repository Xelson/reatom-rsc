"use client";

import { context, noop, RootFrame, urlAtom } from "@reatom/core";
import { PropsWithChildren, useState } from "react";
import { reatomContext } from "@reatom/react";
import { usePathname, useSearchParams } from "next/navigation";

export function ReatomNextJsContextProvider({
  children,
  frame: propsFrame,
}: PropsWithChildren & { frame?: RootFrame }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [frame] = useState(() => {
    const frame = propsFrame ?? context.start();
    if (typeof window === "undefined") {
      frame.run(() => {
        urlAtom.sync.set(() => noop);
        urlAtom.set(new URL(`${pathname}?${searchParams}`, "http://localhost"));
      });
    }
    return frame;
  });

  return (
    <reatomContext.Provider value={frame}>{children}</reatomContext.Provider>
  );
}
