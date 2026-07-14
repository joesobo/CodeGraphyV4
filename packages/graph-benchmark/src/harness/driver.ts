/// <reference types="@webgpu/types" />

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

export const SYNTHETIC_DRAG_SCENARIO_ID = 'synthetic-node-drag-v4' as const;
export const SYNTHETIC_DRAG_PATH_ID = 'centered-node-sine-v2' as const;

export interface SyntheticDragTarget {
  neighborNodeIds: string[];
  targetNodeId: string;
}

export function selectSyntheticDragTargetDetails(
  fixture: BenchmarkFixture,
): SyntheticDragTarget {
  const neighbors = new Map(
    fixture.graph.nodes.map(node => [node.id, new Set<string>()]),
  );
  for (const edge of fixture.graph.edges) {
    neighbors.get(edge.from)?.add(edge.to);
    neighbors.get(edge.to)?.add(edge.from);
  }
  let targetNodeId: string | undefined;
  let maximumDegree = 0;
  for (const node of fixture.graph.nodes) {
    const degree = neighbors.get(node.id)?.size ?? 0;
    if (degree > maximumDegree) {
      maximumDegree = degree;
      targetNodeId = node.id;
    }
  }
  if (!targetNodeId) throw new Error('Synthetic drag fixture has no connected node');
  const neighborIds = neighbors.get(targetNodeId) ?? new Set<string>();
  return {
    neighborNodeIds: fixture.graph.nodes
      .map(node => node.id)
      .filter(nodeId => neighborIds.has(nodeId)),
    targetNodeId,
  };
}

export function selectSyntheticDragTarget(fixture: BenchmarkFixture): string {
  return selectSyntheticDragTargetDetails(fixture).targetNodeId;
}

export interface GraphBenchmarkDriver {
  renderer: BenchmarkRenderer;
  startServer(fixture: BenchmarkFixture): Promise<GraphBenchmarkServer>;
  waitForSettlement(page: Page, url: string, timeoutMs: number): Promise<{ settleTimeMs: number }>;
  measureHeapAfterSettlement(page: Page): Promise<{ usedSize: number }>;
  runSyntheticDrag(
    page: Page,
    targetNodeId: string,
    neighborNodeIds: string[],
    timeoutMs: number,
    collectAttribution?: boolean,
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
const webGpuRendererDriver: GraphBenchmarkDriver = {
  ...createRendererDriver('webgpu'),
  async waitForSettlement(page, url, timeoutMs) {
    const result = await waitForCurrentRendererSettlement(page, url, timeoutMs);
    const rendererStatus = await page.locator('[data-codegraphy-renderer]').getAttribute(
      'data-codegraphy-renderer',
    );
    if (rendererStatus !== 'webgpu') {
      const error = await page.getByTestId('graph-webgpu-error').textContent().catch(() => null);
      throw new Error(`Owned WebGPU renderer did not initialize: ${error ?? rendererStatus ?? 'missing'}`);
    }
    const adapter = await page.evaluate(async () => {
      const resolved = await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' });
      const info = resolved?.info as (GPUAdapterInfo & { isFallbackAdapter?: boolean }) | undefined;
      return info ? {
        architecture: info.architecture,
        fallback: info.isFallbackAdapter === true,
        vendor: info.vendor,
      } : null;
    });
    if (!adapter || adapter.fallback) {
      throw new Error('Owned WebGPU benchmark requires a hardware GPU adapter');
    }
    return result;
  },
};

export function resolveGraphBenchmarkDriver(renderer: BenchmarkRenderer): GraphBenchmarkDriver {
  switch (renderer) {
    case 'current':
      return currentRendererDriver;
    case 'webgpu':
      return webGpuRendererDriver;
  }
}
