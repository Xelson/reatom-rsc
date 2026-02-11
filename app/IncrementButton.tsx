'use client'

import { wrap } from "@reatom/core";
import { reatomComponent } from "@reatom/react";
import { pageAtom } from "./page";

export const IncrementButton = reatomComponent(() => (
    <button onClick={wrap(() => pageAtom.increment())}>increment ({pageAtom()})</button>
))