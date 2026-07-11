import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import { applyPendingFileMutationDecorations } from '../../../../src/webview/store/optimistic/decorations';

const graphData: IGraphData = {
  nodes: [
    { id: 'src/a.ts', label: 'a.ts', color: '#fff' },
    { id: 'src/dir/b.ts', label: 'b.ts', color: '#fff' },
  ],
  edges: [],
};

describe('optimistic file mutation decorations', () => {
  it('retains the decoration reference when no mutations are pending', () => {
    const decorations = {};
    expect(applyPendingFileMutationDecorations(decorations, graphData, {})).toBe(decorations);
  });

  it('projects rename labels and delete opacity without changing graph data', () => {
    const decorations = applyPendingFileMutationDecorations(
      { 'src/a.ts': { label: { color: '#fff' } } },
      graphData,
      {
        rename: { kind: 'rename', oldPath: 'src/a.ts', newPath: 'src/renamed.ts' },
        delete: { kind: 'delete', paths: ['src/dir'] },
      },
    );

    expect(decorations['src/a.ts']).toEqual({
      label: { color: '#fff', text: 'renamed.ts' },
    });
    expect(decorations['src/dir/b.ts']).toEqual({ opacity: 0.35 });
    expect(graphData.nodes.map(node => node.id)).toEqual(['src/a.ts', 'src/dir/b.ts']);
  });
});
