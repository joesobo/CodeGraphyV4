import { describe, expect, it } from 'vitest';
import type { IGraphData } from '@codegraphy-vscode/plugin-api';
import { projectFocusedImportGraph } from '../src/focusedImports/project';

describe('focusedImports/project', () => {
  it('annotates included nodes with depth and removes edges outside the focused subgraph', () => {
    const graphData: IGraphData = {
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff' },
        { id: 'b.ts', label: 'b.ts', color: '#fff' },
        { id: 'c.ts', label: 'c.ts', color: '#fff' },
      ],
      edges: [
        { id: 'a->b#import', from: 'a.ts', to: 'b.ts', kind: 'import', sources: [] },
        { id: 'b->c#import', from: 'b.ts', to: 'c.ts', kind: 'import', sources: [] },
      ],
    };
    const depths = new Map([
      ['a.ts', 0],
      ['b.ts', 1],
    ]);

    expect(projectFocusedImportGraph(graphData, depths)).toEqual({
      nodes: [
        { id: 'a.ts', label: 'a.ts', color: '#fff', depthLevel: 0 },
        { id: 'b.ts', label: 'b.ts', color: '#fff', depthLevel: 1 },
      ],
      edges: [
        expect.objectContaining({ from: 'a.ts', to: 'b.ts' }),
      ],
    });
  });

  it('returns an empty graph when no focused nodes are reachable', () => {
    const graphData: IGraphData = {
      nodes: [{ id: 'a.ts', label: 'a.ts', color: '#fff' }],
      edges: [],
    };

    expect(projectFocusedImportGraph(graphData, new Map())).toEqual({ nodes: [], edges: [] });
  });
});
