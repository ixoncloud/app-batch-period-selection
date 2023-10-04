import type { Metrics } from "./data.service";

type CleanMetrics = { time: number; batchTrigger: any; columns: any[] }[];

export type ProcessedBatch = {
  endTime: number;
  startTime: number;
  columns: any[];
};

export function metricsToBatchData(
  metrics: Metrics,
  batchStartValue: string,
  batchEndValue: string
): ProcessedBatch[] {
  const cleanMetrics: CleanMetrics = formatMetrics(metrics);
  const chronologicalMetrics = cleanMetrics.slice().reverse();
  return processBatch(chronologicalMetrics, batchStartValue, batchEndValue)
    .slice()
    .reverse();
}

function formatMetrics(metrics: Metrics) {
  const metricsWithValues = metrics.map((m) => {
    const batchTrigger = m.metrics[0].value
      ? String(m.metrics[0].value.getValue()) // to string
      : null;
    const columnsWithoutHeading = m.metrics.slice(1).map((c) => {
      const column = c.value ? c.value.getValue() : null;
      return column;
    });
    return {
      time: m.time,
      batchTrigger,
      columns: columnsWithoutHeading,
    };
  });
  return metricsWithValues;
}

function determineColumns(
  chronologicalMetrics: CleanMetrics,
  batchStartIndex: number,
  batchEndIndex: number
) {
  const columns =
    chronologicalMetrics.slice(batchStartIndex, batchEndIndex).find((m) => {
      const hasColumns = !!m.columns.length;
      const columnsHasValues = m.columns.find((c) => c === null) === undefined;
      return hasColumns && columnsHasValues;
    })?.columns || [];

  if (!columns.length) {
    const metricBeforeStart = chronologicalMetrics[batchStartIndex - 1];

    if (!metricBeforeStart) {
      // metricBeforeStart is not available if there are no columns defined
      return columns;
    }

    const diffLessThanOrEqualTo100 =
      chronologicalMetrics[batchStartIndex].time - metricBeforeStart.time <=
      100;
    const columnsHasValues =
      metricBeforeStart.columns.find((c) => c === null) === undefined;
    return diffLessThanOrEqualTo100 && columnsHasValues
      ? metricBeforeStart.columns
      : columns;
  }
  return columns;
}

function processBatch(
  chronologicalMetrics: { time: number; batchTrigger: any; columns: any[] }[],
  batchStartValue: any,
  batchEndValue: any,
  batches: ProcessedBatch[] = []
) {
  const batchStartIndex = chronologicalMetrics.findIndex(
    (m) => m.batchTrigger === batchStartValue
  );
  if (batchStartIndex === -1) {
    return batches;
  }
  const metricsWithoutStart = chronologicalMetrics.map((m, i) =>
    i <= batchStartIndex ? { batchTrigger: undefined } : m
  );
  const batchEndIndex = metricsWithoutStart.findIndex(
    (m) => m.batchTrigger === batchEndValue
  );
  if (batchEndIndex === -1) {
    return batches;
  }
  const columns = determineColumns(
    chronologicalMetrics,
    batchStartIndex,
    batchEndIndex
  );
  const batch = {
    endTime: chronologicalMetrics[batchEndIndex].time,
    startTime: chronologicalMetrics[batchStartIndex].time,
    columns,
  };
  return processBatch(
    chronologicalMetrics.slice(batchEndIndex),
    batchStartValue,
    batchEndValue,
    [...batches, batch]
  );
}
