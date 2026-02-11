'use client'

import { reatomComponent } from "@reatom/react"
import { anotherTestAtom } from "./page"

export const ClientComponent = reatomComponent(() => {
    return <p>Client component: {anotherTestAtom()}</p>
})