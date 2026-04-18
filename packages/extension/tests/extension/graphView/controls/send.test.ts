import { describe, expect, it, vi } from 'vitest';
import type { IGraphControlsSnapshot } from '../../../../src/shared/graphControls/contracts';
import {
  buildGraphControlsUpdatedMessage,
  sendGraphControlsUpdated,
} from '../../../../src/extension/graphView/controls/send';

describe('extension/graphView/controls/send', () => {
  it('ignores invalid registry node and edge definitions when building the snapshot message', () => {
    const sendMessage = vi.fn();

    sendGraphControlsUpdated(
      {
        nodes: [{ id: 'src/app.ts', label: 'App', color: '#111111', nodeType: 'file' }],
        edges: [{ id: 'src/app.ts->src/lib.ts#import', from: 'src/app.ts', to: 'src/lib.ts', kind: 'import', sources: [] }],
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
    expect(payload.nodeTypes.map((nodeType: { id: string }) => nodeType.id)).toEqual([
      'file',
      'folder',
      'package',
    ]);
    expect(payload.edgeTypes.some((edgeType: { id: string }) => edgeType.id === 'plugin:route')).toBe(false);
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
    expect(payload.nodeTypes.map((nodeType: { id: string }) => nodeType.id)).toEqual([
      'file',
      'folder',
      'package',
    ]);
    expect(payload.edgeTypes.some((edgeType: { id: string }) => edgeType.id === 'plugin:route')).toBe(false);
  });

  it('keeps the snapshot payload intact when building the outbound message', () => {
    const snapshot: IGraphControlsSnapshot = {
      nodeTypes: [{ id: 'file', label: 'File', defaultColor: '#A1A1AA', defaultVisible: true }],
      edgeTypes: [{ id: 'import', label: 'Import', defaultColor: '#60A5FA', defaultVisible: true }],
      nodeColors: { file: '#A1A1AA' },
      nodeVisibility: { file: true },
      edgeVisibility: { import: true },
      edgeColors: { import: '#60A5FA' },
    };

    expect(buildGraphControlsUpdatedMessage(snapshot)).toStrictEqual({
      type: 'GRAPH_CONTROLS_UPDATED',
      payload: snapshot,
    });
  });
});
