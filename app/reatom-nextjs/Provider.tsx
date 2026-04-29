"use client";

import { noop, urlAtom } from "@reatom/core";
import { PropsWithChildren, useState } from "react";
import { reatomContext } from "@reatom/react";
import { usePathname, useSearchParams } from "next/navigation";
import { frameCache } from "../reatom-rsc/frame-cache";

export function ReatomNextJsContextProvider({ children }: PropsWithChildren) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const frame = frameCache();

  useState(() => {
    if (typeof window === "undefined") {
      frame.run(() => {
        urlAtom.sync.set(() => noop);
        urlAtom.set(new URL(`${pathname}?${searchParams}`, "http://localhost"));
      });
    }
  });

  return (
    <reatomContext.Provider value={frame}>{children}</reatomContext.Provider>
  );
}
