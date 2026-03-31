"use client";

import { useMemo } from "react";
import { memoryStorage, type Snapshot } from "./storage";
import { reatomComponent } from "@reatom/react";

/** Merges a snapshot diff into the current client snapshot, preferring newer timestamps. */
const applySnapshotDiff = (currentSnapshot: Snapshot, diff: Snapshot) => {
  const next = { ...currentSnapshot };
  let modified = false

  for (const key in diff) {
    const incoming = diff[key];
    if (!incoming) continue;

    const existing = currentSnapshot[key];
    if (!existing || incoming.timestamp > existing.timestamp) {
      next[key] = incoming;
      modified = true
    }
  }

  return modified ? next : currentSnapshot;
};

type ReatomHydratorProps = {
  snapshotDiff: Snapshot;
};

/** Client component that applies a server-rendered snapshot diff to the client-side memory storage. Renders nothing. */
export const ReatomHydrator = reatomComponent(({ snapshotDiff }: ReatomHydratorProps) => {
  useMemo(() => {
    if(typeof window !== 'undefined')
      memoryStorage.snapshotAtom.set((snapshot) => applySnapshotDiff(snapshot, snapshotDiff));
  }, [snapshotDiff]);

  return null;
}, '_SsrSnapshotHydrator');
