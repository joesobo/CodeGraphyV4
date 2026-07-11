import { describe, expect, it, vi } from 'vitest';
import type { GraphState } from '../../../../src/webview/store/state';
import {
  applyOptimisticFileMutationIndicatorUpdate,
  attachOptimisticFileMutationIndicatorTarget,
  notifyOptimisticFileMutationIndicatorTarget,
} from '../../../../src/webview/store/optimistic/indicators';

function indicatorState(
  pendingFileMutations: GraphState['pendingFileMutations'],
): Pick<
  GraphState,
  'graphData' | 'nativeNodeDecorations' | 'nodeDecorations' | 'pendingFileMutations'
> {
  return {
    graphData: {
      nodes: [{
        id: 'src/old.ts',
        label: 'old.ts',
        color: '#93C5FD',
        nodeType: 'file',
      }],
      edges: [],
    },
    nativeNodeDecorations: {},
    nodeDecorations: {},
    pendingFileMutations,
  };
}

describe('store/optimistic/indicators', () => {
  it('notifies the mounted target synchronously before store subscribers', () => {
    const target = vi.fn();
    const previous = indicatorState({});
    const current = indicatorState({
      mutation: {
        kind: 'rename',
        oldPath: 'src/old.ts',
        newPath: 'src/new.ts',
      },
    });
    const detach = attachOptimisticFileMutationIndicatorTarget(target);

    notifyOptimisticFileMutationIndicatorTarget(current, previous);
    detach();
    notifyOptimisticFileMutationIndicatorTarget(previous, current);

    expect(target).toHaveBeenCalledOnce();
    expect(target).toHaveBeenCalledWith(current, previous);
  });

  it('invalidates the mounted graph and publishes a stable rename commit', () => {
    const commit = {
      layoutChanged: false,
      operation: { scenario: 'rename' },
    } as never;
    const lifecycle = {
      prepareCommit: vi.fn(() => commit),
      publishCommit: vi.fn(),
    };
    const zoom = vi.fn(() => 1.25);
    const nodeDecorationsRef = { current: undefined };

    const applied = applyOptimisticFileMutationIndicatorUpdate({
      current: indicatorState({
        mutation: {
          kind: 'rename',
          oldPath: 'src/old.ts',
          newPath: 'src/new.ts',
        },
      }),
      graph: { zoom },
      graphCommitInput: {
        edgeCount: 0,
        layoutKey: 'uniform::stable',
        nodeCount: 1,
      },
      lifecycle,
      nodeDecorationsRef,
      previous: indicatorState({}),
    });

    expect(applied).toBe(true);
    expect(nodeDecorationsRef.current).toEqual({
      'src/old.ts': { label: { text: 'new.ts' } },
    });
    expect(zoom).toHaveBeenNthCalledWith(1);
    expect(zoom).toHaveBeenNthCalledWith(2, 1.25, 0);
    expect(lifecycle.publishCommit).toHaveBeenCalledWith(commit);
  });

  it('restores base decorations without publishing when pending state clears', () => {
    const lifecycle = {
      prepareCommit: vi.fn(),
      publishCommit: vi.fn(),
    };
    const zoom = vi.fn(() => 1);
    const nodeDecorationsRef = { current: undefined };
    const previous = indicatorState({
      mutation: {
        kind: 'delete',
        paths: ['src/old.ts'],
      },
    });

    applyOptimisticFileMutationIndicatorUpdate({
      current: indicatorState({}),
      graph: { zoom },
      graphCommitInput: { edgeCount: 0, layoutKey: 'stable', nodeCount: 1 },
      lifecycle,
      nodeDecorationsRef,
      previous,
    });

    expect(nodeDecorationsRef.current).toEqual({});
    expect(zoom).toHaveBeenCalledTimes(2);
    expect(lifecycle.prepareCommit).not.toHaveBeenCalled();
    expect(lifecycle.publishCommit).not.toHaveBeenCalled();
  });

  it('does not acknowledge when the mounted graph cannot redraw', () => {
    const lifecycle = {
      prepareCommit: vi.fn(),
      publishCommit: vi.fn(),
    };

    const applied = applyOptimisticFileMutationIndicatorUpdate({
      current: indicatorState({
        mutation: {
          kind: 'create',
          node: {
            id: 'src/new.ts',
            label: 'new.ts',
            color: '#93C5FD',
            nodeType: 'file',
          },
        },
      }),
      graph: undefined,
      graphCommitInput: { edgeCount: 0, layoutKey: 'stable', nodeCount: 1 },
      lifecycle,
      nodeDecorationsRef: { current: undefined },
      previous: indicatorState({}),
    });

    expect(applied).toBe(false);
    expect(lifecycle.prepareCommit).not.toHaveBeenCalled();
    expect(lifecycle.publishCommit).not.toHaveBeenCalled();
  });
});
