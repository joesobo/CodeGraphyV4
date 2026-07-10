import { expect, test } from '@playwright/test';

import { createSyntheticFixture } from '../../src/fixture/presets';
import {
  startGraphBenchmarkServer,
  waitForCurrentRendererSettlement,
} from '../../src/harness/currentRenderer';

test('loads a deterministic fixture and reports current-renderer settlement', async ({ page }) => {
  const fixture = createSyntheticFixture('1k', 307);
  const server = await startGraphBenchmarkServer(fixture);

  try {
    const result = await waitForCurrentRendererSettlement(page, server.url, 120_000);

    expect(result).toMatchObject({
      renderer: 'current',
      fixtureHash: fixture.fixtureHash,
      nodeCount: 1_000,
      edgeCount: 3_090,
    });
    expect(result.settleTimeMs).toBeGreaterThan(0);
  } finally {
    await server.close();
  }
});
