import { describe, expect, it } from 'vitest';
import { buildGraphContextMenuHeader } from '../../../../../src/webview/components/graph/contextMenu/header/model';
import type { GraphContextSelection } from '../../../../../src/webview/components/graph/contextMenu/contracts';

const nodes = [
  { id: 'src/app.ts', label: ' App ' },
  { id: 'src/utils.ts', label: 'Utils' },
];

describe('graph/contextMenu/header/model', () => {
  it('identifies one node by display label and exact id', () => {
    expect(buildGraphContextMenuHeader(
      { kind: 'node', targets: ['src/app.ts'] },
      { nodes },
    )).toEqual({
      kind: 'node',
      target: { label: 'App', exactId: 'src/app.ts' },
    });
  });

  it('omits the secondary identity when the displayed label already equals the id', () => {
    expect(buildGraphContextMenuHeader(
      { kind: 'node', targets: ['src/app.ts'] },
      { nodes: [{ id: 'src/app.ts', label: 'src/app.ts' }] },
    )).toEqual({ kind: 'node', target: { label: 'src/app.ts' } });
  });

  it('falls back to the exact id when node metadata or a usable label is unavailable', () => {
    expect(buildGraphContextMenuHeader(
      { kind: 'node', targets: ['src/missing.ts'] },
      { nodes },
    )).toEqual({ kind: 'node', target: { label: 'src/missing.ts' } });
    expect(buildGraphContextMenuHeader(
      { kind: 'node', targets: ['src/unlabelled.ts'] },
      { nodes: [{ id: 'src/unlabelled.ts' }] },
    )).toEqual({ kind: 'node', target: { label: 'src/unlabelled.ts' } });
    expect(buildGraphContextMenuHeader(
      { kind: 'node', targets: ['src/blank.ts'] },
      { nodes: [{ id: 'src/blank.ts', label: '   ' }] },
    )).toEqual({ kind: 'node', target: { label: 'src/blank.ts' } });
  });

  it('summarizes a multi-node context without listing node kinds or names', () => {
    expect(buildGraphContextMenuHeader(
      { kind: 'node', targets: ['src/app.ts', 'src/utils.ts'] },
      { nodes },
    )).toEqual({ kind: 'multiNode', count: 2 });
  });

  it('identifies an edge by both endpoint labels and its relationship', () => {
    expect(buildGraphContextMenuHeader(
      {
        kind: 'edge',
        edgeId: 'src/app.ts->src/utils.ts',
        targets: ['src/app.ts', 'src/utils.ts'],
      },
      {
        nodes,
        edges: [
          { id: 'unrelated', kind: 'reference' },
          { id: 'src/app.ts->src/utils.ts', kind: ' import ' },
        ],
      },
    )).toEqual({
      kind: 'edge',
      source: { label: 'App', exactId: 'src/app.ts' },
      target: { label: 'Utils', exactId: 'src/utils.ts' },
      relationship: 'import',
    });
  });

  it('reads the relationship from the visible combined Edge', () => {
    expect(buildGraphContextMenuHeader(
      {
        kind: 'edge',
        edgeId: 'a->b#import',
        visibleEdgeId: 'a<->b#import',
        targets: ['a', 'b'],
      },
      { edges: [{ id: 'a<->b#import', kind: 'import' }] },
    )).toMatchObject({ relationship: 'import' });
  });

  it('uses a trimmed runtime Edge Type when the built-in kind is blank', () => {
    expect(buildGraphContextMenuHeader(
      { kind: 'edge', edgeId: 'edge', targets: ['source', 'target'] },
      { edges: [{ id: 'edge', kind: ' ', runtimeEdgeType: ' plugin-link ' }] },
    )).toMatchObject({ relationship: 'plugin-link' });
  });

  it('rejects edge and node selections that do not identify complete targets', () => {
    expect(buildGraphContextMenuHeader(
      { kind: 'edge', edgeId: 'edge', targets: ['source'] },
      {},
    )).toBeUndefined();
    expect(buildGraphContextMenuHeader(
      { kind: 'edge', edgeId: 'edge', targets: ['', 'target'] },
      {},
    )).toBeUndefined();
    expect(buildGraphContextMenuHeader(
      { kind: 'node', targets: [] },
      {},
    )).toBeUndefined();
  });

  it('omits the relationship line when edge type metadata is unavailable', () => {
    const selection: GraphContextSelection = {
      kind: 'edge',
      edgeId: 'edge',
      targets: ['source', 'target'],
    };
    expect(buildGraphContextMenuHeader(selection, {})).toEqual({
      kind: 'edge',
      source: { label: 'source' },
      target: { label: 'target' },
      relationship: undefined,
    });
    expect(buildGraphContextMenuHeader(selection, {
      edges: [{ id: 'edge' }],
    })).toEqual({
      kind: 'edge',
      source: { label: 'source' },
      target: { label: 'target' },
      relationship: undefined,
    });
    expect(buildGraphContextMenuHeader(selection, {
      edges: [{ id: 'edge', kind: ' ' }],
    })).toEqual({
      kind: 'edge',
      source: { label: 'source' },
      target: { label: 'target' },
      relationship: undefined,
    });
  });

  it('uses the workspace name for background context and falls back safely', () => {
    expect(buildGraphContextMenuHeader(
      { kind: 'background', targets: [] },
      { workspaceName: 'CodeGraphyV4' },
    )).toEqual({ kind: 'background', workspaceName: 'CodeGraphyV4' });
    expect(buildGraphContextMenuHeader(
      { kind: 'background', targets: [] },
      { workspaceName: '  ' },
    )).toEqual({ kind: 'background', workspaceName: 'Workspace' });
  });
});
