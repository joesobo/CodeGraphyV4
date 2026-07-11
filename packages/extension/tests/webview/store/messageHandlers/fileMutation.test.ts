import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import {
  handleFileMutationFailed,
  handleFileMutationStarted,
} from '../../../../src/webview/store/messageHandlers/fileMutation';
import { createInlineRenameSession } from '../../../../src/webview/components/graph/inlineEdit/model';
import { createState } from './graph/fixture';

const graphData: IGraphData = {
  nodes: [{ id: 'src/a.ts', label: 'a.ts', color: '#fff' }],
  edges: [],
};

describe('file mutation messages', () => {
  it('tracks an optimistic mutation without replacing authoritative graph data', () => {
    const state = createState({ graphData });
    const update = handleFileMutationStarted({
      type: 'FILE_MUTATION_STARTED',
      payload: {
        mutationId: 'mutation-1',
        mutation: { kind: 'rename', oldPath: 'src/a.ts', newPath: 'src/b.ts' },
      },
    }, { getState: () => state, postMessage: () => undefined });

    expect(update.graphData).toBeUndefined();
    expect(update.pendingFileMutations?.['mutation-1']).toEqual({
      kind: 'rename',
      oldPath: 'src/a.ts',
      newPath: 'src/b.ts',
    });
  });

  it('removes the pending projection when the host reports failure', () => {
    const state = createState({
      graphData,
      pendingFileMutations: {
        'mutation-1': { kind: 'rename', oldPath: 'src/a.ts', newPath: 'src/b.ts' },
      },
    });
    const update = handleFileMutationFailed({
      type: 'FILE_MUTATION_FAILED',
      payload: { mutationId: 'mutation-1', message: 'rename failed' },
    }, { getState: () => state, postMessage: () => undefined });

    expect(update.graphData).toBeUndefined();
    expect(update.pendingFileMutations).toEqual({});
    expect(update.fileMutationError).toBe('rename failed');
  });

  it('restores a pending inline editor with the mutation error', () => {
    const state = createState({
      graphData,
      inlineEdit: { ...createInlineRenameSession('src/a.ts'), pending: true },
    });
    const update = handleFileMutationFailed({
      type: 'FILE_MUTATION_FAILED',
      payload: { mutationId: 'missing', message: 'permission denied' },
    }, { getState: () => state, postMessage: () => undefined });

    expect(update.inlineEdit).toMatchObject({
      value: 'a.ts',
      pending: false,
      error: 'permission denied',
    });
    expect(update.fileMutationError).toBeNull();
  });
});
