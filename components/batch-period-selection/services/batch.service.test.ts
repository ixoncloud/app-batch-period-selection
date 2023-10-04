import { metricsToBatchData } from "./batch.service";
import type { Metrics } from "./data.service";

function getMockMetrics(mock: { time: number; metrics: any[] }[]) {
  return mock.map((a) => {
    return {
      time: a.time,
      metrics: a.metrics.map((x) => {
        return {
          value: x === null ? null : { getValue: () => x },
        };
      }),
    };
  });
}

function createMockFromRealData(data: any[]) {
  return data.map((a) => {
    return {
      time: a.time,
      metrics: a.metrics.map(
        (x: { value: { getValue: Function; rawValue: any } }) => {
          return {
            value: x.value ? { getValue: () => x.value.rawValue } : null,
          };
        }
      ),
    };
  });
}

describe("test continues batches", () => {
  test("no batch found", () => {
    const mock = [
      { time: 1647529200000, metrics: [0, null] },
      { time: 1647500400000, metrics: [0, null] },
    ];
    const metrics = getMockMetrics(mock) as Metrics;
    expect(metricsToBatchData(metrics, "1", "1")).toEqual([]);
  });

  test("only start trigger detected but no end trigger so no batch is found", () => {
    const mock = [{ time: 1647529200000, metrics: [1, null] }];
    const metrics = getMockMetrics(mock) as Metrics;
    expect(metricsToBatchData(metrics, "1", "1")).toEqual([]);
  });

  test("test 1 batch", () => {
    const mock = [
      { time: 1647529200000, metrics: [1, "Vegetable soup", "Operator 1"] },
      { time: 1647500400000, metrics: [1, "Tomato soup", "Operator 1"] },
    ];
    const metrics = getMockMetrics(mock) as Metrics;
    expect(metricsToBatchData(metrics, "1", "1")).toEqual([
      {
        endTime: 1647529200000,
        startTime: 1647500400000,
        columns: ["Tomato soup", "Operator 1"],
      },
    ]);
  });

  test("test 2 batches", () => {
    const mock = [
      { time: 1647583200000, metrics: [1, "Chicken soup", "Operator 1"] },
      { time: 1647529200000, metrics: [1, "Vegetable soup", "Operator 1"] },
      { time: 1647500400000, metrics: [1, "Tomato soup", "Operator 1"] },
    ];
    const metrics = getMockMetrics(mock) as Metrics;
    expect(metricsToBatchData(metrics, "1", "1")).toEqual([
      {
        endTime: 1647583200000,
        startTime: 1647529200000,
        columns: ["Vegetable soup", "Operator 1"],
      },
      {
        endTime: 1647529200000,
        startTime: 1647500400000,
        columns: ["Tomato soup", "Operator 1"],
      },
    ]);
  });

  test("test 3 batches", () => {
    const mock = [
      { time: 1647612000000, metrics: [1, "Vegetable soup", "Operator 1"] },
      { time: 1647583200000, metrics: [1, "Chicken soup", "Operator 2"] },
      { time: 1647529200000, metrics: [1, "Vegetable soup", "Operator 1"] },
      { time: 1647500400000, metrics: [1, "Tomato soup", "Operator 1"] },
    ];
    const metrics = getMockMetrics(mock) as Metrics;
    expect(metricsToBatchData(metrics, "1", "1")).toEqual([
      {
        endTime: 1647612000000,
        startTime: 1647583200000,
        columns: ["Chicken soup", "Operator 2"],
      },
      {
        endTime: 1647583200000,
        startTime: 1647529200000,
        columns: ["Vegetable soup", "Operator 1"],
      },
      {
        endTime: 1647529200000,
        startTime: 1647500400000,
        columns: ["Tomato soup", "Operator 1"],
      },
    ]);
  });

  test("test 3 batches with a delay between triggers and column data, and ignore invalid data", () => {
    const mock = [
      { time: 1647612000000, metrics: [1, "Vegetable soup", "Operator 1"] },
      { time: 1647583200000, metrics: [1, "Chicken soup", "Operator 2"] },
      { time: 1647529200002, metrics: [3, 4, 5] }, // invalid data
      { time: 1647529200001, metrics: [null, "Vegetable soup", "Operator 1"] },
      { time: 1647529200000, metrics: [1, null, null] },
      { time: 1647500400001, metrics: [null, "Tomato soup", "Operator 1"] },
      { time: 1647500400000, metrics: [1, null, null] },
    ];
    const metrics = getMockMetrics(mock) as Metrics;
    expect(metricsToBatchData(metrics, "1", "1")).toEqual([
      {
        endTime: 1647612000000,
        startTime: 1647583200000,
        columns: ["Chicken soup", "Operator 2"],
      },
      {
        endTime: 1647583200000,
        startTime: 1647529200000,
        columns: ["Vegetable soup", "Operator 1"],
      },
      {
        endTime: 1647529200000,
        startTime: 1647500400000,
        columns: ["Tomato soup", "Operator 1"],
      },
    ]);
  });

  test("multiple data types", () => {
    const mock = [
      { time: 1647529200000, metrics: [false, null] },
      { time: 1647500400000, metrics: [true, null] },
    ];
    const metrics = getMockMetrics(mock) as Metrics;
    expect(metricsToBatchData(metrics, "1", "1")).toEqual([]);
  });
});

describe("Test irregular batches", () => {
  test("no batch start found", () => {
    const mock = [
      { time: 1647529200000, metrics: [0, null] },
      { time: 1647500400000, metrics: [0, null] },
    ];
    const metrics = getMockMetrics(mock) as Metrics;
    expect(metricsToBatchData(metrics, "1", "0")).toEqual([]);
  });

  test("no batch end found", () => {
    const mock = [
      { time: 1647529200000, metrics: [1, null] },
      { time: 1647500400000, metrics: [1, null] },
    ];
    const metrics = getMockMetrics(mock) as Metrics;
    expect(metricsToBatchData(metrics, "1", "0")).toEqual([]);
  });

  test("test 1 batch", () => {
    const mock = [
      { time: 1647529200000, metrics: [0, null, null] },
      { time: 1647500400000, metrics: [1, "Tomato soup", "Operator 1"] },
    ];
    const metrics = getMockMetrics(mock) as Metrics;
    expect(metricsToBatchData(metrics, "1", "0")).toEqual([
      {
        endTime: 1647529200000,
        startTime: 1647500400000,
        columns: ["Tomato soup", "Operator 1"],
      },
    ]);
  });

  test("test 2 batches", () => {
    const mock = [
      { time: 1647612000000, metrics: [0, null, null] },
      { time: 1647583200000, metrics: [1, "Chicken soup", "Operator 2"] },
      { time: 1647529200000, metrics: [0, null, null] },
      { time: 1647500400000, metrics: [1, "Tomato soup", "Operator 1"] },
    ];
    const metrics = getMockMetrics(mock) as Metrics;
    expect(metricsToBatchData(metrics, "1", "0")).toEqual([
      {
        endTime: 1647612000000,
        startTime: 1647583200000,
        columns: ["Chicken soup", "Operator 2"],
      },
      {
        endTime: 1647529200000,
        startTime: 1647500400000,
        columns: ["Tomato soup", "Operator 1"],
      },
    ]);
  });

  test("test 3 batches", () => {
    const mock = [
      { time: 1647619200000, metrics: [0, null, null] },
      { time: 1647609300000, metrics: [1, "Vegetable soup", "Operator 2"] },
      { time: 1647612000000, metrics: [0, null, null] },
      { time: 1647583200000, metrics: [1, "Chicken soup", "Operator 2"] },
      { time: 1647529200000, metrics: [0, null, null] },
      { time: 1647500400000, metrics: [1, "Tomato soup", "Operator 1"] },
    ];
    const metrics = getMockMetrics(mock) as Metrics;
    expect(metricsToBatchData(metrics, "1", "0")).toEqual([
      {
        endTime: 1647619200000,
        startTime: 1647609300000,
        columns: ["Vegetable soup", "Operator 2"],
      },
      {
        endTime: 1647612000000,
        startTime: 1647583200000,
        columns: ["Chicken soup", "Operator 2"],
      },
      {
        endTime: 1647529200000,
        startTime: 1647500400000,
        columns: ["Tomato soup", "Operator 1"],
      },
    ]);
  });

  test("test batches", () => {
    const data = require("./test.irregular_batches.json");
    const metrics = createMockFromRealData(data);
    expect(metricsToBatchData(metrics, "1", "1")).toEqual([
      {
        endTime: 1647411115150,
        startTime: 1647358329350,
        columns: ["t2"],
      },
      {
        endTime: 1647358329350,
        startTime: 1647331600007,
        columns: ["test"],
      },
      {
        endTime: 1647331600007,
        startTime: 1647326235802,
        columns: ["test"],
      },
    ]);
  });

  test("test 3 batches, with two partial batches at the start and end of the metrics array", () => {
    const mock = [
      { time: 1647619200002, metrics: [1, null, null] },
      { time: 1647619200000, metrics: [0, null, null] },
      { time: 1647609300000, metrics: [1, "Vegetable soup", "Operator 2"] },
      { time: 1647612000000, metrics: [0, null, null] },
      { time: 1647583200000, metrics: [1, "Chicken soup", "Operator 2"] },
      { time: 1647529200000, metrics: [0, null, null] },
      { time: 1647500400000, metrics: [1, "Tomato soup", "Operator 1"] },
      { time: 1647500300000, metrics: [0, null, null] },
    ];
    const metrics = getMockMetrics(mock) as Metrics;
    expect(metricsToBatchData(metrics, "1", "0")).toEqual([
      {
        endTime: 1647619200000,
        startTime: 1647609300000,
        columns: ["Vegetable soup", "Operator 2"],
      },
      {
        endTime: 1647612000000,
        startTime: 1647583200000,
        columns: ["Chicken soup", "Operator 2"],
      },
      {
        endTime: 1647529200000,
        startTime: 1647500400000,
        columns: ["Tomato soup", "Operator 1"],
      },
    ]);
  });

  test("customer 1 test batches", () => {
    const data = require("./test.continues_batches.json");
    const metrics = createMockFromRealData(data);
    expect(metricsToBatchData(metrics, "true", "false")).toEqual([
      {
        endTime: 1647521254248,
        startTime: 1647521244394,
        columns: ["MANUAL COOKING", "MANUAL COOKING", "MANUAL COOKING"],
      },
      {
        endTime: 1647521105634,
        startTime: 1647521089882,
        columns: ["test water en verwar", "test", "test"],
      },
      {
        endTime: 1647509711708,
        startTime: 1647509693456,
        columns: ["test water en verwar", "test", "test"],
      },
      {
        endTime: 1647509677619,
        startTime: 1647509612315,
        columns: ["test water en verwar", "TEST ", "TEST"],
      },
      {
        endTime: 1647507868053,
        startTime: 1647507857621,
        columns: ["Bechamel saus", "test5", "test5"],
      },
      {
        endTime: 1647507842379,
        startTime: 1647507838773,
        columns: ["Bechamel saus", "test5", "test5"],
      },
      {
        endTime: 1647507807455,
        startTime: 1647507652045,
        columns: ["Bechamel saus", "batch 4", "id 4"],
      },
      {
        endTime: 1647507446077,
        startTime: 1647506854694,
        columns: ["Spaghetti saus", "test batch 3", "test id 3"],
      },
      {
        endTime: 1647506698044,
        startTime: 1647506401319,
        columns: ["Bechamel saus", "test batch 2", "test id 2"],
      },
      {
        endTime: 1647506319029,
        startTime: 1647505355631,
        columns: ["Spaghetti saus", "test batch 1", "test id 1"],
      },
    ]);
  });

  test("FIX BUG where batches where no longer aligned correctly: test 3 batches, with double stop triggers and double start triggers", () => {
    const mock = [
      { time: 1647619200002, metrics: [1, null, null] },
      { time: 1647619200000, metrics: [0, null, null] },
      { time: 1647609300000, metrics: [1, "Vegetable soup", "Operator 2"] },
      { time: 1647612000000, metrics: [0, null, null] },
      { time: 1647583200010, metrics: [1, "Chicken soup", "Operator 2"] },
      { time: 1647583200000, metrics: [1, "Chicken soup", "Operator 2"] },
      { time: 1647529200010, metrics: [0, null, null] },
      { time: 1647529200000, metrics: [0, null, null] },
      { time: 1647500400000, metrics: [1, "Tomato soup", "Operator 1"] },
      { time: 1647500300000, metrics: [0, null, null] },
    ];
    const metrics = getMockMetrics(mock) as Metrics;
    expect(metricsToBatchData(metrics, "1", "0")).toEqual([
      {
        endTime: 1647619200000,
        startTime: 1647609300000,
        columns: ["Vegetable soup", "Operator 2"],
      },
      {
        endTime: 1647612000000,
        startTime: 1647583200000,
        columns: ["Chicken soup", "Operator 2"],
      },
      {
        endTime: 1647529200000,
        startTime: 1647500400000,
        columns: ["Tomato soup", "Operator 1"],
      },
    ]);
  });

  test("FIX BUG where labels where not aligned correctly", () => {
    const mock = [
      // ignore
      { time: 1647619200002, metrics: [null, "Vegetable soup", "Operator 1"] },
      { time: 1647619200000, metrics: [1, null, null] },

      // batch 5
      { time: 1647609300000, metrics: [0, null, null] },
      { time: 1647612000000, metrics: [1, null, null] },

      // ignore
      { time: 1647583200010, metrics: [null, "Chicken soup", "Operator 2"] },
      { time: 1647583200000, metrics: [0, null, null] },
      { time: 1647529200010, metrics: [0, null, null] },

      // batch 4
      { time: 1647529200000, metrics: [0, null, null] },
      { time: 1647500400000, metrics: [null, "Tomato soup", "Operator 3"] },
      { time: 1647500300000, metrics: [1, null, null] },
      { time: 1647500200000, metrics: [null, "Tomato soup", "Operator 3"] },
      { time: 1647500100000, metrics: [1, null, null] },
      { time: 1647500090000, metrics: [null, "Tomato soup", "Operator 3"] },
      { time: 1647500080000, metrics: [1, null, null] },
      { time: 1647500070000, metrics: [null, "Tomato soup", "Operator 3"] },
      { time: 1647500060000, metrics: [1, null, null] },
      { time: 1647500050000, metrics: [1, null, null] },
      { time: 1647500040000, metrics: [null, "Tomato soup", "Operator 3"] },
      { time: 1647500030000, metrics: [null, "Tomato soup", "Operator 3"] },
      { time: 1647500030000, metrics: [1, null, null] },

      // batch 3
      { time: 1647500020000, metrics: [0, null, null] },
      { time: 1647500010000, metrics: [null, "Tomato soup", "Operator 3"] },
      { time: 1647500000000, metrics: [1, null, null] },

      // batch 2
      { time: 1647500009000, metrics: [0, null, null] },
      { time: 1647500008000, metrics: [1, null, null] },

      // ignore
      { time: 1647500007000, metrics: [null, "Tomato soup", "Operator 3"] },

      // batch 1
      { time: 1647500006000, metrics: [0, null, null] },
      { time: 1647500005000, metrics: [1, "Tomato soup", "Operator 3"] },
      { time: 1647500004000, metrics: [1, "Vegetable soup", "Operator 4"] },

      // ignore
      { time: 1647500003000, metrics: [0, null, null] },
    ];
    const metrics = getMockMetrics(mock) as Metrics;

    expect(metricsToBatchData(metrics, "1", "0")).toEqual([
      {
        endTime: 1647609300000,
        startTime: 1647612000000,
        columns: [],
      },
      {
        endTime: 1647529200000,
        startTime: 1647500030000,
        columns: ["Tomato soup", "Operator 3"],
      },
      {
        endTime: 1647500020000,
        startTime: 1647500000000,
        columns: ["Tomato soup", "Operator 3"],
      },
      {
        endTime: 1647500009000,
        startTime: 1647500008000,
        columns: [],
      },
      {
        endTime: 1647500006000,
        startTime: 1647500004000,
        columns: ["Vegetable soup", "Operator 4"],
      },
    ]);
  });

  test("Work around metadata being logged earlier than batch trigger by Router, look to next record if time is less than or equal to 100 milliseconds", () => {
    const mock = [
      { time: 1647619201000, metrics: [0, null, null] },
      { time: 1647619200002, metrics: [1, null, null] },
      { time: 1647619200000, metrics: [null, "Vegetable soup", "Operator 2"] },
      { time: 1647618201000, metrics: [0, null, null] },
      { time: 1647618200002, metrics: [1, null, null] },
      { time: 1647618200000, metrics: [null, "Vegetable soup", "Operator 1"] },
      { time: 1647617201000, metrics: [0, null, null] },
      { time: 1647617200002, metrics: [1, null, null] },
      { time: 1647617100000, metrics: [null, "Vegetable soup", "Operator 1"] },
      { time: 1647616201000, metrics: [0, null, null] },
      { time: 1647616200002, metrics: [1, null, null] },
      { time: 1647616200001, metrics: [null, null, null] },
    ];
    const metrics = getMockMetrics(mock) as Metrics;

    expect(metricsToBatchData(metrics, "1", "0")).toEqual([
      {
        endTime: 1647619201000,
        startTime: 1647619200002,
        columns: ["Vegetable soup", "Operator 2"],
      },
      {
        endTime: 1647618201000,
        startTime: 1647618200002,
        columns: ["Vegetable soup", "Operator 1"],
      },
      {
        endTime: 1647617201000,
        startTime: 1647617200002,
        columns: [],
      },
      {
        endTime: 1647616201000,
        startTime: 1647616200002,
        columns: [],
      },
    ]);
  });

  test("FIX BUG when there are no columns defined checking outside of index", () => {
    const mock = [
      { time: 1663319378442, metrics: [0] },
      { time: 1663319330342, metrics: [1] },
    ];

    const metrics = getMockMetrics(mock) as Metrics;
    expect(metricsToBatchData(metrics, "1", "0")).toEqual([
      {
        endTime: 1663319378442,
        startTime: 1663319330342,
        columns: [],
      },
    ]);
  });
});
