import { describe, expect, it, vi } from 'vitest';

import type { IGraphData, IGraphEdge } from '../../../src/graph/contracts';
import { buildWorkspaceIndexGraphFromRefreshState } from '../../../src/indexing/refresh/graph';
import {
  createFileAnalysis,
  createGraphNode,
  createSource,
} from './fixture';

describe('indexing/refresh/graph', () => {
  it('uses the analysis graph directly when there are no retained file connections', () => {
    const analysisGraph: IGraphData = {
      nodes: [createGraphNode('src/app.ts')],
      edges: [],
    };
    const source = createSource({
      _buildGraphData: vi.fn(() => ({
        nodes: [createGraphNode('fallback')],
        edges: [],
      })),
      _buildGraphDataFromAnalysis: vi.fn(() => analysisGraph),
      _lastFileAnalysis: new Map([
        ['src/app.ts', createFileAnalysis('/workspace/src/app.ts')],
      ]),
      _lastFileConnections: new Map(),
    });

    expect(buildWorkspaceIndexGraphFromRefreshState(
      source,
      '/workspace',
      new Set(),
    )).toBe(analysisGraph);
    expect(source._buildGraphData).not.toHaveBeenCalled();
    expect(source._lastGraphData).toBe(analysisGraph);
  });

  it('merges fallback graph data without duplicating nodes or edges', () => {
    const duplicateExplicitEdge = createEdge('src/app.ts', 'src/dep.ts', 'import', 'edge:app-dep');
    const duplicateDerivedEdge = createEdge('src/app.ts', 'src/implicit.ts', 'import', undefined);
    const uniqueDerivedEdge = createEdge('src/app.ts', 'src/fallback.ts', 'import', undefined);
    const uniqueExplicitEdge = createEdge('src/app.ts', 'src/extra.ts', 'call', 'edge:app-extra');
    const analysisGraph: IGraphData = {
      nodes: [
        createGraphNode('src/app.ts'),
        createGraphNode('src/dep.ts'),
      ],
      edges: [
        duplicateExplicitEdge,
        duplicateDerivedEdge,
      ],
    };
    const fallbackGraph: IGraphData = {
      nodes: [
        createGraphNode('src/app.ts'),
        createGraphNode('src/fallback.ts'),
      ],
      edges: [
        createEdge('src/app.ts', 'src/dep.ts', 'import', 'edge:app-dep'),
        createEdge('src/app.ts', 'src/implicit.ts', 'import', undefined),
        uniqueDerivedEdge,
        uniqueExplicitEdge,
      ],
    };
    const source = createSource({
      _buildGraphData: vi.fn(() => fallbackGraph),
      _buildGraphDataFromAnalysis: vi.fn(() => analysisGraph),
      _lastFileAnalysis: new Map([
        ['src/app.ts', createFileAnalysis('/workspace/src/app.ts')],
      ]),
      _lastFileConnections: new Map([
        ['src/app.ts', []],
        ['src/fallback.ts', []],
      ]),
    });

    expect(buildWorkspaceIndexGraphFromRefreshState(
      source,
      '/workspace',
      new Set(),
    )).toEqual({
      nodes: [
        createGraphNode('src/app.ts'),
        createGraphNode('src/dep.ts'),
        createGraphNode('src/fallback.ts'),
      ],
      edges: [
        duplicateExplicitEdge,
        duplicateDerivedEdge,
        uniqueDerivedEdge,
        uniqueExplicitEdge,
      ],
    });
    expect(source._lastGraphData).toEqual({
      nodes: [
        createGraphNode('src/app.ts'),
        createGraphNode('src/dep.ts'),
        createGraphNode('src/fallback.ts'),
      ],
      edges: [
        duplicateExplicitEdge,
        duplicateDerivedEdge,
        uniqueDerivedEdge,
        uniqueExplicitEdge,
      ],
    });
  });
});

function createEdge(
  from: string,
  to: string,
  kind: IGraphEdge['kind'],
  id: string | undefined,
): IGraphEdge {
  return {
    id: id as string,
    from,
    to,
    kind,
    sources: [],
  };
}
