import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as vscode from 'vscode';
import { AddToExcludeAction } from '../../../src/extension/actions/addToExclude';

vi.mock('vscode', () => ({
  workspace: {
    getConfiguration: vi.fn(),
  },
  ConfigurationTarget: {
    Global: 1,
    Workspace: 2,
    WorkspaceFolder: 3,
  },
}));

function getLastFilterPatternUpdate(
  calls: Array<[string, unknown, unknown?]>,
): unknown {
  return [...calls]
    .reverse()
    .find(([key]) => key === 'filterPatterns')?.[1];
}

describe('AddToExcludeAction', () => {
  let mockConfigUpdate: ReturnType<typeof vi.fn>;
  let currentFilterPatterns: string[];
  let mockRefreshGraph: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    currentFilterPatterns = [];
    mockConfigUpdate = vi.fn().mockResolvedValue(undefined);

    vi.mocked(vscode.workspace.getConfiguration).mockReturnValue({
      get: vi.fn((key: string, defaultValue: unknown) => {
        if (key === 'filterPatterns') return [...currentFilterPatterns];
        return defaultValue;
      }),
      update: mockConfigUpdate,
    } as unknown as vscode.WorkspaceConfiguration);

    mockRefreshGraph = vi.fn().mockResolvedValue(undefined);
  });

  describe('description', () => {
    it('describes a single file exclusion using the filename', () => {
      const action = new AddToExcludeAction(['src/utils/helper.ts'], mockRefreshGraph);
      expect(action.description).toBe('Exclude: helper.ts');
    });

    it('describes multiple file exclusions with a count', () => {
      const action = new AddToExcludeAction(['a.ts', 'b.ts', 'c.ts'], mockRefreshGraph);
      expect(action.description).toBe('Exclude 3 files');
    });

    it('describes two file exclusions with a count', () => {
      const action = new AddToExcludeAction(['a.ts', 'b.ts'], mockRefreshGraph);
      expect(action.description).toBe('Exclude 2 files');
    });
  });

  describe('execute', () => {
    it('adds glob patterns to the filter pattern list', async () => {
      const action = new AddToExcludeAction(['src/app.ts'], mockRefreshGraph);

      await action.execute();

      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'filterPatterns',
        ['**/src/app.ts'],
        undefined,
      );
    });

    it('preserves existing filter patterns', async () => {
      currentFilterPatterns = ['**/node_modules/**'];
      const action = new AddToExcludeAction(['dist/bundle.js'], mockRefreshGraph);

      await action.execute();

      expect(mockConfigUpdate).toHaveBeenCalledWith(
        'filterPatterns',
        expect.arrayContaining(['**/node_modules/**', '**/dist/bundle.js']),
        undefined,
      );
    });

    it('does not add duplicate patterns', async () => {
      currentFilterPatterns = ['**/src/app.ts'];
      const action = new AddToExcludeAction(['src/app.ts'], mockRefreshGraph);

      await action.execute();

      const updateArg = mockConfigUpdate.mock.calls.find(
        ([key]) => key === 'filterPatterns',
      )?.[1] as string[];
      const matchCount = updateArg.filter((pat) => pat === '**/src/app.ts').length;
      expect(matchCount).toBe(1);
    });

    it('adds multiple paths in a single execute', async () => {
      const action = new AddToExcludeAction(['a.ts', 'b.ts'], mockRefreshGraph);

      await action.execute();

      const updateArg = mockConfigUpdate.mock.calls.find(
        ([key]) => key === 'filterPatterns',
      )?.[1] as string[];
      expect(updateArg).toContain('**/a.ts');
      expect(updateArg).toContain('**/b.ts');
    });

    it('calls refreshGraph after updating config', async () => {
      const action = new AddToExcludeAction(['app.ts'], mockRefreshGraph);

      await action.execute();

      expect(mockRefreshGraph).toHaveBeenCalledOnce();
    });

    it('captures the before state only on first execution', async () => {
      const action = new AddToExcludeAction(['app.ts'], mockRefreshGraph);

      await action.execute();

      // Simulate external modification of the filter pattern list
      currentFilterPatterns = ['**/app.ts', '**/extra.ts'];

      // Re-execute (redo) should apply the same after state, not recalculate
      await action.execute();

      // The second call should use the same stateAfter from the first execution
      const filterPatternUpdates = mockConfigUpdate.mock.calls
        .filter(([key]) => key === 'filterPatterns')
        .map(([, value]) => value);
      const firstCallArg = filterPatternUpdates[0];
      const secondCallArg = filterPatternUpdates[1];
      expect(secondCallArg).toEqual(firstCallArg);
    });
  });

  describe('undo', () => {
    it('restores the filter pattern list to its state before execute', async () => {
      currentFilterPatterns = ['**/existing.ts'];
      const action = new AddToExcludeAction(['new.ts'], mockRefreshGraph);

      await action.execute();
      await action.undo();

      // The undo should restore to ['**/existing.ts']
      const undoCallArg = getLastFilterPatternUpdate(
        mockConfigUpdate.mock.calls as Array<[string, unknown, unknown?]>,
      );
      expect(undoCallArg).toEqual(['**/existing.ts']);
    });

    it('restores to empty array when the list was originally empty', async () => {
      const action = new AddToExcludeAction(['app.ts'], mockRefreshGraph);

      await action.execute();
      await action.undo();

      const undoCallArg = getLastFilterPatternUpdate(
        mockConfigUpdate.mock.calls as Array<[string, unknown, unknown?]>,
      );
      expect(undoCallArg).toEqual([]);
    });

    it('calls refreshGraph after restoring', async () => {
      const action = new AddToExcludeAction(['app.ts'], mockRefreshGraph);

      await action.execute();
      vi.clearAllMocks();
      await action.undo();

      expect(mockRefreshGraph).toHaveBeenCalledOnce();
    });
  });

  describe('execute after undo (redo)', () => {
    it('reapplies the same after state on redo', async () => {
      const action = new AddToExcludeAction(['app.ts'], mockRefreshGraph);

      await action.execute();
      const firstAfter = mockConfigUpdate.mock.calls.find(
        ([key]) => key === 'filterPatterns',
      )?.[1];

      await action.undo();
      await action.execute();

      const redoAfter = mockConfigUpdate.mock.calls
        .filter(([key]) => key === 'filterPatterns')
        .at(-1)?.[1];
      expect(redoAfter).toEqual(firstAfter);
    });
  });
});
