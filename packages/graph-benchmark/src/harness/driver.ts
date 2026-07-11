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

export const SYNTHETIC_DRAG_SCENARIO_ID = 'synthetic-node-drag-v2' as const;
export const SYNTHETIC_DRAG_PATH_ID = 'centered-node-sine-v1' as const;

export function selectSyntheticDragTarget(fixture: BenchmarkFixture): string {
  const degree = new Map(fixture.graph.nodes.map(node => [node.id, 0]));
  fixture.graph.edges.forEach((edge) => {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1);
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1);
  });
  const connected = fixture.graph.nodes
    .filter(node => (degree.get(node.id) ?? 0) > 0)
    .sort((left, right) => {
      const degreeDifference = (degree.get(left.id) ?? 0) - (degree.get(right.id) ?? 0);
      if (degreeDifference !== 0) return degreeDifference;
      if (left.id < right.id) return -1;
      if (left.id > right.id) return 1;
      return 0;
    });
  if (connected.length === 0) throw new Error('Synthetic drag fixture has no connected node');
  const minimumDegree = degree.get(connected[0].id) ?? 0;
  const leaves = connected.filter(node => degree.get(node.id) === minimumDegree);
  return leaves[Math.floor(leaves.length / 2)].id;
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

const currentRendererDriver: GraphBenchmarkDriver = {
  renderer: 'current',
  startServer: fixture => startGraphBenchmarkServer(fixture, 'current'),
  waitForSettlement: waitForCurrentRendererSettlement,
  measureHeapAfterSettlement: measureCurrentRendererHeapAfterSettlement,
  runSyntheticDrag: runCurrentRendererSyntheticDrag,
};

export function resolveGraphBenchmarkDriver(renderer: BenchmarkRenderer): GraphBenchmarkDriver {
  switch (renderer) {
    case 'current':
      return currentRendererDriver;
    case 'webgpu':
      throw new Error('Renderer is not available yet: webgpu');
  }
}
