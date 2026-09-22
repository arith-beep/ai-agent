/**
 * Pure heuristics over already-fetched snapshot rows — shared by the
 * dashboard UI (apps/web/app/manager) and the Manager Agent's read-only
 * tools (packages/manager-agent), so both compute identical numbers for
 * the same rep. These are directional signals for a manager (or the agent
 * preparing material for one) to investigate — per the roleplay, "one bad
 * day is noise, three is a signal" — never an authoritative verdict.
 */

export interface Snapshot {
  repId: string;
  date: Date;
  dials: number;
  connects: number;
  appointments: number;
  sales: number;
  talkTimeMinutes: number;
}

export interface RepInsight {
  repId: string;
  recentSalesPerDay: number;
  baselineSalesPerDay: number;
  recentDialsPerDay: number;
  baselineDialsPerDay: number;
  daysOfData: number;
  flag: "below_own_baseline" | "zero_recent_output" | "strong_week" | "normal" | "insufficient_data";
}

const RECENT_WINDOW_DAYS = 3;

function avg(nums: number[]): number {
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

/** Splits a rep's snapshots into a "recent" window (last N days present) vs. everything before it, and flags a directional signal — never a verdict. */
export function analyzeRepTrend(snapshots: Snapshot[]): RepInsight | null {
  if (snapshots.length === 0) return null;
  const sorted = [...snapshots].sort((a, b) => a.date.getTime() - b.date.getTime());
  const recent = sorted.slice(-RECENT_WINDOW_DAYS);
  const baseline = sorted.slice(0, -RECENT_WINDOW_DAYS);

  const recentSalesPerDay = avg(recent.map((s) => s.sales));
  const recentDialsPerDay = avg(recent.map((s) => s.dials));
  const baselineSalesPerDay = avg(baseline.map((s) => s.sales));
  const baselineDialsPerDay = avg(baseline.map((s) => s.dials));

  let flag: RepInsight["flag"] = "normal";
  if (baseline.length < 3) {
    flag = "insufficient_data";
  } else if (recent.every((s) => s.sales === 0) && recentDialsPerDay >= baselineDialsPerDay * 0.7) {
    // Normal activity, zero output over the whole recent window — a real signal, not just one bad day.
    flag = "zero_recent_output";
  } else if (baselineSalesPerDay > 0 && recentSalesPerDay < baselineSalesPerDay * 0.6) {
    flag = "below_own_baseline";
  } else if (baselineSalesPerDay > 0 && recentSalesPerDay > baselineSalesPerDay * 1.3) {
    flag = "strong_week";
  }

  return {
    repId: sorted[0]!.repId,
    recentSalesPerDay,
    baselineSalesPerDay,
    recentDialsPerDay,
    baselineDialsPerDay,
    daysOfData: sorted.length,
    flag,
  };
}

export function groupByRep(snapshots: Snapshot[]): Map<string, Snapshot[]> {
  const map = new Map<string, Snapshot[]>();
  for (const s of snapshots) {
    const list = map.get(s.repId) ?? [];
    list.push(s);
    map.set(s.repId, list);
  }
  return map;
}
