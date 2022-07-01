export function metricsToBatchData(
  metrics: { time: number; metrics: { value: any }[] }[],
  batchStartValue: string,
  batchEndValue: string
) {
  const cleanMetrics: { time: number; batchTrigger: any; columns: any[] }[] =
    formatMetrics(metrics);
  const chronologicalMetrics = cleanMetrics.slice().reverse();
  return processBatch(chronologicalMetrics, batchStartValue, batchEndValue)
    .slice()
    .reverse();
}

function formatMetrics(metrics) {
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
  chronologicalMetrics,
  batchStartIndex,
  batchEndIndex
) {
  const columns =
    chronologicalMetrics.slice(batchStartIndex, batchEndIndex).find((m) => {
      const hasColumns = !!m.columns.length;
      const columnsHasValues = m.columns.find((c) => c === null) === undefined;
      return hasColumns && columnsHasValues;
    })?.columns || [];

  if (!columns.length) {
    const metricBeforeStart = chronologicalMetrics[batchStartIndex - 1];
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
  batchStartValue,
  batchEndValue,
  batches = []
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
