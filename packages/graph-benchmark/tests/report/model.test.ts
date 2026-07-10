import { describe, expect, it } from 'vitest';

import { createSyntheticFixture } from '../../src/fixture/presets';
import { createFailedBenchmarkReport } from '../../src/report/model';

const environment = {
  browser: 'chromium',
  browserVersion: '123.0.0',
  headless: true,
  nodeVersion: 'v22.0.0',
  platform: 'darwin-arm64',
};

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
