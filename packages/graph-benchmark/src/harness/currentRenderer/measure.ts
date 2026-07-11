import type { Page } from '@playwright/test';

export interface CurrentRendererSettlement {
  renderer: 'current';
  fixtureHash: string;
  nodeCount: number;
  edgeCount: number;
  settleTimeMs: number;
}

interface BenchmarkGraphDebugWindow extends Window {
  __CODEGRAPHY_BENCHMARK_CANVAS_FRAMES__?: number[];
  __CODEGRAPHY_GRAPH_DEBUG__?: {
    clearRenderedFrameTimes(): void;
    fitView(): void;
    getNodeScreenPosition(nodeId: string): { x: number; y: number } | null;
    getRenderedFrameTimes(): number[];
  };
}

interface BenchmarkPageWindow extends Window {
  __CODEGRAPHY_GRAPH_BENCHMARK__?: {
    error: string | null;
    hoverLatencies: number[];
    ready: boolean;
    result: CurrentRendererSettlement | null;
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

async function readChromiumHeap(page: Page): Promise<ChromiumHeapUsage> {
  const session = await page.context().newCDPSession(page);
  try {
    await session.send('HeapProfiler.enable');
    await session.send('HeapProfiler.collectGarbage');
    return await session.send('Runtime.getHeapUsage') as ChromiumHeapUsage;
  } finally {
    await session.detach();
  }
}

export async function measureCurrentRendererHeapAfterSettlement(
  settledPage: Page,
  emptyPage: Page,
  url: string,
  timeoutMs: number,
): Promise<{
  emptyUsed: number;
  settledUsed: number;
  retainedDelta: number;
  embedderUsed: number;
  backingStorage: number;
}> {
  await openBenchmarkPage(emptyPage, url, timeoutMs);
  const empty = await readChromiumHeap(emptyPage);
  const settled = await readChromiumHeap(settledPage);

  return {
    emptyUsed: empty.usedSize,
    settledUsed: settled.usedSize,
    retainedDelta: settled.usedSize - empty.usedSize,
    embedderUsed: settled.embedderHeapUsedSize,
    backingStorage: settled.backingStorageSize,
  };
}

export async function measureCurrentRendererHover(
  page: Page,
  nodeIds: readonly string[],
  sampleCount: number,
  timeoutMs = 2_000,
): Promise<number[]> {
  await page.evaluate(() => {
    (window as BenchmarkGraphDebugWindow).__CODEGRAPHY_GRAPH_DEBUG__?.fitView();
    const bridge = (window as BenchmarkPageWindow).__CODEGRAPHY_GRAPH_BENCHMARK__;
    if (bridge) bridge.hoverLatencies = [];
  });
  await page.waitForTimeout(500);

  const graphBounds = await page.locator('.graph-container').boundingBox();
  if (!graphBounds) throw new Error('Graph benchmark container is not visible');
  const nodePositions = await page.evaluate((targetNodeIds) => {
    const debug = (window as BenchmarkGraphDebugWindow).__CODEGRAPHY_GRAPH_DEBUG__;
    return targetNodeIds.map((id) => ({ id, position: debug?.getNodeScreenPosition(id) ?? null }));
  }, nodeIds);
  const inset = 16;
  const target = nodePositions.find(({ position }) =>
    position
    && position.x >= inset
    && position.x <= graphBounds.width - inset
    && position.y >= inset
    && position.y <= graphBounds.height - inset,
  );
  if (!target?.position) {
    throw new Error(`Benchmark nodes are not rendered in the viewport: ${nodeIds.join(', ')}`);
  }
  const nodePosition = target.position;

  for (let sample = 0; sample < sampleCount; sample += 1) {
    await page.mouse.move(graphBounds.x + 2, graphBounds.y + 2);
    await page.waitForTimeout(32);
    await page.mouse.move(
      graphBounds.x + nodePosition.x,
      graphBounds.y + nodePosition.y,
    );
    await page.waitForFunction((expectedCount) => {
      const bridge = (window as BenchmarkPageWindow).__CODEGRAPHY_GRAPH_BENCHMARK__;
      return (bridge?.hoverLatencies.length ?? 0) >= expectedCount;
    }, sample + 1, { timeout: timeoutMs });
  }

  return page.evaluate(() =>
    (window as BenchmarkPageWindow).__CODEGRAPHY_GRAPH_BENCHMARK__?.hoverLatencies ?? [],
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

export async function runCurrentRendererPanZoom(page: Page): Promise<{
  durationMs: number;
  frameTimesMs: number[];
}> {
  await page.evaluate(() => {
    (window as BenchmarkGraphDebugWindow).__CODEGRAPHY_GRAPH_DEBUG__?.fitView();
  });
  await page.waitForTimeout(500);

  const graphBounds = await page.locator('.graph-container').boundingBox();
  if (!graphBounds) throw new Error('Graph benchmark container is not visible');
  const center = {
    x: graphBounds.x + graphBounds.width / 2,
    y: graphBounds.y + graphBounds.height / 2,
  };
  const panPoints = Array.from({ length: 45 }, (_, index) => ({
    x: center.x + (index / 44) * Math.min(220, graphBounds.width / 3),
    y: center.y + Math.sin(index / 7) * Math.min(80, graphBounds.height / 6),
  }));

  const startedAt = await page.evaluate(() => {
    const benchmarkWindow = window as BenchmarkGraphDebugWindow;
    benchmarkWindow.__CODEGRAPHY_GRAPH_DEBUG__?.clearRenderedFrameTimes();
    benchmarkWindow.__CODEGRAPHY_BENCHMARK_CANVAS_FRAMES__ = [];
    const prototype = CanvasRenderingContext2D.prototype as CanvasRenderingContext2D & {
      __codegraphyBenchmarkClearRect?: CanvasRenderingContext2D['clearRect'];
    };
    if (!prototype.__codegraphyBenchmarkClearRect) {
      prototype.__codegraphyBenchmarkClearRect = Object.getOwnPropertyDescriptor(
        prototype,
        'clearRect',
      )?.value as CanvasRenderingContext2D['clearRect'];
      prototype.clearRect = function (...args: Parameters<CanvasRenderingContext2D['clearRect']>): void {
        (window as BenchmarkGraphDebugWindow).__CODEGRAPHY_BENCHMARK_CANVAS_FRAMES__?.push(performance.now());
        prototype.__codegraphyBenchmarkClearRect?.apply(this, args);
      };
    }
    return performance.now();
  });
  await page.mouse.move(center.x, center.y);
  await page.mouse.down({ button: 'middle' });
  await runTimedMouseSteps(page, panPoints);
  await runTimedMouseSteps(page, [...panPoints].reverse());
  await page.mouse.up({ button: 'middle' });

  for (let index = 0; index < 30; index += 1) {
    await page.mouse.wheel(0, -24);
    await page.waitForTimeout(16);
  }
  for (let index = 0; index < 30; index += 1) {
    await page.mouse.wheel(0, 24);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(100);

  return page.evaluate((scenarioStartedAt) => {
    const benchmarkWindow = window as BenchmarkGraphDebugWindow;
    const debugTimestamps = benchmarkWindow.__CODEGRAPHY_GRAPH_DEBUG__?.getRenderedFrameTimes() ?? [];
    const timestamps = debugTimestamps.length > 1
      ? debugTimestamps
      : benchmarkWindow.__CODEGRAPHY_BENCHMARK_CANVAS_FRAMES__ ?? [];
    return {
      durationMs: performance.now() - scenarioStartedAt,
      frameTimesMs: timestamps.slice(1).map((timestamp, index) => timestamp - timestamps[index]),
    };
  }, startedAt);
}
