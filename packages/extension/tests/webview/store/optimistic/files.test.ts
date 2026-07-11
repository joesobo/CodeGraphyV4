import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import { applyOptimisticFileMutation } from '../../../../src/webview/store/optimistic/files';

function graph(): IGraphData {
  return {
    nodes: [
      { id: 'src/a.ts', label: 'a.ts', color: '#fff' },
      { id: 'src/dir/b.ts', label: 'b.ts', color: '#fff' },
    ],
    edges: [{
      id: 'src/a.ts->src/dir/b.ts#import',
      from: 'src/a.ts',
      to: 'src/dir/b.ts',
      kind: 'import',
      sources: [],
    }],
  };
}

describe('optimistic file graph mutations', () => {
  it('renames a file and its edge endpoints immediately', () => {
    const current = graph();
    const result = applyOptimisticFileMutation(current, {
      kind: 'rename',
      oldPath: 'src/a.ts',
      newPath: 'src/renamed.ts',
    });

    expect(result.graphData.nodes[0]).toMatchObject({
      id: 'src/renamed.ts',
      label: 'renamed.ts',
    });
    expect(result.graphData.edges[0]).toMatchObject({
      id: 'src/renamed.ts->src/dir/b.ts#import',
      from: 'src/renamed.ts',
    });
    expect(result.previousGraphData).toBe(current);
  });

  it('renames descendant nodes when a folder path changes', () => {
    const result = applyOptimisticFileMutation(graph(), {
      kind: 'rename',
      oldPath: 'src/dir',
      newPath: 'src/moved',
    });

    expect(result.graphData.nodes[1]?.id).toBe('src/moved/b.ts');
    expect(result.graphData.edges[0]?.to).toBe('src/moved/b.ts');
  });

  it('removes deleted nodes and incident edges immediately', () => {
    const result = applyOptimisticFileMutation(graph(), {
      kind: 'delete',
      paths: ['src/dir'],
    });

    expect(result.graphData.nodes.map(node => node.id)).toEqual(['src/a.ts']);
    expect(result.graphData.edges).toEqual([]);
  });

  it('adds a created file node immediately', () => {
    const node = { id: 'src/new.ts', label: 'new.ts', color: '#fff' };
    const result = applyOptimisticFileMutation(graph(), { kind: 'create', node });

    expect(result.graphData.nodes.at(-1)).toBe(node);
  });

  it('retains the exact previous graph snapshot for rollback', () => {
    const current = graph();
    const result = applyOptimisticFileMutation(current, {
      kind: 'delete',
      paths: ['src/a.ts'],
    });

    expect(result.previousGraphData).toBe(current);
    expect(result.previousGraphData.nodes).toHaveLength(2);
  });
});
