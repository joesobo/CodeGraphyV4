import { expect, test } from '@playwright/test';

import { createSyntheticFixture } from '../../../src/fixture/presets';
import {
  measureCurrentRendererHeap,
  measureCurrentRendererHover,
  runCurrentRendererPanZoom,
  waitForCurrentRendererSettlement,
} from '../../../src/harness/currentRenderer/measure';
import { startGraphBenchmarkServer } from '../../../src/harness/currentRenderer/server';

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

test('measures retained Chromium heap in a separate pass', async ({ page }) => {
  const fixture = createSyntheticFixture('1k', 307);
  const server = await startGraphBenchmarkServer(fixture);

  try {
    const heap = await measureCurrentRendererHeap(page, server.url, 120_000);

    expect(heap.emptyUsed).toBeGreaterThan(0);
    expect(heap.settledUsed).toBeGreaterThan(0);
    expect(heap.retainedDelta).toBe(heap.settledUsed - heap.emptyUsed);
    expect(heap.embedderUsed).toBeGreaterThanOrEqual(0);
    expect(heap.backingStorage).toBeGreaterThanOrEqual(0);
  } finally {
    await server.close();
  }
});

test('measures current-renderer hover hit-test latency', async ({ page }) => {
  const fixture = createSyntheticFixture('1k', 307);
  const server = await startGraphBenchmarkServer(fixture);

  try {
    await waitForCurrentRendererSettlement(page, server.url, 120_000);

    const latencies = await measureCurrentRendererHover(
      page,
      'packages/package-0000/src/file-000000.ts',
      5,
    );

    expect(latencies).toHaveLength(5);
    expect(latencies.every((latency) => latency >= 0 && Number.isFinite(latency))).toBe(true);
  } finally {
    await server.close();
  }
});

test('captures rendered frame times during scripted pan and zoom', async ({ page }) => {
  const fixture = createSyntheticFixture('1k', 307);
  const server = await startGraphBenchmarkServer(fixture);

  try {
    await waitForCurrentRendererSettlement(page, server.url, 120_000);

    const result = await runCurrentRendererPanZoom(page);

    expect(result.durationMs).toBeGreaterThan(1_000);
    expect(result.frameTimesMs.length).toBeGreaterThan(10);
    expect(result.frameTimesMs.every(Number.isFinite)).toBe(true);
  } finally {
    await server.close();
  }
});
