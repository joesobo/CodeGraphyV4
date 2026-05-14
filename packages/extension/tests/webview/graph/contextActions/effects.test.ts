import { describe, expect, it } from 'vitest';
import {
  getBuiltInContextActionEffects,
  getGraphContextActionEffects,
} from '../../../../src/webview/components/graph/contextActions/effects';
import { resolveGraphContextActionContext } from '../../../../src/webview/components/graph/contextActions/context';

function nodeContext(targets: string[]) {
  return resolveGraphContextActionContext({ kind: 'node', targets });
}

function positionedNodeContext(targets: string[]) {
  return resolveGraphContextActionContext(
    { kind: 'node', targets },
    {
      graphMode: '2d',
      nodePositions: new Map([
        ['src/app.ts', { x: 12, y: -24 }],
        ['src/utils.ts', { x: 72, y: 36 }],
      ]),
    },
  );
}

function positioned3DNodeContext(targets: string[], position: { x: number; y: number; z?: number }) {
  return resolveGraphContextActionContext(
    { kind: 'node', targets },
    {
      graphMode: '3d',
      nodePositions: new Map([
        ['src/app.ts', position],
      ]),
    },
  );
}

function backgroundContext() {
  return resolveGraphContextActionContext(
    { kind: 'background', targets: [], graphPosition: { x: 40, y: -20 } },
    { graphMode: '2d' },
  );
}

function sectionContext() {
  return resolveGraphContextActionContext(
    { kind: 'node', graphPosition: { x: 160, y: 120 }, targets: ['section-1'] },
    {
      graphLayout: {
        sections: {
          'section-1': {
            id: 'section-1',
            label: 'Section 1',
            color: '#60a5fa',
            x: 100,
            y: 50,
            width: 320,
            height: 240,
            collapsed: false,
            updatedAt: '2026-05-13T09:45:00.000Z',
          },
        },
        ownership: {},
      },
      graphMode: '2d',
    },
  );
}

function folderInsideSectionContext() {
  return resolveGraphContextActionContext(
    { kind: 'node', targets: ['src'] },
    {
      graphLayout: {
        sections: {
          'section-1': {
            id: 'section-1',
            label: 'Section 1',
            color: '#60a5fa',
            x: 100,
            y: 50,
            width: 320,
            height: 240,
            collapsed: false,
            updatedAt: '2026-05-13T09:45:00.000Z',
          },
        },
        ownership: {
          src: {
            itemId: 'src',
            itemKind: 'node',
            ownerSectionId: 'section-1',
            updatedAt: '2026-05-13T09:46:00.000Z',
          },
        },
      },
      graphMode: '2d',
    },
  );
}

function scaledBackgroundContext(graphViewportScale: number) {
  return resolveGraphContextActionContext(
    { kind: 'background', targets: [], graphPosition: { x: 40, y: -20 } },
    { graphMode: '2d', graphViewportScale },
  );
}

function edgeContext(targets: string[]) {
  return resolveGraphContextActionContext({ kind: 'edge', edgeId: targets.join('->'), targets });
}

describe('graph/contextActions/effects', () => {
  it('creates one open-file effect per selected path', () => {
    expect(getBuiltInContextActionEffects('open', nodeContext(['src/app.ts', 'src/utils.ts']))).toEqual([
      { kind: 'openFile', path: 'src/app.ts' },
      { kind: 'openFile', path: 'src/utils.ts' },
    ]);
  });

  it('uses the first selected path for reveal actions', () => {
    expect(getBuiltInContextActionEffects('reveal', nodeContext(['src/app.ts', 'src/utils.ts']))).toEqual([
      {
        kind: 'postMessage',
        message: { type: 'REVEAL_IN_EXPLORER', payload: { path: 'src/app.ts' } },
      },
    ]);
  });

  it('returns no effect when reveal has no selected path', () => {
    expect(getBuiltInContextActionEffects('reveal', nodeContext([]))).toEqual([]);
  });

  it('copies all relative paths joined by newlines', () => {
    expect(getBuiltInContextActionEffects('copyRelative', nodeContext(['a.ts', 'b.ts']))).toEqual([
      {
        kind: 'postMessage',
        message: { type: 'COPY_TO_CLIPBOARD', payload: { text: 'a.ts\nb.ts' } },
      },
    ]);
  });

  it('prefixes the first path for absolute path copies', () => {
    expect(getBuiltInContextActionEffects('copyAbsolute', nodeContext(['a.ts', 'b.ts']))).toEqual([
      {
        kind: 'postMessage',
        message: { type: 'COPY_TO_CLIPBOARD', payload: { text: 'absolute:a.ts' } },
      },
    ]);
  });

  it('returns no effect when absolute path copy has no selected path', () => {
    expect(getBuiltInContextActionEffects('copyAbsolute', nodeContext([]))).toEqual([]);
  });

  it('returns no effect when edge source copy has no selected path', () => {
    expect(getBuiltInContextActionEffects('copyEdgeSource', edgeContext([]))).toEqual([]);
  });

  it('opens edge source and target endpoints independently', () => {
    expect(getBuiltInContextActionEffects('openEdgeSource', edgeContext(['from.ts', 'to.ts']))).toEqual([
      { kind: 'openFile', path: 'from.ts' },
    ]);
    expect(getBuiltInContextActionEffects('openEdgeTarget', edgeContext(['from.ts', 'to.ts']))).toEqual([
      { kind: 'openFile', path: 'to.ts' },
    ]);
  });

  it('copies edge target only when a second path exists', () => {
    expect(getBuiltInContextActionEffects('copyEdgeTarget', edgeContext(['from.ts']))).toEqual([]);
    expect(getBuiltInContextActionEffects('copyEdgeTarget', edgeContext(['from.ts', 'to.ts']))).toEqual([
      {
        kind: 'postMessage',
        message: { type: 'COPY_TO_CLIPBOARD', payload: { text: 'to.ts' } },
      },
    ]);
  });

  it('creates a focus effect for the first selected path', () => {
    expect(getBuiltInContextActionEffects('focus', nodeContext(['src/app.ts']))).toEqual([
      { kind: 'focusNode', nodeId: 'src/app.ts' },
    ]);
  });

  it('creates a filter prompt effect for a single selected path', () => {
    expect(getBuiltInContextActionEffects('addToFilter', nodeContext(['README.md']))).toEqual([
      { kind: 'promptFilterPattern', patterns: ['README.md'] },
    ]);
  });

  it('creates a filter prompt effect for multi-select add-to-filter', () => {
    expect(getBuiltInContextActionEffects('addToFilter', nodeContext(['a.ts', 'b.ts']))).toEqual([
      { kind: 'promptFilterPattern', patterns: ['a.ts', 'b.ts'] },
    ]);
  });

  it('creates a legend prompt effect for a single selected path', () => {
    expect(getBuiltInContextActionEffects('addNodeLegend', nodeContext(['src/Helper.java']))).toEqual([
      { kind: 'promptLegendRule', color: '#808080', pattern: 'src/Helper.java', target: 'node' },
    ]);
  });

  it('returns no effect when focus has no selected path', () => {
    expect(getBuiltInContextActionEffects('focus', nodeContext([]))).toEqual([]);
  });

  it('pins and unpins selected nodes in the active graph mode', () => {
    expect(getBuiltInContextActionEffects('pinNode', positionedNodeContext(['src/app.ts', 'src/utils.ts']))).toEqual([
      {
        kind: 'postMessage',
        message: {
          type: 'UPDATE_GRAPH_LAYOUT_PIN',
          payload: {
            graphMode: '2d',
            nodeId: 'src/app.ts',
            position: { x: 12, y: -24 },
          },
        },
      },
      {
        kind: 'postMessage',
        message: {
          type: 'UPDATE_GRAPH_LAYOUT_PIN',
          payload: {
            graphMode: '2d',
            nodeId: 'src/utils.ts',
            position: { x: 72, y: 36 },
          },
        },
      },
    ]);

    expect(getBuiltInContextActionEffects('unpinNode', positionedNodeContext(['src/app.ts', 'src/utils.ts']))).toEqual([
      {
        kind: 'postMessage',
        message: {
          type: 'CLEAR_GRAPH_LAYOUT_PIN',
          payload: { graphMode: '2d', nodeId: 'src/app.ts' },
        },
      },
      {
        kind: 'postMessage',
        message: {
          type: 'CLEAR_GRAPH_LAYOUT_PIN',
          payload: { graphMode: '2d', nodeId: 'src/utils.ts' },
        },
      },
    ]);
  });

  it('does not pin a node when its graph-space position is missing', () => {
    expect(getBuiltInContextActionEffects('pinNode', nodeContext(['src/app.ts']))).toEqual([]);
  });

  it('pins 3D nodes only when a complete 3D position is available', () => {
    expect(getBuiltInContextActionEffects(
      'pinNode',
      positioned3DNodeContext(['src/app.ts'], { x: 12, y: -24, z: 36 }),
    )).toEqual([
      {
        kind: 'postMessage',
        message: {
          type: 'UPDATE_GRAPH_LAYOUT_PIN',
          payload: {
            graphMode: '3d',
            nodeId: 'src/app.ts',
            position: { x: 12, y: -24, z: 36 },
          },
        },
      },
    ]);

    expect(getBuiltInContextActionEffects(
      'pinNode',
      positioned3DNodeContext(['src/app.ts'], { x: 12, y: -24 }),
    )).toEqual([]);
  });

  it('creates a Graph Section around selected node positions', () => {
    expect(getBuiltInContextActionEffects('createGraphSection', positionedNodeContext(['src/app.ts', 'src/utils.ts']))).toEqual([
      {
        kind: 'postMessage',
        message: {
          type: 'CREATE_GRAPH_LAYOUT_SECTION',
          payload: {
            color: '#60a5fa',
            height: 188,
            memberNodeIds: ['src/app.ts', 'src/utils.ts'],
            width: 188,
            x: -52,
            y: -88,
          },
        },
      },
    ]);
  });

  it('creates a Graph Section centered on the background context position', () => {
    expect(getBuiltInContextActionEffects('createGraphSection', backgroundContext())).toEqual([
      {
        kind: 'postMessage',
        message: {
          type: 'CREATE_GRAPH_LAYOUT_SECTION',
          payload: {
            color: '#60a5fa',
            height: 180,
            memberNodeIds: [],
            width: 280,
            x: -100,
            y: -110,
          },
        },
      },
    ]);
  });

  it('creates a nested Graph Section when the section context menu creates one', () => {
    expect(getBuiltInContextActionEffects('createGraphSection', sectionContext())).toEqual([
      {
        kind: 'postMessage',
        message: {
          type: 'CREATE_GRAPH_LAYOUT_SECTION',
          payload: {
            color: '#60a5fa',
            height: 180,
            memberNodeIds: [],
            ownerSectionId: 'section-1',
            width: 280,
            x: -80,
            y: -20,
          },
        },
      },
    ]);
  });

  it('creates files and folders in a Graph Section context without using the section id as a filesystem directory', () => {
    expect(getBuiltInContextActionEffects('createFile', sectionContext())).toEqual([
      {
        kind: 'postMessage',
        message: {
          type: 'CREATE_FILE',
          payload: {
            directory: '.',
            ownerSectionId: 'section-1',
          },
        },
      },
    ]);
    expect(getBuiltInContextActionEffects('createFolder', sectionContext())).toEqual([
      {
        kind: 'postMessage',
        message: {
          type: 'CREATE_FOLDER',
          payload: {
            directory: '.',
            ownerSectionId: 'section-1',
          },
        },
      },
    ]);
  });

  it('creates files in a folder filesystem context while preserving the folder section owner', () => {
    expect(getBuiltInContextActionEffects('createFile', folderInsideSectionContext())).toEqual([
      {
        kind: 'postMessage',
        message: {
          type: 'CREATE_FILE',
          payload: {
            directory: 'src',
            ownerSectionId: 'section-1',
          },
        },
      },
    ]);
  });

  it('expands and collapses a Graph Section through context actions', () => {
    expect(getBuiltInContextActionEffects('expandGraphSection', nodeContext(['section-1']))).toEqual([
      {
        kind: 'postMessage',
        message: {
          type: 'UPDATE_GRAPH_LAYOUT_SECTION',
          payload: {
            sectionId: 'section-1',
            updates: { collapsed: false },
          },
        },
      },
    ]);
    expect(getBuiltInContextActionEffects('collapseGraphSection', nodeContext(['section-1']))).toEqual([
      {
        kind: 'postMessage',
        message: {
          type: 'UPDATE_GRAPH_LAYOUT_SECTION',
          payload: {
            sectionId: 'section-1',
            updates: { collapsed: true },
          },
        },
      },
    ]);
  });

  it('deletes a Graph Section through context actions', () => {
    expect(getBuiltInContextActionEffects('deleteGraphSection', nodeContext(['section-1']))).toEqual([
      {
        kind: 'postMessage',
        message: {
          type: 'DELETE_GRAPH_LAYOUT_SECTION',
          payload: { sectionId: 'section-1' },
        },
      },
    ]);
  });

  it('keeps a default background Graph Section at stable graph-space size when the graph is zoomed out', () => {
    expect(getBuiltInContextActionEffects('createGraphSection', scaledBackgroundContext(0.2))).toEqual([
      {
        kind: 'postMessage',
        message: {
          type: 'CREATE_GRAPH_LAYOUT_SECTION',
          payload: {
            color: '#60a5fa',
            height: 180,
            memberNodeIds: [],
            width: 280,
            x: -100,
            y: -110,
          },
        },
      },
    ]);
  });

  it('returns no effect when rename has no selected path', () => {
    expect(getBuiltInContextActionEffects('rename', nodeContext([]))).toEqual([]);
  });

  it('creates a fit-view effect', () => {
    expect(getBuiltInContextActionEffects('fitView', nodeContext(['src/app.ts']))).toEqual([
      { kind: 'fitView' },
    ]);
  });

  it('creates plugin action messages for plugin menu items', () => {
    const effects = getGraphContextActionEffects({
      kind: 'plugin',
      pluginId: 'plugin.test',
      index: 2,
      targetId: 'src/app.ts',
      targetType: 'node',
    }, nodeContext(['src/app.ts']));

    expect(effects).toHaveLength(1);
    expect(effects).toEqual([
      {
        kind: 'postMessage',
        message: {
          type: 'PLUGIN_CONTEXT_MENU_ACTION',
          payload: {
            pluginId: 'plugin.test',
            index: 2,
            targetId: 'src/app.ts',
            targetType: 'node',
          },
        },
      },
    ]);
  });
});
