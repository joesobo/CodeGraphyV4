import { describe, expect, it } from 'vitest';
import { applyGraphControls } from '../../../src/webview/graphControls/filtering';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../src/shared/graphControls/defaults/definitions';
import { DEFAULT_FOLDER_NODE_COLOR } from '../../../src/shared/fileColors';

describe('webview/graphControls/filtering', () => {
  it('returns a null graph unchanged while preserving edge decorations', () => {
    const edgeDecorations = {
      'src/a.ts->src/b.ts#import': {
        color: '#00ff88',
        width: 4,
      },
    };

    expect(applyGraphControls({
      graphData: null,
      nodeColors: {},
      nodeVisibility: {},
      edgeVisibility: {},
      edgeTypes: [],
      edgeDecorations,
    })).toEqual({
      graphData: null,
      edgeDecorations,
    });
  });

  it('preserves plugin edge decorations without applying edge type colors to decoration state', () => {
    const edgeId = 'src/a.ts->src/b.ts#import';

    const result = applyGraphControls({
      graphData: {
        nodes: [
          { id: 'src/a.ts', label: 'a.ts', color: '#111111', nodeType: 'file' },
          { id: 'src/b.ts', label: 'b.ts', color: '#222222', nodeType: 'file' },
        ],
        edges: [
          {
            id: edgeId,
            from: 'src/a.ts',
            to: 'src/b.ts',
            kind: 'import',
            sources: [],
          },
        ],
      },
      nodeColors: {},
      nodeVisibility: { file: true },
      edgeVisibility: { import: true },
      edgeTypes: [{ id: 'import', label: 'Imports', defaultColor: '#00ff88', defaultVisible: true }],
      edgeDecorations: {
        [edgeId]: {
          color: '#ff0066',
          width: 4,
          style: 'dashed',
          label: { text: 'plugin label', color: '#ffffff' },
        },
      },
    });

    expect(result.edgeDecorations).toEqual({
      [edgeId]: {
        color: '#ff0066',
        width: 4,
        style: 'dashed',
        label: { text: 'plugin label', color: '#ffffff' },
      },
    });
    expect(result.graphData?.edges[0]).toMatchObject({ color: '#00ff88' });
  });

  it('keeps structural nests edges hidden until the required folder nodes are enabled', () => {
    const result = applyGraphControls({
      graphData: {
        nodes: [
          { id: 'src/a.ts', label: 'a.ts', color: '#111111', nodeType: 'file' },
          { id: 'src/lib/b.ts', label: 'b.ts', color: '#222222', nodeType: 'file' },
        ],
        edges: [],
      },
      nodeColors: {},
      nodeVisibility: {
        file: true,
        folder: false,
      },
      edgeVisibility: {
        [STRUCTURAL_NESTS_EDGE_KIND]: true,
      },
      edgeTypes: [],
    });

    expect(result.graphData).toEqual({
      nodes: [
        { id: 'src/a.ts', label: 'a.ts', color: '#111111', nodeType: 'file' },
        { id: 'src/lib/b.ts', label: 'b.ts', color: '#222222', nodeType: 'file' },
      ],
      edges: [],
    });
  });

  it('keeps folder-only rendering connected through visible folder nests edges', () => {
    const result = applyGraphControls({
      graphData: {
        nodes: [
          { id: 'src/lib/a.ts', label: 'a.ts', color: '#111111', nodeType: 'file' },
        ],
        edges: [],
      },
      nodeColors: {},
      nodeVisibility: {
        file: false,
        folder: true,
      },
      edgeVisibility: {
        [STRUCTURAL_NESTS_EDGE_KIND]: true,
      },
      edgeTypes: [],
    });

    expect(result.graphData).toEqual({
      nodes: [
        { id: 'src', label: 'src', color: DEFAULT_FOLDER_NODE_COLOR, nodeType: 'folder' },
        { id: 'src/lib', label: 'lib', color: DEFAULT_FOLDER_NODE_COLOR, nodeType: 'folder' },
      ],
      edges: [
        {
          id: 'src->src/lib#codegraphy:nests',
          from: 'src',
          to: 'src/lib',
          kind: 'codegraphy:nests',
          sources: [],
        },
      ],
    });
  });
});
