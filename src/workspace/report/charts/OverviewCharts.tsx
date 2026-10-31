import { factFunnel, factStateCounts, verdictCounts } from "@/workspace/report/reportCharts";
import type { AssessmentResult } from "@/review/types";
import { FunnelChart } from "./FunnelChart";
import { StackedBar } from "./StackedBar";

/** The analytics block at the top of the review: the whole result in four pictures. */
export function OverviewCharts({ result }: { result: AssessmentResult }) {
  const verdicts = verdictCounts(result);
  return (
    <section className="overview-charts" aria-label="Analytics">
      <FunnelChart stages={factFunnel(result)} empty="No fact was found in the interview, so nothing travels through your design." />
      <StackedBar title="Every fact, and how it ended" slices={factStateCounts(result)} empty="This case has no facts." />
      <StackedBar title="Justify: does each step follow?" slices={verdicts.justify} empty="There was nothing in the doc to judge." />
      <StackedBar title="Fit: does the design handle the case?" slices={verdicts.fit} empty="This case has no scenarios." />
    </section>
  );
}
