import { describe, expect, it, vi } from 'vitest';
import {
  getGraphViewVisitsStorageKey,
  incrementPersistedGraphViewVisitCount,
  readPersistedGraphViewVisitCount,
} from '../../../../../src/extension/graphView/files/visits/storage';

type WorkspaceStateGetMock = ReturnType<typeof vi.fn> & (<T>(key: string) => T | undefined);

function createWorkspaceState(visits?: Record<string, number>) {
  const get = vi.fn((key: string) => {
    if (key === 'codegraphy.fileVisits') {
      return visits;
    }

    return undefined;
  }) as WorkspaceStateGetMock;

  return {
    get,
    update: vi.fn(() => Promise.resolve()),
  };
}

describe('graphView/files/visits/storage', () => {
  it('returns the persisted visits storage key', () => {
    expect(getGraphViewVisitsStorageKey()).toBe('codegraphy.fileVisits');
  });

  it('returns zero when no persisted visit count exists', () => {
    const workspaceState = createWorkspaceState();

    expect(readPersistedGraphViewVisitCount(workspaceState, 'src/app.ts')).toBe(0);
    expect(workspaceState.get).toHaveBeenCalledWith('codegraphy.fileVisits');
  });

  it('returns the stored visit count for a file', () => {
    expect(
      readPersistedGraphViewVisitCount(
        createWorkspaceState({ 'src/app.ts': 4 }),
        'src/app.ts',
      ),
    ).toBe(4);
  });

  it('increments persisted visit counts and returns the matching webview update', async () => {
    const workspaceState = createWorkspaceState({ 'src/app.ts': 2 });

    const message = await incrementPersistedGraphViewVisitCount(workspaceState, 'src/app.ts');

    expect(workspaceState.get).toHaveBeenCalledWith('codegraphy.fileVisits');
    expect(workspaceState.update).toHaveBeenCalledWith('codegraphy.fileVisits', {
      'src/app.ts': 3,
    });
    expect(message).toEqual({
      type: 'NODE_ACCESS_COUNT_UPDATED',
      payload: { nodeId: 'src/app.ts', accessCount: 3 },
    });
  });

  it('starts visit counts from one when no persisted state exists', async () => {
    const workspaceState = createWorkspaceState();

    const message = await incrementPersistedGraphViewVisitCount(workspaceState, 'src/app.ts');

    expect(workspaceState.get).toHaveBeenCalledWith('codegraphy.fileVisits');
    expect(workspaceState.update).toHaveBeenCalledWith('codegraphy.fileVisits', {
      'src/app.ts': 1,
    });
    expect(message).toEqual({
      type: 'NODE_ACCESS_COUNT_UPDATED',
      payload: { nodeId: 'src/app.ts', accessCount: 1 },
    });
  });
});
