<script lang="ts">
  import { onMount } from "svelte";

  import { DateTime } from "luxon";

  import type { LoggingDataClient } from "./shared/types";

  import { DataService } from "./utils/data.service";
  import { metricsToBatchData } from "./utils/batch.service";

  let client: LoggingDataClient;
  let dataService: DataService;
  let columns = [];
  let metrics = [];
  let tableWidth = 0;
  let batchSelected = false;
  let batchFrom;
  let batchTo;
  let header;
  let translations;

  let search = undefined;

  export let context = undefined;

  $: isNarrow = tableWidth < 320;

  $: visibleBatches = search
    ? metrics.filter((batch) => {
        const batchData = [
          ...batch.columns,
          formatDateTime(batch.startTime),
          formatDateTime(batch.endTime),
        ];
        return batchData.find((x) =>
          x.toLowerCase().includes(search.toLowerCase())
        );
      })
    : metrics;

  onMount(() => {
    client = context.createLoggingDataClient();
    dataService = new DataService(
      context,
      client,
      (_metrics: any[], _hasMore: boolean) => {
        if (_hasMore) {
          return;
        }

        const processedMetrics = _metrics.map((m) => ({
          time: m.time,
          metrics: m.metrics,
        }));

        columns = context.inputs.metrics.map((c) => c.column.heading);
        const batchStart = context.inputs.batchStart;
        const batchEnd = context.inputs.batchEnd;
        metrics = metricsToBatchData(processedMetrics, batchStart, batchEnd);
      }
    );
    dataService.initializeData();

    context.ontimerangechange = (timeRange) => {
      if (!batchSelected) {
        const isZoomingInBatch =
          batchFrom && batchTo
            ? batchFrom < timeRange.from && timeRange.to < batchTo
            : false;

        if (!isZoomingInBatch) {
          metrics = [];
          dataService.reset();
          batchFrom = null;
          batchTo = null;
        }
      } else {
        batchSelected = false;
      }
    };
    header = context ? context.inputs.header || context.inputs : undefined;
    translations = getTranslations();
  });

  function changeTimePeriod(metric) {
    const from = metric.startTime;
    const to = metric.endTime;
    batchSelected = true;
    batchFrom = from;
    batchTo = to;
    context.setTimeRange({ from, to });
    metrics = [...metrics];
  }

  function formatDateTime(date) {
    return DateTime.fromMillis(date, {
      locale: context.appData.locale,
      zone: context.appData.timeZone,
    }).toLocaleString({
      ...DateTime.DATETIME_SHORT_WITH_SECONDS,
    });
  }

  function getTranslations(): { SEARCH: string } {
    return context.translate(["SEARCH"]);
  }

  function getRowStyle(metric: { startTime: number; endTime: number }) {
    const timeRangeInBatch =
      batchFrom && batchTo
        ? metric.startTime <= context.timeRange.from &&
          context.timeRange.to <= metric.endTime
        : false;

    if (!timeRangeInBatch) {
      return "white";
    } else {
      return "rgba(0, 0, 0, 0.04)";
    }
  }
</script>

<div class="card">
  <div class="card-header2 with-actions">
    <div class="title-and-subtitle">
      {#if header && header.title}
        <h3 class="card-title">{header.title}</h3>
      {/if}
      {#if header && header.subtitle}
        <h4 class="card-subtitle">{header.subtitle}</h4>
      {/if}
    </div>
    <div class="actions-top">
      <div
        class="search-input-container"
        style={isNarrow ? "width: 100px" : ""}
      >
        <div class="search-input-prefix">
          <svg width="24" height="24" viewBox="0 0 24 24">
            <path d="M0 0h24v24H0z" fill="none" />
            <path
              d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
            />
          </svg>
        </div>
        <input
          class="search-input"
          placeholder={translations?.SEARCH}
          bind:value={search}
          style={isNarrow ? "overflow: hidden; display: flex" : ""}
        />
      </div>
    </div>
  </div>

  <div class="card-content">
    <div class="table-header-drop-shadow" style="width: {tableWidth}px" />
    <div class="table-header-padding-coverup table-head" />
    <div class="table-header-padding-coverup table-body" />
    <div class="table-wrapper" bind:clientWidth={tableWidth}>
      <table class="base-table">
        <thead>
          <tr>
            <th>Start</th>
            <th>End</th>
            {#each columns || [] as column}
              <th>{column}</th>
            {/each}
          </tr>
        </thead>
        <tbody>
          {#each visibleBatches || [] as b}
            <tr
              on:click={() => changeTimePeriod(b)}
              style="background-color: {getRowStyle(b)}"
            >
              <td>{formatDateTime(b.startTime)}</td>
              <td>{formatDateTime(b.endTime)}</td>
              {#each b.columns || [] as column}
                <td>{column} </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style lang="scss">
  @import "./shared/styles/card";
  @import "./shared/styles/table";

  tr:hover {
    background-color: rgba(0, 0, 0, 0.04) !important;
  }

  .card-header2 {
    margin-bottom: 8px;
    font-family: var(--font-family);
    height: $card-header-height;
    box-sizing: border-box;
    text-overflow: ellipsis;
    white-space: nowrap;
    z-index: 1;

    & > .card-title:last-child,
    & > .card-subtitle:first-child {
      padding: 8px;
    }

    .title-and-subtitle {
      & > .card-title {
        padding: 8px 8px 0 8px;
        margin: 0;
        font-size: 14px;
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      & > .card-title + .card-subtitle {
        padding: 0 8px 8px 8px;
      }

      & > .card-subtitle {
        margin: 0;
        font-size: 12px;
        font-weight: 400;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
    &.with-actions {
      display: flex;
      flex-direction: row;

      .title-and-subtitle {
        flex: 1;
      }

      .actions-top {
        padding: 8px;
      }
    }
  }

  .search-input-container {
    display: flex;
    flex-direction: row;
    height: 40px;
    margin-left: 8px;
    border-radius: 8px;
    background-color: rgba(0, 0, 0, 0.04);

    input {
      background-color: transparent;
      height: 32px;
      width: 140px;
      padding: 4px 8px 4px 0;
      margin: 0;
      border: none;
      outline: none;
      line-height: 24px;
      font-size: 14px;
      color: var(--body-color);
    }
  }

  .table-row:hover {
    background-color: rgba(255, 255, 255, 0.9);
  }

  .search-input-prefix {
    width: 24px;
    height: 24px;
    padding: 8px;
  }

  .card-content {
    position: relative;
  }

  .table-header-padding-coverup {
    position: absolute;
    left: 0;
    top: 0;
    width: 8px;
    background: var(--basic);

    &.table-head {
      height: 34px;
      z-index: 15;
    }

    &.table-body {
      bottom: 16px;
      z-index: 5;
    }
  }

  .table-header-drop-shadow {
    position: absolute;
    left: 0;
    top: 0;
    height: 42px;
    width: 100%;
    background: var(--basic);
    box-shadow: 0 2px 2px 0 var(--card-border-color);
    z-index: 10;
  }

  .table-wrapper {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    padding: 8px;
    overflow: auto;
    overflow-anchor: none;
  }

  table {
    width: 100%;

    tbody td,
    tbody th {
      @for $col from 1 through 30 {
        &:nth-child(#{$col}) span {
          min-width: var(--column-#{$col}-width);
        }
      }
    }

    tbody {
      th span,
      td span {
        display: inline-block;
        min-width: 4em;
      }
    }

    tr {
      td {
        .old-value,
        .no-value {
          color: lightgray;
        }

        white-space: nowrap;
        padding-right: 24px;
      }
    }

    thead th {
      position: sticky;
      white-space: nowrap;
      background: var(--basic);
      top: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 7em;
      z-index: 10;
    }

    tbody th {
      white-space: nowrap;
      text-align: left;
      font-weight: 400;
      padding-right: 4px;
    }

    abbr[title] {
      text-decoration-style: dotted;
      text-decoration-line: underline;
    }
  }

  .card-header + .icon-button {
    right: 0;
  }

  .icon-button {
    right: 16px;
  }
</style>
