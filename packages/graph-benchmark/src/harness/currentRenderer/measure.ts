import type { Page } from '@playwright/test';

import { estimateRefreshRate } from '../../metrics/frames';

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
    getNodeScreenPosition(nodeId: string): { x: number; y: number } | null;
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
    startRenderedFrameRecording(): void;
    stopRenderedFrameRecording(): number[];
  };
}

interface BenchmarkPageWindow extends Window {
  __CODEGRAPHY_GRAPH_BENCHMARK__?: {
    error: string | null;
    lastHoveredNodeId: string | null;
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
  const timestamps: number[] = [];
  for (let sample = 0; sample < 31; sample += 1) {
    timestamps.push(await page.evaluate(() => new Promise<number>(requestAnimationFrame)));
  }
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

interface CollisionState {
  finitePositions: boolean;
  violations: number;
}

async function readCurrentCollisionState(page: Page): Promise<CollisionState> {
  return page.evaluate(() => {
    const snapshot = (window as BenchmarkGraphDebugWindow).__CODEGRAPHY_GRAPH_DEBUG__?.getSnapshot();
    if (!snapshot || !Number.isFinite(snapshot.zoom)) {
      return { finitePositions: false, violations: Number.MAX_SAFE_INTEGER };
    }
    const zoom = Math.abs(snapshot.zoom ?? 1);
    const finitePositions = snapshot.nodes.every(node =>
      node.positionFinite
      && Number.isFinite(node.x)
      && Number.isFinite(node.y)
      && Number.isFinite(node.screenX)
      && Number.isFinite(node.screenY)
      && Number.isFinite(node.collisionRadius),
    );
    if (!finitePositions) {
      return { finitePositions: false, violations: Number.MAX_SAFE_INTEGER };
    }

    const nodes = snapshot.nodes.map(node => ({
      x: node.screenX,
      y: node.screenY,
      radius: Math.max(0, node.collisionRadius * zoom),
    }));
    const maximumRadius = nodes.reduce((maximum, node) => Math.max(maximum, node.radius), 1);
    const cellSize = maximumRadius * 2;
    const cells = new Map<string, number[]>();
    nodes.forEach((node, index) => {
      const key = `${Math.floor(node.x / cellSize)},${Math.floor(node.y / cellSize)}`;
      const cell = cells.get(key) ?? [];
      cell.push(index);
      cells.set(key, cell);
    });

    let violations = 0;
    nodes.forEach((node, index) => {
      const cellX = Math.floor(node.x / cellSize);
      const cellY = Math.floor(node.y / cellSize);
      for (let xOffset = -1; xOffset <= 1; xOffset += 1) {
        for (let yOffset = -1; yOffset <= 1; yOffset += 1) {
          const neighbors = cells.get(`${cellX + xOffset},${cellY + yOffset}`) ?? [];
          for (const neighborIndex of neighbors) {
            if (neighborIndex <= index) continue;
            const neighbor = nodes[neighborIndex];
            const distance = Math.hypot(node.x - neighbor.x, node.y - neighbor.y);
            if (distance + 0.5 < node.radius + neighbor.radius) violations += 1;
          }
        }
      }
    });
    return { finitePositions: true, violations };
  });
}

export async function runCurrentRendererSyntheticDrag(
  page: Page,
  targetNodeId: string,
  timeoutMs = 30_000,
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
}> {
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
  const startedAt = await page.evaluate(() => {
    const debug = (window as BenchmarkGraphDebugWindow).__CODEGRAPHY_GRAPH_DEBUG__;
    if (!debug) throw new Error('Graph debug API is unavailable');
    debug.startRenderedFrameRecording();
    return performance.now();
  });
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
  await page.waitForFunction((previousCount) =>
    ((window as BenchmarkPageWindow).__CODEGRAPHY_GRAPH_BENCHMARK__?.stabilizationCount ?? 0)
      > previousCount,
  stabilizationCount, { timeout: timeoutMs });
  const released = await readCurrentCollisionState(page);

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
    finitePositions: settled.finitePositions
      && duringDrag.finitePositions
      && released.finitePositions,
    settledCollisionViolationCount: settled.violations,
    duringDragCollisionViolationCount: duringDrag.violations,
    releasedCollisionViolationCount: released.violations,
  };
}
