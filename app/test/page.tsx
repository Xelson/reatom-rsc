import { reatomNumber, Rec, withSearchParams, wrap } from "@reatom/core";
import { reatomServerComponent, setupUrlAtom } from "../reatom-rsc";

const pageAtom = reatomNumber(0).extend(withSearchParams("page"));

export default reatomServerComponent(
  async ({ searchParams }: { searchParams: Promise<Rec> }) => {
    setupUrlAtom({ searchParams: await wrap(searchParams) });

    return (
      <p>
        Page: {pageAtom()}
      </p>
    );
  },
);
