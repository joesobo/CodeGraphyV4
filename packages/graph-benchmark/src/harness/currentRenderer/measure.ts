import type { Page } from '@playwright/test';

import type { GraphStageAttributionRecording } from '../../metrics/attribution';
import {
  assessVisibleNodeCollisions,
  type VisibleCollisionAssessment,
} from '../../metrics/collisions';
import { estimateRefreshRate } from '../../metrics/frames';
import {
  assessInteractionRecording,
  DEFAULT_INTERACTION_THRESHOLDS,
  type InteractionRecording,
  type PerformanceHudSample,
} from '../../metrics/interaction';

export const RELEASE_SETTLE_OBSERVATION_MS = 15_000;

export interface CurrentRendererSettlement {
  renderer: 'current';
  fixtureHash: string;
  nodeCount: number;
  edgeCount: number;
  settleTimeMs: number;
}

interface BenchmarkGraphDebugWindow extends Window {
  __CODEGRAPHY_GRAPH_DEBUG__?: {
    centerNode(nodeId: string, scale: number): boolean;
    fitView(): void;
    getNodeScreenPosition(nodeId: string): { x: number; y: number } | null;
    getPerformance(): PerformanceHudSample;
    getSnapshot(): {
      nodes: Array<{
        collisionRadius: number;
        id: string;
        positionFinite: boolean;
        screenX: number;
        screenY: number;
        x: number;
        y: number;
      }>;
      zoom: number | null;
    };
    startInteractionRecording(options: {
      neighborNodeIds: string[];
      targetNodeId: string;
    }): void;
    startRenderedFrameRecording(): void;
    startStageAttributionRecording(): void;
    stopInteractionRecording(): InteractionRecording | null;
    stopRenderedFrameRecording(): number[];
    stopStageAttributionRecording(): GraphStageAttributionRecording | null;
  };
}

interface BenchmarkPageWindow extends Window {
  __CODEGRAPHY_GRAPH_BENCHMARK__?: {
    error: string | null;
    lastHoveredNodeId: string | null;
    lastStabilizedAt: number | null;
    ready: boolean;
    result: CurrentRendererSettlement | null;
    stabilizationCount: number;
    start(): Promise<void>;
  };
}

async function openBenchmarkPage(
  page: Page,
  url: string,
  timeoutMs: number,
): Promise<void> {
  await page.goto(url);
  await page.waitForFunction(() =>
    (window as BenchmarkPageWindow).__CODEGRAPHY_GRAPH_BENCHMARK__?.ready === true,
  undefined, { timeout: timeoutMs });
}

async function startBenchmark(page: Page): Promise<void> {
  await page.evaluate(async () => {
    const bridge = (window as BenchmarkPageWindow).__CODEGRAPHY_GRAPH_BENCHMARK__;
    if (!bridge) throw new Error('Graph benchmark bridge was not installed');
    await bridge.start();
  });
}

async function waitForSettlementResult(
  page: Page,
  timeoutMs: number,
): Promise<CurrentRendererSettlement> {
  await page.waitForFunction(() => {
    const bridge = (window as BenchmarkPageWindow).__CODEGRAPHY_GRAPH_BENCHMARK__;
    return Boolean(bridge?.result || bridge?.error);
  }, undefined, { timeout: timeoutMs });

  return page.evaluate(() => {
    const bridge = (window as BenchmarkPageWindow).__CODEGRAPHY_GRAPH_BENCHMARK__;
    if (!bridge) throw new Error('Graph benchmark bridge was not installed');
    if (bridge.error) throw new Error(bridge.error);
    if (!bridge.result) throw new Error('Graph benchmark did not produce a result');
    return bridge.result;
  });
}

export async function waitForCurrentRendererSettlement(
  page: Page,
  url: string,
  timeoutMs: number,
): Promise<CurrentRendererSettlement> {
  await openBenchmarkPage(page, url, timeoutMs);
  await startBenchmark(page);
  return waitForSettlementResult(page, timeoutMs);
}

interface ChromiumHeapUsage {
  usedSize: number;
  embedderHeapUsedSize: number;
  backingStorageSize: number;
}

export async function measureCurrentRendererHeapAfterSettlement(
  page: Page,
): Promise<ChromiumHeapUsage> {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('HeapProfiler.enable');
    await session.send('HeapProfiler.collectGarbage');
    return await session.send('Runtime.getHeapUsage') as ChromiumHeapUsage;
  } finally {
    await session.detach();
  }
}

async function measureRefreshRate(page: Page): Promise<number> {
  const timestamps = await page.evaluate<number[]>(`new Promise(resolve => {
    const values = [];
    const sample = timestamp => {
      values.push(timestamp);
      if (values.length === 31) resolve(values);
      else requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  })`);
  return estimateRefreshRate(
    timestamps.slice(1).map((value, index) => value - timestamps[index]),
  );
}

async function runTimedMouseSteps(
  page: Page,
  points: ReadonlyArray<{ x: number; y: number }>,
): Promise<void> {
  for (const point of points) {
    await page.mouse.move(point.x, point.y);
    await page.waitForTimeout(16);
  }
}

interface CollisionState extends VisibleCollisionAssessment {
  zoom: number | null;
}

async function readCurrentCollisionState(page: Page): Promise<CollisionState> {
  const snapshot = await page.evaluate(() =>
    (window as BenchmarkGraphDebugWindow).__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot() ?? null);
  return {
    ...assessVisibleNodeCollisions(snapshot),
    zoom: snapshot?.zoom ?? null,
  };
}

async function fitAndMeasureCurrentCollisions(
  page: Page,
  timeoutMs: number,
): Promise<CollisionState & { settleMs: number }> {
  const startedAt = Date.now();
  const initial = await readCurrentCollisionState(page);
  const fitStartedAt = await page.evaluate(() => {
    const debug = (window as BenchmarkGraphDebugWindow).__CODEGRAPHY_GRAPH_DEBUG__;
    if (!debug) throw new Error('Graph debug API is unavailable');
    debug.fitView();
    return performance.now();
  });
  await page.waitForTimeout(350);

  let latest = await readCurrentCollisionState(page);
  const collisionEnvelopeExpanded = initial.zoom !== null
    && latest.zoom !== null
    && latest.zoom < initial.zoom;
  if (collisionEnvelopeExpanded) {
    await page.waitForFunction((fitStarted) => {
      const stabilizedAt = (window as BenchmarkPageWindow)
        .__CODEGRAPHY_GRAPH_BENCHMARK__?.lastStabilizedAt;
      return stabilizedAt !== null
        && stabilizedAt !== undefined
        && stabilizedAt >= fitStarted + 300;
    }, fitStartedAt, { timeout: timeoutMs });
    latest = await readCurrentCollisionState(page);
  }
  return { ...latest, settleMs: Date.now() - startedAt };
}

export async function runCurrentRendererSyntheticDrag(
  page: Page,
  targetNodeId: string,
  neighborNodeIds: string[],
  timeoutMs = 30_000,
  collectAttribution = false,
): Promise<{
  durationMs: number;
  frameTimesMs: number[];
  refreshRateHz: number;
  draggedNodeId: string;
  pointerMoves: number;
  nodeTravelPx: number;
  responsive: boolean;
  finitePositions: boolean;
  settledCollisionViolationCount: number;
  duringDragCollisionViolationCount: number;
  releasedCollisionViolationCount: number;
  releaseObservationMs: number;
  settledAfterRelease: boolean;
  interactionAssessment: ReturnType<typeof assessInteractionRecording>;
  stageAttribution: GraphStageAttributionRecording | null;
  fittedCollisionMaximumPenetrationPx: number;
  fittedCollisionSettleMs: number;
  fittedCollisionViolationCount: number;
  fittedCollisionZoom: number | null;
}> {
  const fitted = await fitAndMeasureCurrentCollisions(page, timeoutMs);
  const centered = await page.evaluate((nodeId) =>
    (window as BenchmarkGraphDebugWindow).__CODEGRAPHY_GRAPH_DEBUG__?.centerNode(nodeId, 1)
      ?? false,
  targetNodeId);
  if (!centered) throw new Error(`Benchmark target cannot be centered: ${targetNodeId}`);

  const graphBounds = await page.locator('.graph-container').boundingBox();
  if (!graphBounds) throw new Error('Graph benchmark container is not visible');
  const fixedStart = {
    x: graphBounds.x + graphBounds.width / 2,
    y: graphBounds.y + graphBounds.height / 2,
  };
  await page.waitForFunction(({ nodeId, centerX, centerY }) => {
    const position = (window as BenchmarkGraphDebugWindow)
      .__CODEGRAPHY_GRAPH_DEBUG__?.getNodeScreenPosition(nodeId);
    return Boolean(position
      && Math.abs(position.x - centerX) <= 2
      && Math.abs(position.y - centerY) <= 2);
  }, {
    nodeId: targetNodeId,
    centerX: graphBounds.width / 2,
    centerY: graphBounds.height / 2,
  }, { timeout: Math.min(timeoutMs, 5_000) });

  await page.mouse.move(fixedStart.x, fixedStart.y);
  await page.waitForFunction((nodeId) =>
    (window as BenchmarkPageWindow).__CODEGRAPHY_GRAPH_BENCHMARK__?.lastHoveredNodeId === nodeId,
  targetNodeId, { timeout: Math.min(timeoutMs, 2_000) });

  const settled = await readCurrentCollisionState(page);
  const refreshRateHz = await measureRefreshRate(page);
  const pointerMoves = 60;
  const path = Array.from({ length: pointerMoves }, (_, index) => {
    const progress = (index + 1) / pointerMoves;
    return {
      x: fixedStart.x + 180 * progress,
      y: fixedStart.y + Math.sin(progress * Math.PI) * 72,
    };
  });
  const startedAt = await page.evaluate(({
    targetNodeId: target,
    neighborNodeIds: neighbors,
    collectAttribution: shouldCollectAttribution,
  }) => {
    const debug = (window as BenchmarkGraphDebugWindow).__CODEGRAPHY_GRAPH_DEBUG__;
    if (!debug) throw new Error('Graph debug API is unavailable');
    debug.startRenderedFrameRecording();
    debug.startInteractionRecording({
      neighborNodeIds: neighbors,
      targetNodeId: target,
    });
    if (shouldCollectAttribution) debug.startStageAttributionRecording();
    return performance.now();
  }, { targetNodeId, neighborNodeIds, collectAttribution });
  await page.mouse.down({ button: 'left' });
  await runTimedMouseSteps(page, path);
  const dragWindow = await page.evaluate(() => {
    const debug = (window as BenchmarkGraphDebugWindow).__CODEGRAPHY_GRAPH_DEBUG__;
    return {
      endedAt: performance.now(),
      timestamps: debug?.stopRenderedFrameRecording() ?? [],
    };
  });
  const duringDragPosition = await page.evaluate((nodeId) =>
    (window as BenchmarkGraphDebugWindow).__CODEGRAPHY_GRAPH_DEBUG__?.getNodeScreenPosition(nodeId),
  targetNodeId);
  if (!duringDragPosition) throw new Error(`Dragged node disappeared: ${targetNodeId}`);
  const duringDrag = await readCurrentCollisionState(page);
  const stabilizationCount = await page.evaluate(() =>
    (window as BenchmarkPageWindow).__CODEGRAPHY_GRAPH_BENCHMARK__?.stabilizationCount ?? 0);
  await page.mouse.up({ button: 'left' });
  const releaseObservationMs = Math.min(timeoutMs, RELEASE_SETTLE_OBSERVATION_MS);
  let settledAfterRelease = true;
  try {
    await page.waitForFunction((previousCount) =>
      ((window as BenchmarkPageWindow).__CODEGRAPHY_GRAPH_BENCHMARK__?.stabilizationCount ?? 0)
        > previousCount,
    stabilizationCount, { timeout: releaseObservationMs });
  } catch (error) {
    if (!(error instanceof Error) || error.name !== 'TimeoutError') throw error;
    settledAfterRelease = false;
  }
  const released = await readCurrentCollisionState(page);
  const telemetry = await page.evaluate(() => {
    const debug = (window as BenchmarkGraphDebugWindow).__CODEGRAPHY_GRAPH_DEBUG__;
    return {
      hud: debug?.getPerformance() ?? null,
      recording: debug?.stopInteractionRecording() ?? null,
      stageAttribution: debug?.stopStageAttributionRecording() ?? null,
    };
  });
  if (!telemetry.recording) throw new Error('Interaction telemetry recording is unavailable');
  if (collectAttribution && !telemetry.stageAttribution) {
    throw new Error('Stage attribution recording is unavailable');
  }
  const interactionAssessment = assessInteractionRecording(
    telemetry.recording,
    telemetry.hud,
    DEFAULT_INTERACTION_THRESHOLDS,
  );

  const timestamps = dragWindow.timestamps.filter(
    timestamp => timestamp >= startedAt && timestamp <= dragWindow.endedAt,
  );
  const nodeTravelPx = Math.hypot(
    duringDragPosition.x - graphBounds.width / 2,
    duringDragPosition.y - graphBounds.height / 2,
  );
  return {
    durationMs: dragWindow.endedAt - startedAt,
    frameTimesMs: timestamps.slice(1).map((timestamp, index) => timestamp - timestamps[index]),
    refreshRateHz,
    draggedNodeId: targetNodeId,
    pointerMoves,
    nodeTravelPx,
    responsive: nodeTravelPx >= 170,
    finitePositions: fitted.finitePositions
      && settled.finitePositions
      && duringDrag.finitePositions
      && released.finitePositions,
    fittedCollisionMaximumPenetrationPx: fitted.maximumPenetrationPx,
    fittedCollisionSettleMs: fitted.settleMs,
    fittedCollisionViolationCount: fitted.violations,
    fittedCollisionZoom: fitted.zoom,
    settledCollisionViolationCount: settled.violations,
    duringDragCollisionViolationCount: duringDrag.violations,
    releasedCollisionViolationCount: released.violations,
    releaseObservationMs,
    settledAfterRelease,
    interactionAssessment,
    stageAttribution: telemetry.stageAttribution,
  };
}
