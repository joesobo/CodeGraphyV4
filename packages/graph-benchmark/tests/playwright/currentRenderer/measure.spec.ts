/// <reference types="@webgpu/types" />

import { expect, test } from '@playwright/test';

import { createSyntheticFixture } from '../../../src/fixture/presets';
import {
  measureCurrentRendererHeapAfterSettlement,
  runCurrentRendererSyntheticDrag,
  waitForCurrentRendererSettlement,
} from '../../../src/harness/currentRenderer/measure';
import { selectSyntheticDragTargetDetails } from '../../../src/harness/driver';
import { startGraphBenchmarkServer } from '../../../src/harness/currentRenderer/server';

test('loads a deterministic fixture and reports current-renderer settlement', async ({ page }) => {
  const fixture = createSyntheticFixture('1k', 307);
  const server = await startGraphBenchmarkServer(fixture);

  try {
    const result = await waitForCurrentRendererSettlement(page, server.url, 120_000);

    await expect(page.locator('[data-codegraphy-renderer="webgpu"]')).toBeVisible();
    await expect(page.getByTestId('graph-webgpu-error')).toHaveCount(0);
    const fallbackAdapter = await page.evaluate(async () => {
      const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
      if (!adapter) return null;
      return (adapter.info as GPUAdapterInfo & { isFallbackAdapter?: boolean })
        .isFallbackAdapter === true;
    });
    expect(fallbackAdapter).toBe(false);
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

test('measures settled Chromium heap after forced collection without another graph page', async ({ page }) => {
  const fixture = createSyntheticFixture('1k', 307);
  const server = await startGraphBenchmarkServer(fixture);

  try {
    await waitForCurrentRendererSettlement(page, server.url, 120_000);
    const heap = await measureCurrentRendererHeapAfterSettlement(page);

    expect(heap.usedSize).toBeGreaterThan(0);
    expect(heap.embedderHeapUsedSize).toBeGreaterThanOrEqual(0);
    expect(heap.backingStorageSize).toBeGreaterThanOrEqual(0);
  } finally {
    await server.close();
  }
});

test('captures trustworthy frame and interaction metrics during a fixed synthetic node drag', async ({ page }) => {
  const fixture = createSyntheticFixture('tiny', 307);
  const server = await startGraphBenchmarkServer(fixture);

  try {
    await waitForCurrentRendererSettlement(page, server.url, 120_000);

    const selection = selectSyntheticDragTargetDetails(fixture);
    const result = await runCurrentRendererSyntheticDrag(
      page,
      selection.targetNodeId,
      selection.neighborNodeIds,
      30_000,
      true,
    );

    expect(result.durationMs).toBeGreaterThan(900);
    expect(result.frameTimesMs.length).toBeGreaterThan(10);
    expect(result.frameTimesMs.every(Number.isFinite)).toBe(true);
    expect(result.pointerMoves).toBe(60);
    expect(result.draggedNodeId).toBe(selection.targetNodeId);
    expect(result.nodeTravelPx).toBeGreaterThanOrEqual(170);
    expect(result.responsive).toBe(true);
    expect(result.finitePositions).toBe(true);
    expect(result.fittedCollisionViolationCount).toBe(0);
    expect(result.fittedCollisionMaximumPenetrationPx).toBeLessThanOrEqual(0.5);
    expect(result.fittedCollisionSettleMs).toBeGreaterThan(300);
    expect(result.fittedCollisionZoom).toBeGreaterThan(0);
    expect(result.releasedCollisionViolationCount).toBeGreaterThanOrEqual(0);
    expect(result.releaseObservationMs).toBe(15_000);
    expect(result.settledAfterRelease).toBe(true);
    expect(result.duringDragCollisionViolationCount)
      .toBeGreaterThanOrEqual(result.releasedCollisionViolationCount);
    expect(result.interactionAssessment.timing.potentialFps).toBeGreaterThan(0);
    expect(result.interactionAssessment.timing.cpuFrameTimeMs.mean).toBeGreaterThan(0);
    expect(result.interactionAssessment.interaction.targetLatencyFrames.sampleCount)
      .toBeGreaterThan(0);
    expect(result.interactionAssessment.interaction.neighborLatencyFrames.sampleCount)
      .toBeGreaterThan(0);
    expect(result.interactionAssessment.hudAgreement?.withinTenPercent).toBe(true);
    expect(result.interactionAssessment.truncated).toBe(false);
    expect(result.stageAttribution).toMatchObject({
      physicsHome: 'main-thread',
      truncated: false,
      stages: {
        frameTotalCpu: { scope: 'frame-cpu' },
        geometryRebuild: { scope: 'frame-cpu' },
        gpuBufferWrites: { scope: 'frame-cpu' },
        gpuEncodeSubmit: { scope: 'frame-cpu' },
        physicsStep: { scope: 'frame-cpu' },
        snapshotApply: { eventCount: 0, scope: 'host-async-cpu' },
        workerRoundTrip: { eventCount: 0, scope: 'latency' },
        workerSimulationCpu: { eventCount: 0, scope: 'worker-cpu' },
      },
    });
    expect(result.stageAttribution?.renderedFrameCount).toBeGreaterThan(10);
    for (const stage of [
      'frameTotalCpu',
      'geometryRebuild',
      'gpuBufferWrites',
      'gpuEncodeSubmit',
      'physicsStep',
    ] as const) {
      expect(result.stageAttribution?.stages[stage].eventCount).toBeGreaterThan(0);
    }
  } finally {
    await server.close();
  }
});
