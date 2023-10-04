import { mapMetricInputToQuery } from "../utils/query";
import { sortedFindIndex } from "../utils/array";

import type {
  ComponentContext,
  LoggingDataClient,
  LoggingDataMetric,
  LoggingDataQuery,
  LoggingDataValue,
  ComponentContextAggregatedMetricInput,
} from "@ixon-cdk/types";

const queryLimit = 5000;

export interface TransformedMetrics {
  time: number;
  metrics: { value: LoggingDataValue }[];
}

export type Metrics = {
  time: number;
  metrics: { value: LoggingDataValue }[];
}[];

export class DataService {
  _context;
  _client;
  _setMetrics;
  _offset;
  _metrics: TransformedMetrics[];
  _loading;
  _hasNext;
  _hasLast;
  _activeQueryCancelCallback: Function | null;

  constructor(
    context: ComponentContext,
    client: LoggingDataClient,
    metricsFn: Function
  ) {
    this._context = context;
    this._client = client;
    this._setMetrics = metricsFn;
    this._offset = 0;
    this._metrics = [];
    this._loading = false;
    this._hasNext = true;
    this._hasLast = false;
    this._activeQueryCancelCallback = null;
  }

  destroy() {}

  initializeData() {
    this._offset = 0;
    this._metrics = [];
    this._loading = false;
    this._hasNext = true;
    this._hasLast = true;
    this.loadNext();
  }

  loadNext() {
    if (this._loading) {
      return;
    } else if (!this._hasNext) {
      if (this._hasLast) {
        this._loadLast();
      }
      return;
    }
    this._loading = true;
    if (this._activeQueryCancelCallback) {
      this._activeQueryCancelCallback();
    }
    if (this._context.inputs.batchTrigger && this._context.inputs.metrics) {
      const queries = [
        this._context.inputs.batchTrigger,
        ...this._context.inputs.metrics.map((a: { column: any }) => a.column),
      ].map((input) => {
        return {
          ...mapMetricInputToQuery(input.metric),
          offset: this._offset,
          limit: queryLimit,
        };
      }) as LoggingDataQuery[];
      this._offset += queryLimit;
      this._activeQueryCancelCallback = this._client.query(
        queries,
        (metrics) => {
          this._hasNext = metrics.some((m) => m.length > 0);
          this._setMetrics(
            this._transformMetrics(metrics, queries),
            this._hasNext
          );
          if (this._activeQueryCancelCallback) {
            this._activeQueryCancelCallback();
            this._activeQueryCancelCallback = null;
          }

          this._loading = false;

          this.loadNext();
        }
      );
    }
  }

  reset() {
    if (this._activeQueryCancelCallback) {
      this._activeQueryCancelCallback();
    }
    this.initializeData();
  }

  _loadLast() {
    if (this._loading) {
      return;
    }
    this._loading = true;

    const queries = [
      this._context.inputs.batchTrigger,
      ...this._context.inputs.metrics.map((a: { column: any }) => a.column),
    ].map((metric) => ({
      ...mapMetricInputToQuery(metric.metric),
      postAggr: "last",
      limit: 1,
      from: new Date(
        2 * this._context.timeRange.from - this._context.timeRange.to
      ).toISOString(),
      to: new Date(this._context.timeRange.from).toISOString(),
    })) as LoggingDataQuery[];

    this._activeQueryCancelCallback = this._client.query(queries, (metrics) => {
      this._setMetrics(this._transformMetrics(metrics, queries), false);
      if (this._activeQueryCancelCallback) {
        this._activeQueryCancelCallback();
        this._activeQueryCancelCallback = null;
      }
      this._hasLast = false;
      this._loading = false;
    });
  }

  _sortedTransposedMetrics(
    metrics: LoggingDataMetric[][],
    queries: LoggingDataQuery[]
  ): TransformedMetrics[] {
    const selectors = queries.map((query) => query.selector);
    const queryIndexMap = this._createQueryIndexMap(metrics, queries);

    return metrics.reduce(
      (
        accAll: TransformedMetrics[],
        queryMetrics: LoggingDataMetric[],
        queryIndex: number
      ) => {
        const qi = queryIndexMap.has(queryIndex)
          ? queryIndexMap.get(queryIndex)
          : queryIndex;
        return queryMetrics.reduce((acc: any, metric) => {
          const findIndex = acc.findIndex(
            (e: TransformedMetrics) => e.time <= metric.time
          );
          if (findIndex < 0) {
            acc.push({
              time: metric.time,
              metrics: Array.from({ length: selectors.length }, (v, k) => ({
                value: k === qi ? metric.value : null,
              })),
            });
          } else if (acc[findIndex].time < metric.time) {
            // findIndex points at the first element *after* the current metric
            acc.splice(findIndex, 0, {
              time: metric.time,
              metrics: Array.from({ length: selectors.length }, (v, k) => ({
                value: k === qi ? metric.value : null,
              })),
            });
          } else {
            // findIndex points at the element at the current metric time
            acc[findIndex].metrics[qi].value = metric.value;
          }

          return acc;
        }, accAll);
      },
      []
    );
  }

  _injectMetrics(state: TransformedMetrics[], newMetrics: TransformedMetrics) {
    const data = state;

    let newIndex;
    if (data.length === 0 || newMetrics.time < data[data.length - 1].time) {
      newIndex = data.push(newMetrics) - 1;
    } else {
      newIndex = sortedFindIndex(
        data,
        (v: { time: number }) => newMetrics.time >= v.time
      );
      if (data[newIndex].time === newMetrics.time) {
        this._mergeData(data[newIndex], newMetrics);
      } else {
        data.splice(newIndex, 0, newMetrics);
      }
    }

    // Delete item if it's outside the time range; it was only used to fill missing values
    if (data[newIndex].time < this._context.timeRange.from) {
      data.splice(newIndex);
    }

    return data;
  }

  _transformMetrics(
    metrics: LoggingDataMetric[][],
    queries: LoggingDataQuery[]
  ) {
    // Returns an array of elements, sorted by time: [{ time, metrics: [] }]
    const transformedMetrics = this._sortedTransposedMetrics(metrics, queries);

    // Now we're injecting the metrics in the current state
    this._metrics = transformedMetrics.reduce(
      this._injectMetrics.bind(this),
      this._metrics
    );

    return this._metrics;
  }

  _createQueryIndexMap(
    metrics: LoggingDataMetric[][],
    queries: LoggingDataQuery[]
  ) {
    const queryIndexMap = new Map();
    metrics.forEach((m, i) => {
      if (m.length) {
        queryIndexMap.set(
          i,
          queries.findIndex((q) => q.selector === m[0].queryRef.query.selector)
        );
      }
    });
    return queryIndexMap;
  }

  _mergeData(
    target: {
      time: number;
      metrics: {
        value: LoggingDataValue;
      }[];
    },
    source: {
      time: number;
      metrics: {
        value: LoggingDataValue;
      }[];
    }
  ) {
    for (let i = 0; i < source.metrics.length; i++) {
      if (source.metrics[i].value) {
        target.metrics[i].value = source.metrics[i].value;
      }
    }
  }
}
