import type { AggregateGraphBenchmarkReport } from '../report/model';

export interface DashboardUpdate {
  milestone: string;
  summary: string;
  timestamp: string;
  title: string;
}

export interface DashboardReportEntry {
  fixture: string;
  milestone: string;
  path: string;
}

export interface DashboardAttributionEntry {
  fixture: string;
  milestone: string;
  stages: Record<string, number>;
}

export interface DashboardVisual {
  caption: string;
  kind: 'gif' | 'image';
  path: string;
}

export interface DashboardManifest {
  schemaVersion: 1;
  title: string;
  updates: DashboardUpdate[];
  reports: DashboardReportEntry[];
  attribution: DashboardAttributionEntry[];
  visuals: DashboardVisual[];
}

export interface DashboardMetricPoint {
  milestone: string;
  revision: string;
  frameTimeMs: number;
  frameP95Ms: number;
  onePercentHighMs: number;
  frameMaxMs: number;
  simulationMs: number;
  simulationStepsPerFrame: number | null;
  simulationStepsPerSecond: number | null;
  renderMs: number;
  potentialFps: number;
  displayedFps: number;
  targetLatencyFrames: number;
  neighborLatencyFrames: number;
  frozenFrameCount: number;
  teleportFrameCount: number;
  settleEnvelopeViolationCount: number;
  hudDifferenceMaxPct: number;
}

export interface DashboardFixtureModel {
  fixture: string;
  baseline: DashboardMetricPoint;
  current: DashboardMetricPoint;
  speedup: number | null;
  trend: Array<{
    frameTimeMs: number;
    milestone: string;
    revision: string;
  }>;
}

export interface DashboardModel {
  attribution: DashboardAttributionEntry[];
  fixtures: DashboardFixtureModel[];
  generatedAt: string;
  title: string;
  updates: DashboardUpdate[];
  visuals: DashboardVisual[];
}

function metricPoint(
  milestone: string,
  report: AggregateGraphBenchmarkReport,
): DashboardMetricPoint {
  const averages = report.averages;
  return {
    milestone,
    revision: report.source.revision,
    frameTimeMs: averages.cpuFrameTimeMs,
    frameP95Ms: averages.cpuFrameP95Ms,
    onePercentHighMs: averages.cpuFrameOnePercentHighMs,
    frameMaxMs: averages.cpuFrameMaxMs,
    simulationMs: averages.simulationMs,
    simulationStepsPerFrame: Number.isFinite(averages.simulationStepsPerFrame)
      ? averages.simulationStepsPerFrame
      : null,
    simulationStepsPerSecond: Number.isFinite(averages.simulationStepsPerSecond)
      ? averages.simulationStepsPerSecond
      : null,
    renderMs: averages.renderMs,
    potentialFps: averages.potentialFps,
    displayedFps: averages.displayedFps,
    targetLatencyFrames: averages.targetLatencyFrames,
    neighborLatencyFrames: averages.neighborLatencyFrames,
    frozenFrameCount: averages.frozenFrameCount,
    teleportFrameCount: averages.teleportFrameCount,
    settleEnvelopeViolationCount: averages.settleEnvelopeViolationCount,
    hudDifferenceMaxPct: averages.hudDifferenceMaxPct,
  };
}

export function buildDashboardModel(
  manifest: DashboardManifest,
  reports: ReadonlyMap<string, AggregateGraphBenchmarkReport>,
): DashboardModel {
  const grouped = new Map<string, DashboardMetricPoint[]>();
  for (const entry of manifest.reports) {
    const report = reports.get(entry.path);
    if (!report) throw new Error(`Dashboard report is missing: ${entry.path}`);
    if (report.schemaVersion !== 3 || report.status !== 'complete') {
      throw new Error(`Dashboard report is not complete schema-v3 output: ${entry.path}`);
    }
    const points = grouped.get(entry.fixture) ?? [];
    points.push(metricPoint(entry.milestone, report));
    grouped.set(entry.fixture, points);
  }
  const fixtures = Array.from(grouped, ([fixture, points]) => {
    const baseline = points[0];
    const current = points.at(-1)!;
    return {
      fixture,
      baseline,
      current,
      speedup: points.length > 1 && current.frameTimeMs > 0
        ? baseline.frameTimeMs / current.frameTimeMs
        : null,
      trend: points.map(point => ({
        frameTimeMs: point.frameTimeMs,
        milestone: point.milestone,
        revision: point.revision,
      })),
    };
  });
  return {
    attribution: manifest.attribution.map(entry => ({
      ...entry,
      stages: { ...entry.stages },
    })),
    fixtures,
    generatedAt: new Date().toISOString(),
    title: manifest.title,
    updates: [...manifest.updates].sort(
      (first, second) => second.timestamp.localeCompare(first.timestamp),
    ),
    visuals: manifest.visuals.map(visual => ({ ...visual })),
  };
}
