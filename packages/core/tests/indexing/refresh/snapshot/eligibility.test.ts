import { describe, expect, it, vi } from 'vitest';

import { canCaptureWorkspaceIndexRefreshGraphSnapshot } from '../../../../src/indexing/refresh/snapshot/eligibility';
import { createGraphNode, createSource } from '../fixture';

describe('indexing/refresh/snapshot/eligibility', () => {
  it('requires the metric patch helper', () => {
    expect(canCaptureWorkspaceIndexRefreshGraphSnapshot(createSource())).toBe(false);
  });

  it('does not capture an empty graph', () => {
    const source = createSource({
      _lastGraphData: { nodes: [], edges: [] },
      _patchGraphDataNodeMetrics: vi.fn(),
    });

    expect(canCaptureWorkspaceIndexRefreshGraphSnapshot(source)).toBe(false);
  });

  it('can capture a graph with nodes', () => {
    const source = createSource({
      _lastGraphData: { nodes: [createGraphNode('src/app.ts')], edges: [] },
      _patchGraphDataNodeMetrics: vi.fn(),
    });

    expect(canCaptureWorkspaceIndexRefreshGraphSnapshot(source)).toBe(true);
  });

  it('can capture an edge-only graph', () => {
    const source = createSource({
      _lastGraphData: {
        nodes: [],
        edges: [{
          id: 'src/app.ts->src/dep.ts#import',
          from: 'src/app.ts',
          to: 'src/dep.ts',
          kind: 'import',
          sources: [],
        }],
      },
      _patchGraphDataNodeMetrics: vi.fn(),
    });

    expect(canCaptureWorkspaceIndexRefreshGraphSnapshot(source)).toBe(true);
  });
});
