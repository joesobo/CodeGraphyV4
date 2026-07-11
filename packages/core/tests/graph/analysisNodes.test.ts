import { describe, expect, it } from 'vitest';
import { buildAnalysisNodesAndEdges } from '../../src/graph/analysisNodes';
import { DEFAULT_NODE_COLOR } from '../../src/fileColors';

describe('analysis nodes', () => {
  it('projects a plugin node beneath its containing file', () => {
    const graph = buildAnalysisNodesAndEdges(new Map([
      ['/workspace/demo.sample', {
        filePath: '/workspace/demo.sample',
        nodes: [{
          id: 'demo.sample:sample-marker',
          nodeType: 'sample:marker',
          label: 'Hello from Sample Plugin',
          filePath: '/workspace/demo.sample',
          parentId: '/workspace/demo.sample',
          metadata: { pluginId: 'sample.marker' },
        }],
      }],
    ]), '/workspace');

    expect(graph.nodes).toEqual([{
      id: 'demo.sample:sample-marker',
      label: 'Hello from Sample Plugin',
      color: DEFAULT_NODE_COLOR,
      nodeType: 'sample:marker',
      metadata: { pluginId: 'sample.marker' },
    }]);
    expect(graph.edges).toEqual([{
      id: 'demo.sample->demo.sample:sample-marker#contains',
      from: 'demo.sample',
      to: 'demo.sample:sample-marker',
      kind: 'contains',
      sources: [],
    }]);
    expect(graph.containingFileIds).toEqual(new Set(['demo.sample']));
  });

  it('uses the analysis file as the default parent', () => {
    const graph = buildAnalysisNodesAndEdges(new Map([
      ['/workspace/demo.sample', {
        filePath: '/workspace/demo.sample',
        nodes: [{
          id: 'marker',
          nodeType: 'sample:marker',
          label: 'Marker',
        }],
      }],
    ]), '/workspace');

    expect(graph.edges[0]).toEqual(expect.objectContaining({
      from: 'demo.sample',
      to: 'marker',
    }));
  });
});
