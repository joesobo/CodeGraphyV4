import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../src/shared/graph/types';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../src/shared/graphControls/defaults';
import { applyGraphControls } from '../../../src/webview/graphControls/filtering';

const graphData: IGraphData = {
  nodes: [
    { id: 'src/App.ts', label: 'App', color: '#111111', nodeType: 'file' },
    { id: 'pkg:docs', label: 'docs', color: '#333333', nodeType: 'package' },
  ],
  edges: [
    { id: 'src/App.ts->pkg:docs#import', from: 'src/App.ts', to: 'pkg:docs', kind: 'import', sources: [] },
  ],
};

describe('webview/graphSurface/controls', () => {
  it('adds folder nodes and nests edges when folders are visible', () => {
    const result = applyGraphControls({
      graphData,
      nodeColors: { file: '#111111', folder: '#BBBBBB', package: '#333333' },
      nodeVisibility: { file: true, folder: true, package: false },
      edgeVisibility: { import: true, [STRUCTURAL_NESTS_EDGE_KIND]: true },
      edgeColors: { import: '#654321', [STRUCTURAL_NESTS_EDGE_KIND]: '#222222' },
    });

    expect(result).toEqual({
      graphData: {
        nodes: [
          { id: 'src/App.ts', label: 'App', color: '#111111', nodeType: 'file' },
          { id: 'src', label: 'src', color: '#BBBBBB', nodeType: 'folder' },
        ],
        edges: [
          {
            id: `src->src/App.ts#${STRUCTURAL_NESTS_EDGE_KIND}`,
            from: 'src',
            to: 'src/App.ts',
            kind: STRUCTURAL_NESTS_EDGE_KIND,
            sources: [],
          },
        ],
      },
      edgeDecorations: {
        [`src->src/App.ts#${STRUCTURAL_NESTS_EDGE_KIND}`]: {
          color: '#222222',
        },
      },
    });
  });

  it('filters hidden node and edge types while keeping edge colors on visible semantic edges', () => {
    const result = applyGraphControls({
      graphData,
      nodeColors: { file: '#111111', folder: '#BBBBBB', package: '#333333' },
      nodeVisibility: { file: true, folder: false, package: true },
      edgeVisibility: { import: false, [STRUCTURAL_NESTS_EDGE_KIND]: true },
      edgeColors: { import: '#654321' },
    });

    expect(result).toEqual({
      graphData: {
        nodes: [
          { id: 'src/App.ts', label: 'App', color: '#111111', nodeType: 'file' },
          { id: 'pkg:docs', label: 'docs', color: '#333333', nodeType: 'package' },
        ],
        edges: [],
      },
      edgeDecorations: {},
    });
  });

  it('returns null when no graph data is available', () => {
    expect(applyGraphControls({
      graphData: null,
      nodeColors: {},
      nodeVisibility: {},
      edgeVisibility: {},
      edgeColors: {},
    })).toEqual({
      graphData: null,
      edgeDecorations: undefined,
    });
  });
});
