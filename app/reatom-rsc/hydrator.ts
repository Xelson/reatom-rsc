"use client";

import { useMemo } from "react";
import { memoryStorage, type Snapshot } from "./storage";

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

export const ReatomHydrator = ({ snapshotDiff }: ReatomHydratorProps) => {
  useMemo(() => {
    if(typeof window !== 'undefined')
      memoryStorage.snapshotAtom.set((snapshot) => applySnapshotDiff(snapshot, snapshotDiff));
  }, [snapshotDiff]);

  return null;
};
