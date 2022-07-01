export type TimeRange = { from: number; to: number };

export type Interval = "best fit" | StaticInterval;

export type StaticInterval =
  | "quarter hours"
  | "half hours"
  | "hours"
  | "days"
  | "weeks";
