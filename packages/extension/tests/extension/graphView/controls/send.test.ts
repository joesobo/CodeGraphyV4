import { describe, expect, it, vi } from 'vitest';
import type { IGraphControlsSnapshot } from '../../../../src/shared/graphControls/contracts';
import {
  buildGraphControlsUpdatedMessage,
  sendGraphControlsUpdated,
} from '../../../../src/extension/graphView/controls/send';

const STRUCTURAL_NODE_TYPE_IDS = ['file', 'folder', 'package'];

describe('extension/graphView/controls/send', () => {
  it('ignores invalid registry node and edge definitions when building the snapshot message', () => {
    const sendMessage = vi.fn();

    sendGraphControlsUpdated(
      {
        nodes: [{ id: 'src/app.ts', label: 'App', color: '#111111', nodeType: 'file' }],
        edges: [
          { id: 'src/app.ts->src/lib.ts#import', from: 'src/app.ts', to: 'src/lib.ts', kind: 'import', sources: [] },
          { id: 'src/app.ts->src/lib.ts#plugin:route', from: 'src/app.ts', to: 'src/lib.ts', kind: 'plugin:route', sources: [] },
        ],
      },
      {
        registry: {
          listNodeTypes: () => [
            null,
            { id: 'route', label: 'Route', defaultColor: '#22C55E', defaultVisible: true },
            { id: 'bad-node', label: 'Bad Node', defaultColor: '#22C55E', defaultVisible: 'yes' },
          ],
          listEdgeTypes: () => [
            undefined,
            { id: 'plugin:route', label: 'Route', defaultColor: '#10B981', defaultVisible: true },
            { id: 'bad-edge', label: 'Bad Edge', defaultColor: '#10B981', defaultVisible: 'yes' },
          ],
          listGraphScopeCapabilities: () => ({
            nodeTypes: ['route'],
            edgeTypes: ['plugin:route'],
          }),
        },
      },
      sendMessage,
      { get: <T>(_key: string, defaultValue: T): T => defaultValue },
    );

    expect(sendMessage).toHaveBeenCalledWith(expect.objectContaining({
      type: 'GRAPH_CONTROLS_UPDATED',
      payload: expect.objectContaining({
        nodeTypes: expect.arrayContaining([
          expect.objectContaining({ id: 'route' }),
        ]),
        edgeTypes: expect.arrayContaining([
          expect.objectContaining({ id: 'plugin:route' }),
        ]),
      }),
    }));

    const payload = sendMessage.mock.calls[0][0].payload;
    expect(payload).toBeDefined();
    expect(payload.nodeTypes.some((nodeType: { id: string }) => nodeType.id === 'bad-node')).toBe(false);
    expect(payload.edgeTypes.some((edgeType: { id: string }) => edgeType.id === 'bad-edge')).toBe(false);
  });

  it('treats missing registry methods and non-array results as no plugin definitions', () => {
    const sendMessage = vi.fn();

    sendGraphControlsUpdated(
      {
        nodes: [{ id: 'src/app.ts', label: 'App', color: '#111111', nodeType: 'file' }],
        edges: [{ id: 'src/app.ts->src/lib.ts#import', from: 'src/app.ts', to: 'src/lib.ts', kind: 'import', sources: [] }],
      },
      {
        registry: {
          listNodeTypes: 'not-a-function',
          listEdgeTypes: () => 'not-an-array',
        },
      },
      sendMessage,
      { get: <T>(_key: string, defaultValue: T): T => defaultValue },
    );

    const payload = sendMessage.mock.calls[0][0].payload;
    expect(payload).toBeDefined();
    expect(payload.nodeTypes.map((nodeType: { id: string }) => nodeType.id)).toEqual(STRUCTURAL_NODE_TYPE_IDS);
    expect(payload.edgeTypes.some((edgeType: { id: string }) => edgeType.id === 'plugin:route')).toBe(false);
  });

  it('includes capability-declared graph scope types even before the graph has matching output', () => {
    const sendMessage = vi.fn();

    sendGraphControlsUpdated(
      {
        nodes: [{ id: 'src/app.ts', label: 'App', color: '#111111', nodeType: 'file' }],
        edges: [],
      },
      {
        registry: {
          listEdgeTypes: () => [
            { id: 'plugin:route', label: 'Route', defaultColor: '#10B981', defaultVisible: true },
          ],
          listNodeTypes: () => [
            { id: 'route', label: 'Route', defaultColor: '#22C55E', defaultVisible: true },
          ],
          listGraphScopeCapabilities: (filePaths: readonly string[]) => {
            expect(filePaths).toEqual(['src/app.ts']);
            return {
              nodeTypes: ['route'],
              edgeTypes: ['import', 'plugin:route'],
            };
          },
        },
      },
      sendMessage,
      { get: <T>(_key: string, defaultValue: T): T => defaultValue },
    );

    const payload = sendMessage.mock.calls[0][0].payload;
    expect(payload.nodeTypes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'route' }),
    ]));
    expect(payload.edgeTypes).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'import' }),
      expect.objectContaining({ id: 'plugin:route' }),
    ]));
  });

  it('does not expose unsupported core edge rows from graph data when capabilities are declared', () => {
    const sendMessage = vi.fn();

    sendGraphControlsUpdated(
      {
        nodes: [
          { id: 'src/app.ts', label: 'App', color: '#111111', nodeType: 'file' },
          { id: 'src/lib.ts', label: 'Lib', color: '#222222', nodeType: 'file' },
        ],
        edges: [
          { id: 'src/app.ts->src/lib.ts#import', from: 'src/app.ts', to: 'src/lib.ts', kind: 'import', sources: [] },
          { id: 'src/app.ts->src/lib.ts#reference', from: 'src/app.ts', to: 'src/lib.ts', kind: 'reference', sources: [] },
        ],
      },
      {
        registry: {
          listEdgeTypes: () => [],
          listGraphScopeCapabilities: () => ({
            nodeTypes: [],
            edgeTypes: ['import', 'type-import', 'call', 'inherit', 'contains'],
          }),
        },
      },
      sendMessage,
      { get: <T>(_key: string, defaultValue: T): T => defaultValue },
    );

    const payload = sendMessage.mock.calls[0][0].payload as IGraphControlsSnapshot;
    expect(payload.edgeTypes.map(edgeType => edgeType.id)).toEqual([
      'import',
      'call',
      'type-import',
      'inherit',
      'nests',
      'contains',
    ]);
  });

  it('passes disabled plugins through graph control definition and capability reads', () => {
    const sendMessage = vi.fn();
    const disabledPlugins = new Set(['codegraphy.godot']);
    const registry = {
      listNodeTypes: vi.fn((_disabledPlugins?: ReadonlySet<string>) => [
        { id: 'godot-scene', label: 'Godot Scene', defaultColor: '#478CBF', defaultVisible: true },
      ]),
      listEdgeTypes: vi.fn((_disabledPlugins?: ReadonlySet<string>) => [
        { id: 'load', label: 'Loads', defaultColor: '#478CBF', defaultVisible: true },
      ]),
      listGraphScopeCapabilities: vi.fn((_filePaths: readonly string[], _disabledPlugins?: ReadonlySet<string>) => ({
        nodeTypes: ['godot-scene'],
        edgeTypes: ['load'],
      })),
    };

    sendGraphControlsUpdated(
      {
        nodes: [{ id: 'game/player.gd', label: 'Player', color: '#111111', nodeType: 'file' }],
        edges: [],
      },
      { registry },
      sendMessage,
      { get: <T>(_key: string, defaultValue: T): T => defaultValue },
      disabledPlugins,
    );

    expect(registry.listNodeTypes).toHaveBeenCalledWith(disabledPlugins);
    expect(registry.listEdgeTypes).toHaveBeenCalledWith(disabledPlugins);
    expect(registry.listGraphScopeCapabilities).toHaveBeenCalledWith(['game/player.gd'], disabledPlugins);
  });

  it('does not infer edge type toggles from disabled plugin edges in raw graph data', () => {
    const sendMessage = vi.fn();

    sendGraphControlsUpdated(
      {
        nodes: [
          { id: 'game/player.gd', label: 'Player', color: '#111111', nodeType: 'file' },
          { id: 'game/enemy.gd', label: 'Enemy', color: '#222222', nodeType: 'file' },
        ],
        edges: [
          {
            id: 'game/player.gd->game/enemy.gd#load',
            from: 'game/player.gd',
            to: 'game/enemy.gd',
            kind: 'load',
            sources: [{ id: 'godot-load', label: 'Godot Load', pluginId: 'codegraphy.godot', sourceId: 'godot-load' }],
          },
        ],
      },
      {
        registry: {
          listEdgeTypes: () => [],
          listGraphScopeCapabilities: () => ({ nodeTypes: [], edgeTypes: [] }),
        },
      },
      sendMessage,
      { get: <T>(_key: string, defaultValue: T): T => defaultValue },
      new Set(['codegraphy.godot']),
    );

    const payload = sendMessage.mock.calls[0][0].payload as IGraphControlsSnapshot;
    expect(payload.edgeTypes.some(edgeType => edgeType.id === 'load')).toBe(false);
  });

  it('uses only core definitions when the analyzer is absent', () => {
    const sendMessage = vi.fn();

    expect(() =>
      sendGraphControlsUpdated(
        {
          nodes: [{ id: 'src/app.ts', label: 'App', color: '#111111', nodeType: 'file' }],
          edges: [{ id: 'src/app.ts->src/lib.ts#import', from: 'src/app.ts', to: 'src/lib.ts', kind: 'import', sources: [] }],
        },
        undefined,
        sendMessage,
        { get: <T>(_key: string, defaultValue: T): T => defaultValue },
      ),
    ).not.toThrow();

    expect(sendMessage).toHaveBeenCalledOnce();
    expect(sendMessage.mock.calls[0][0].type).toBe('GRAPH_CONTROLS_UPDATED');

    const payload = sendMessage.mock.calls[0][0].payload;
    expect(payload).toBeDefined();
    expect(payload.nodeTypes.map((nodeType: { id: string }) => nodeType.id)).toEqual(STRUCTURAL_NODE_TYPE_IDS);
    expect(payload.edgeTypes.some((edgeType: { id: string }) => edgeType.id === 'plugin:route')).toBe(false);
  });

  it('keeps the snapshot payload intact when building the outbound message', () => {
    const snapshot: IGraphControlsSnapshot = {
      nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#A1A1AA', defaultVisible: true }],
      edgeTypes: [{ id: 'import', label: 'Import', defaultColor: '#60A5FA', defaultVisible: true }],
      nodeColors: { file: '#A1A1AA' },
      nodeVisibility: { file: true },
      edgeVisibility: { import: true },
    };

    expect(buildGraphControlsUpdatedMessage(snapshot)).toStrictEqual({
      type: 'GRAPH_CONTROLS_UPDATED',
      payload: snapshot,
    });
  });
});
