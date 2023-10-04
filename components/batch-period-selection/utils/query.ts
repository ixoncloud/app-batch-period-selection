import { isNumber } from "lodash-es";

import type { ComponentContextAggregatedMetricInput } from "@ixon-cdk/types";

export function mapMetricInputToQuery(
  metric: ComponentContextAggregatedMetricInput
) {
  return {
    selector: metric.selector,
    ...(metric.aggregator ? { postAggr: metric.aggregator } : {}),
    ...(metric.transform ? { postTransform: metric.transform } : {}),
    ...(metric.unit ? { unit: metric.unit } : {}),
    ...(isNumber(metric.decimals) ? { decimals: Number(metric.decimals) } : {}),
    ...(isNumber(metric.factor) ? { factor: Number(metric.factor) } : {}),
  };
}
