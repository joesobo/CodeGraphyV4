import { describe, expect, it } from 'vitest';

import { createSyntheticFixture } from '../../src/fixture/presets';
import {
  createCompletedBenchmarkReport,
  createFailedBenchmarkReport,
} from '../../src/report/model';

const environment = {
  browser: 'chromium',
  browserVersion: '123.0.0',
  headless: true,
  nodeVersion: 'v22.0.0',
  platform: 'darwin-arm64',
};

const metrics = {
  fps: 60,
  settleTimeMs: 1_000,
  frameTimeMs: {
    p50: 16,
    p95: 17,
    p99: 20,
    max: 24,
    sampleCount: 120,
    over16ms: 20,
    over33ms: 0,
  },
  hoverLatencyMs: {
    p50: 2,
    p95: 4,
    p99: 5,
    max: 5,
    sampleCount: 20,
  },
  heapBytes: {
    emptyUsed: 10,
    settledUsed: 30,
    retainedDelta: 20,
    embedderUsed: 2,
    backingStorage: 3,
  },
};

describe('createCompletedBenchmarkReport', () => {
  it('records all required benchmark metric fields', () => {
    const fixture = createSyntheticFixture('1k', 307);

    const report = createCompletedBenchmarkReport({
      fixture,
      renderer: 'current',
      environment,
      metrics,
      scenario: {
        id: 'pan-zoom-v1',
        durationMs: 2_000,
        viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
      },
    });

    expect(report.status).toBe('complete');
    expect(report.metrics).toEqual(metrics);
    expect(report.scenario).toEqual({
      id: 'pan-zoom-v1',
      durationMs: 2_000,
      viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
    });
  });
});

describe('createFailedBenchmarkReport', () => {
  it('records a timeout without dropping deterministic fixture identity', () => {
    const fixture = createSyntheticFixture('1k', 307);

    const report = createFailedBenchmarkReport({
      fixture,
      renderer: 'current',
      scenarioId: 'pan-zoom-v1',
      environment,
      stage: 'settle',
      message: 'Timed out after 120000ms',
      timedOut: true,
    });

    expect(report).toMatchObject({
      schemaVersion: 1,
      status: 'timeout',
      renderer: 'current',
      fixture: {
        name: '1k',
        seed: 307,
        generatorVersion: 1,
        nodeCount: 1_000,
        edgeCount: 3_090,
        hash: fixture.fixtureHash,
      },
      scenario: { id: 'pan-zoom-v1' },
      error: {
        stage: 'settle',
        message: 'Timed out after 120000ms',
      },
      environment,
    });
  });
});
