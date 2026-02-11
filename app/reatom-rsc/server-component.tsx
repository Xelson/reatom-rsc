import { Rec, wrap } from "@reatom/core";
import { memoryStorage, Snapshot } from "./storage";
import { ReatomHydrator } from "./hydrator";
import { frameCache } from "./frame-cache";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export const reatomServerComponent = <Props extends Rec = {}>(
  renderFn: (props: Props) => React.ReactNode | Promise<React.ReactNode>,
) => {
  return (props: Props) => {
    const frame = frameCache();
    return frame.run(async () => {
      const beforeSnapshot = { ...memoryStorage.snapshotAtom() };
      const node = await wrap(renderFn(props));
      const afterSnapshot = memoryStorage.snapshotAtom();
      const diff = diffSnapshot(beforeSnapshot, afterSnapshot);

      return (
        <>
          {node}
          <ReatomHydrator snapshotDiff={diff} />
        </>
      );
    });
  };
};

const diffSnapshot = (before: Snapshot, after: Snapshot) => {
  const diff: Snapshot = {};

  for (const key in after) {
    const next = after[key];
    const prev = before[key];

    if (!prev || prev.id !== next.id || prev.version !== next.version) {
      diff[key] = next;
    }
  }
  return diff;
};