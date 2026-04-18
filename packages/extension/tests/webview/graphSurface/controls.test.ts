import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../src/shared/graph/contracts';
import { STRUCTURAL_NESTS_EDGE_KIND } from '../../../src/shared/graphControls/defaults/definitions';
import { WORKSPACE_PACKAGE_NODE_ID_PREFIX } from '../../../src/shared/graphControls/packages/workspace';
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

  it('synthesizes workspace package nodes and nests edges from discovered package.json files', () => {
    const packageGraphData: IGraphData = {
      nodes: [
        { id: 'package.json', label: 'package.json', color: '#111111', nodeType: 'file' },
        { id: 'packages/extension/package.json', label: 'package.json', color: '#111111', nodeType: 'file' },
        { id: 'packages/extension/src/index.ts', label: 'index.ts', color: '#111111', nodeType: 'file' },
      ],
      edges: [],
    };

    const result = applyGraphControls({
      graphData: packageGraphData,
      nodeColors: { file: '#111111', folder: '#BBBBBB', package: '#F59E0B' },
      nodeVisibility: { file: true, folder: false, package: true },
      edgeVisibility: { [STRUCTURAL_NESTS_EDGE_KIND]: true },
      edgeColors: { [STRUCTURAL_NESTS_EDGE_KIND]: '#222222' },
    });

    expect(result).toEqual({
      graphData: {
        nodes: [
          { id: 'package.json', label: 'package.json', color: '#111111', nodeType: 'file' },
          { id: 'packages/extension/package.json', label: 'package.json', color: '#111111', nodeType: 'file' },
          { id: 'packages/extension/src/index.ts', label: 'index.ts', color: '#111111', nodeType: 'file' },
          {
            id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}.`,
            label: 'workspace',
            color: '#F59E0B',
            nodeType: 'package',
            shape2D: 'hexagon',
            shape3D: 'cube',
          },
          {
            id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension`,
            label: 'extension',
            color: '#F59E0B',
            nodeType: 'package',
            shape2D: 'hexagon',
            shape3D: 'cube',
          },
        ],
        edges: [
          {
            id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}.->package.json#${STRUCTURAL_NESTS_EDGE_KIND}`,
            from: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}.`,
            to: 'package.json',
            kind: STRUCTURAL_NESTS_EDGE_KIND,
            sources: [],
          },
          {
            id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension->packages/extension/package.json#${STRUCTURAL_NESTS_EDGE_KIND}`,
            from: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension`,
            to: 'packages/extension/package.json',
            kind: STRUCTURAL_NESTS_EDGE_KIND,
            sources: [],
          },
          {
            id: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension->packages/extension/src/index.ts#${STRUCTURAL_NESTS_EDGE_KIND}`,
            from: `${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension`,
            to: 'packages/extension/src/index.ts',
            kind: STRUCTURAL_NESTS_EDGE_KIND,
            sources: [],
          },
        ],
      },
      edgeDecorations: {
        [`${WORKSPACE_PACKAGE_NODE_ID_PREFIX}.->package.json#${STRUCTURAL_NESTS_EDGE_KIND}`]: {
          color: '#222222',
        },
        [`${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension->packages/extension/package.json#${STRUCTURAL_NESTS_EDGE_KIND}`]: {
          color: '#222222',
        },
        [`${WORKSPACE_PACKAGE_NODE_ID_PREFIX}packages/extension->packages/extension/src/index.ts#${STRUCTURAL_NESTS_EDGE_KIND}`]: {
          color: '#222222',
        },
      },
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
