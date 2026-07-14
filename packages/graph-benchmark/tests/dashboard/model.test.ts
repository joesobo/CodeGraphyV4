import { describe, expect, it } from 'vitest';

import { buildDashboardModel, type DashboardManifest } from '../../src/dashboard/model';
import type { AggregateGraphBenchmarkReport } from '../../src/report/model';

function report(revision: string, frameTimeMs: number): AggregateGraphBenchmarkReport {
  return {
    schemaVersion: 3,
    status: 'complete',
    source: { revision, dirty: false },
    fixture: {
      name: '500',
      seed: 307,
      generatorVersion: 1,
      nodeCount: 500,
      edgeCount: 1_000,
      hash: 'sha256:test',
    },
    averages: {
      cpuFrameTimeMs: frameTimeMs,
      cpuFrameP95Ms: frameTimeMs + 1,
      cpuFrameOnePercentHighMs: frameTimeMs + 2,
      cpuFrameMaxMs: frameTimeMs + 3,
      displayedFps: 60,
      dragFps: 60,
      frozenFrameCount: 0,
      hudDifferenceMaxPct: 1,
      neighborLatencyFrames: 2,
      potentialFps: 1_000 / frameTimeMs,
      renderMs: frameTimeMs * 0.6,
      settleEnvelopeViolationCount: 0,
      simulationMs: frameTimeMs * 0.4,
      targetLatencyFrames: 1,
      teleportFrameCount: 0,
      settleTimeMs: 1_000,
      idleCpuPct: 1,
      heapAfterLoadBytes: 1,
      processAfterLoadBytes: 1,
      memoryAfterCyclesBytes: 1,
    },
  } as AggregateGraphBenchmarkReport;
}

const manifest: DashboardManifest = {
  schemaVersion: 1,
  title: 'Interaction performance',
  updates: [{
    milestone: 'M1',
    summary: 'Trustworthy baseline captured.',
    timestamp: '2026-07-13T18:00:00Z',
    title: 'M1 baseline',
  }],
  reports: [{ fixture: '500', milestone: 'M1', path: 'm1-500.json' }],
  attribution: [],
  visuals: [],
};

describe('dashboard model', () => {
  it('does not claim a speedup when only the M1 baseline exists', () => {
    const model = buildDashboardModel(manifest, new Map([
      ['m1-500.json', report('baseline', 10)],
    ]));

    expect(model.fixtures[0]).toMatchObject({
      fixture: '500',
      baseline: { frameTimeMs: 10 },
      current: { frameTimeMs: 10 },
      speedup: null,
    });
  });

  it('computes the current speedup and preserves commit trend points', () => {
    const nextManifest: DashboardManifest = {
      ...manifest,
      reports: [
        ...manifest.reports,
        { fixture: '500', milestone: 'M3', path: 'm3-500.json' },
      ],
    };
    const model = buildDashboardModel(nextManifest, new Map([
      ['m1-500.json', report('baseline', 10)],
      ['m3-500.json', report('current', 5)],
    ]));

    expect(model.fixtures[0]).toMatchObject({
      baseline: { revision: 'baseline' },
      current: { revision: 'current' },
      speedup: 2,
    });
    expect(model.fixtures[0].trend).toEqual([
      { frameTimeMs: 10, milestone: 'M1', revision: 'baseline' },
      { frameTimeMs: 5, milestone: 'M3', revision: 'current' },
    ]);
  });
});
