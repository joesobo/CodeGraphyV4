import { describe, expect, it } from 'vitest';
import type { IGraphData } from '../../../../src/shared/graph/contracts';
import {
  handleFileMutationFailed,
  handleFileMutationStarted,
} from '../../../../src/webview/store/messageHandlers/fileMutation';
import { createState } from './graph/fixture';

const graphData: IGraphData = {
  nodes: [{ id: 'src/a.ts', label: 'a.ts', color: '#fff' }],
  edges: [],
};

describe('file mutation messages', () => {
  it('applies and tracks an optimistic mutation', () => {
    const state = createState({ graphData });
    const update = handleFileMutationStarted({
      type: 'FILE_MUTATION_STARTED',
      payload: {
        mutationId: 'mutation-1',
        mutation: { kind: 'rename', oldPath: 'src/a.ts', newPath: 'src/b.ts' },
      },
    }, { getState: () => state, postMessage: () => undefined });

    expect(update.graphData?.nodes[0]?.id).toBe('src/b.ts');
    expect(update.pendingFileMutations?.['mutation-1']).toBe(graphData);
  });

  it('rolls back the exact snapshot when the host reports failure', () => {
    const state = createState({
      graphData: { nodes: [], edges: [] },
      pendingFileMutations: { 'mutation-1': graphData },
    });
    const update = handleFileMutationFailed({
      type: 'FILE_MUTATION_FAILED',
      payload: { mutationId: 'mutation-1', message: 'rename failed' },
    }, { getState: () => state, postMessage: () => undefined });

    expect(update.graphData).toBe(graphData);
    expect(update.pendingFileMutations).toEqual({});
    expect(update.fileMutationError).toBe('rename failed');
  });
});
