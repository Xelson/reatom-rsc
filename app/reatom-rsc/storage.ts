import { createMemStorage, PersistRecord, reatomPersist, Rec } from "@reatom/core";

export const memoryStorage = createMemStorage({ name: "ssr" });
export const withSsr = reatomPersist(memoryStorage);

export type Snapshot = Rec<PersistRecord>;