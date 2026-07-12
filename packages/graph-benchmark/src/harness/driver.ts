import type { Page } from '@playwright/test';

import type { BenchmarkRenderer } from '../cli/arguments';
import type { BenchmarkFixture } from '../fixture/presets';
import {
  measureCurrentRendererHeapAfterSettlement,
  runCurrentRendererSyntheticDrag,
  waitForCurrentRendererSettlement,
} from './currentRenderer/measure';
import {
  startGraphBenchmarkServer,
  type GraphBenchmarkServer,
} from './currentRenderer/server';

export const SYNTHETIC_DRAG_SCENARIO_ID = 'synthetic-node-drag-v3' as const;
export const SYNTHETIC_DRAG_PATH_ID = 'centered-node-sine-v1' as const;

export function selectSyntheticDragTarget(fixture: BenchmarkFixture): string {
  const connectedNodeIds = new Set(
    fixture.graph.edges.flatMap(edge => [edge.from, edge.to]),
  );
  for (let index = fixture.graph.nodes.length - 1; index >= 0; index -= 1) {
    const node = fixture.graph.nodes[index];
    if (node && connectedNodeIds.has(node.id)) return node.id;
  }
  throw new Error('Synthetic drag fixture has no connected node');
}

export interface GraphBenchmarkDriver {
  renderer: BenchmarkRenderer;
  startServer(fixture: BenchmarkFixture): Promise<GraphBenchmarkServer>;
  waitForSettlement(page: Page, url: string, timeoutMs: number): Promise<{ settleTimeMs: number }>;
  measureHeapAfterSettlement(page: Page): Promise<{ usedSize: number }>;
  runSyntheticDrag(
    page: Page,
    targetNodeId: string,
    timeoutMs: number,
  ): ReturnType<typeof runCurrentRendererSyntheticDrag>;
}

function createRendererDriver(renderer: BenchmarkRenderer): GraphBenchmarkDriver {
  return {
    renderer,
    startServer: fixture => startGraphBenchmarkServer(fixture, renderer),
    waitForSettlement: waitForCurrentRendererSettlement,
    measureHeapAfterSettlement: measureCurrentRendererHeapAfterSettlement,
    runSyntheticDrag: runCurrentRendererSyntheticDrag,
  };
}

const currentRendererDriver = createRendererDriver('current');
const webGpuRendererDriver = createRendererDriver('webgpu');

export function resolveGraphBenchmarkDriver(renderer: BenchmarkRenderer): GraphBenchmarkDriver {
  switch (renderer) {
    case 'current':
      return currentRendererDriver;
    case 'webgpu':
      return webGpuRendererDriver;
  }
}
